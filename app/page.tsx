import GameRoot from "./game-root";

export default function Page() {
  return (
    <main className="fixed inset-0">
      <GameRoot />
      <div className="pointer-events-none absolute left-4 top-4 select-none text-xs uppercase tracking-widest text-white/40">
        racing-game-3d · bootstrap
      </div>
    </main>
  );
}
