# racing-game-3d — архитектура

## Стек

- **Next.js 15 (App Router)** + TypeScript + Tailwind.
- **3D:** `three`, `@react-three/fiber` (R3F), `@react-three/drei` (хелперы).
- **Физика:** `@react-three/rapier` (WASM-обёртка Rapier3D).
- **State:** `zustand` для game-state machine и live-данных гонки (lap/position/raceTime).
- **UI:** shadcn/ui для меню/HUD, никаких тяжёлых либ.

R3F-сцена монтируется через `next/dynamic` с `ssr: false` — Rapier и WebGL нельзя гидрировать на сервере. SSR-skeleton — простой `<div>` с poster-кадром.

## Структура директорий

```
src/
  app/
    page.tsx                # лендинг + кнопка "Играть"
    play/page.tsx           # запускает <GameCanvas>
    layout.tsx              # html/lang, meta, OG
  components/
    GameCanvas.tsx          # <Canvas> + <Physics> + <Suspense>
    Car.tsx                 # игрок: rigid body + модель + камера-чейз
    Bot.tsx                 # AI-машина: rigid body + botUpdate → controls
    Track.tsx               # меш дороги из TrackConfig.segments
    HUD.tsx                 # скорость, лап, позиция (overlay через <Html>)
    Menu.tsx                # выбор машины + старт
  content/
    cars.ts                 # CarConfig[]   (3 пресета)
    bots.ts                 # BotConfig[]   (3 уровня сложности)
    track.ts                # TrackConfig   (овал, 12 waypoints, 3 круга)
  lib/
    physics.ts              # типы + сигнатуры createCarBody / applyEngineForce / applySteering / checkLap
    input.ts                # useKeyboardControls (стрелки + WASD + space)
    ai.ts                   # botUpdate(bot, track, dt) → CarControls (look-ahead)
    store.ts                # zustand: GameState + LapInfo[] (создаёт Костя)
  types/
    game.ts                 # CarConfig, BotConfig, TrackConfig, GameState, LapInfo, Vec3
docs/
  architecture.md           # этот файл
```

## Компонентное дерево

```
<RootLayout>
  <Menu>                          ← когда state === 'menu'
  <GameCanvas>                    ← когда state !== 'menu'
    <Physics gravity={[0,-9.81,0]}>
      <Track config={track} />
      <Car   car={selectedCar} controls={useKeyboardControls()} />
      <Bot   bot={bots[0]} track={track} />
      <Bot   bot={bots[1]} track={track} />
      <Bot   bot={bots[2]} track={track} />
    </Physics>
    <Camera follow={playerRef} />
    <Html><HUD/></Html>
  </GameCanvas>
```

## Поток данных

```
                       ┌──────────────────────────┐
                       │  zustand store (lib/store)│
                       │  - state: GameState       │
                       │  - laps:  LapInfo[]       │
                       │  - raceTime: number       │
                       └────────────┬─────────────┘
                                    │ read
                ┌───────────────────┴───────────────────┐
                │                                       │
       ┌────────▼────────┐                    ┌─────────▼────────┐
       │ <HUD>            │                    │ <Menu>            │
       │ subscribes to    │                    │ setSelectedCar()  │
       │ laps + raceTime  │                    │ start() → racing  │
       └──────────────────┘                    └───────────────────┘

  useFrame loop (per car, ~60Hz):
     useKeyboardControls() / botUpdate()  →  CarControls
                                              │
                                              ▼
                                      applyEngineForce()
                                      applySteering()
                                              │
                                              ▼
                                       Rapier solves step
                                              │
                                              ▼
                                       checkLap() → store.set(laps)
```

- Per-frame горячий путь **не идёт через React state** — controls лежат в `useRef`, физика дёргается напрямую через rigid-body handle.
- В store пишем только дискретные события (lap crossed, finished) — это минимизирует re-render'ы HUD.

## Контракты модулей

### `types/game.ts`
Единственный источник правды по сущностям. Все остальные модули импортируют отсюда — никаких параллельных определений.

### `content/*.ts`
Только данные (моки). Никакой логики. Импортирующая сторона — `<Menu>`, `<GameCanvas>`, тесты.

### `lib/physics.ts`
**Только сигнатуры**, реализация — Костя в `components/Car.tsx`/`Bot.tsx` или отдельном `lib/physics.impl.ts`. Сигнатуры зафиксированы:
- `createCarBody({car, position, yaw}) → RigidBodyHandle`
- `applyEngineForce({body, car, controls, kinematics, dt})` — тяга + торможение
- `applySteering({body, car, controls, kinematics, dt})` — поворот через yaw-torque
- `checkLap({prevKinematics, kinematics, startLine, currentLap, raceTime, track}) → CheckLapResult` — pure-функция, тестируется в Vitest

`CarControls` (`throttle`, `brake`, `steer`, `handbrake`) — общий контракт между `input.ts` (игрок) и `ai.ts` (бот).

### `lib/input.ts`
Hook `useKeyboardControls()` возвращает **MutableRefObject\<CarControls\>** — читай через `.current` в useFrame. Стрелки + WASD + Space (handbrake). Опция `enabled` отключает ввод в `menu`/`countdown`/`finished`.

### `lib/ai.ts`
`botUpdate({bot, track, kinematics, state, dt}) → {controls, state}` — pure. Алгоритм:
1. Найти ближайший waypoint и продвинуть индекс если бот рядом (радиус 6м).
2. Целевая точка = waypoint через `lookAheadM` (преобразуется в шаги).
3. Угол между `forward` и желаемым направлением → `steer` (пропорционально, clamp ±1).
4. `throttle = aggression`; при резком повороте на скорости — лифт + brake 0.5.
5. Stuck-detection: если не движется >1.5с — brake до отлипания.

## Бюджет

- **LCP** < 2.5с на 4G mobile (poster + lazy R3F).
- **Bundle (first paint)** < 200KB gz; R3F + Rapier подгружаются через `next/dynamic`.
- **FPS target** 60 на desktop, 30 на mid mobile.
- **Колайдеры** — box на машину, trimesh на дорогу только если нужны бортики; для MVP — плоскость + waypoint-логика.

## Расширения (не для MVP, чтобы зафиксировать намерение)

- **Track curves:** заменить линейные сегменты на Catmull-Rom — контракт `TrackConfig.waypoints + width` не меняется.
- **Figure-8:** перерисовать waypoints + добавить мост в `Track.tsx`; типы не трогаем.
- **Per-bot racing line:** заполнить `BotConfig.waypoints` для `champion`.
- **Persistent best time:** localStorage-обвязка вокруг `LapInfo.bestLapTime`.
