# racing-game-3d

3D-гонка с ботами на Next.js 15 + react-three-fiber + Rapier. Деплой — Vercel.

## Стек

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS v4**
- **3D / физика:** `three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/rapier`, `@react-three/postprocessing`
- **pnpm**, **Node 20+**

## Как запустить

```bash
git clone https://github.com/moukpu/racing-game-3d.git
cd racing-game-3d
pnpm install
pnpm dev
```

Открой [http://localhost:3000](http://localhost:3000).

## Скрипты

| Скрипт            | Что делает                                          |
| ----------------- | --------------------------------------------------- |
| `pnpm dev`        | Локальный dev-сервер (`next dev`)                   |
| `pnpm build`      | Продовый билд (`next build`)                        |
| `pnpm start`      | Запуск продового билда                              |
| `pnpm lint`       | ESLint                                              |
| `pnpm typecheck`  | `tsc --noEmit`                                      |

## Переменные окружения

Скопируй `.env.example` в `.env.local` и заполни. **Не коммить** реальные значения —
секреты живут только в Vercel env / окружении ранера.

## CI / Deploy

- **CI:** GitHub Actions — `.github/workflows/ci.yml` гоняет `pnpm install`
  и `pnpm build` на каждый push / PR.
- **Hosting:** Vercel — preview на каждый PR, prod на `main`.

## Структура

```
app/
  layout.tsx       # корневой layout, импортит globals.css
  page.tsx         # серверная страница, монтирует GameRoot
  game-root.tsx    # клиентский wrapper c next/dynamic ssr:false
  scene.tsx        # <Canvas> с Rapier-физикой и demo-кубом
  globals.css      # Tailwind v4 + базовый стайлинг
next.config.ts     # transpilePackages для three / r3f
postcss.config.mjs # Tailwind v4 PostCSS plugin
```
