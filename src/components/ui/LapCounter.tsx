import * as React from "react";

export interface LapCounterProps {
  /** 1-indexed current lap (e.g. 2 means the driver is on lap 2 of N). */
  currentLap: number;
  /** Total number of laps in the race. */
  totalLaps: number;
  /** 1-indexed position in the field (e.g. 3 for "3rd"). */
  position: number;
  /** Optional total racers, used to render "3 / 8". */
  totalRacers?: number;
  /** Optional className for layout overrides from the HUD container. */
  className?: string;
}

const SUFFIX = ["th", "st", "nd", "rd"];

function ordinal(n: number): string {
  const v = Math.abs(n) % 100;
  return n + (SUFFIX[(v - 20) % 10] ?? SUFFIX[v] ?? "th");
}

/**
 * LapCounter — HUD card showing lap progress and field position.
 *
 *   ┌────────────────────────┐
 *   │ LAP            POSITION │
 *   │ 02 / 05         3rd     │
 *   │ ──────────              │  ← lap progress
 *   └────────────────────────┘
 */
export function LapCounter({
  currentLap,
  totalLaps,
  position,
  totalRacers,
  className,
}: LapCounterProps) {
  const safeTotal = Math.max(1, totalLaps);
  const safeCurrent = Math.min(safeTotal, Math.max(1, currentLap));
  const progress = ((safeCurrent - 1) / safeTotal) * 100;
  const lap = String(safeCurrent).padStart(2, "0");
  const total = String(safeTotal).padStart(2, "0");

  return (
    <div
      role="status"
      aria-label={`Lap ${safeCurrent} of ${safeTotal}, position ${ordinal(position)}`}
      className={["hud-card", "lap-counter", className].filter(Boolean).join(" ")}
      style={{
        padding: "var(--space-4) var(--space-5)",
        minWidth: 220,
        display: "grid",
        gap: "var(--space-2)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-2xs)",
          letterSpacing: "var(--tracking-wider)",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
        }}
      >
        <span>Lap</span>
        <span>Position</span>
      </header>

      <div
        data-mono
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text)",
          lineHeight: "var(--lh-tight)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ fontSize: "var(--fs-2xl)" }}>
          {lap}
          <span style={{ color: "var(--color-text-muted)" }}> / {total}</span>
        </span>
        <span
          style={{
            fontSize: "var(--fs-xl)",
            color: "var(--color-accent)",
            textShadow: "0 0 12px oklch(76% 0.20 145 / 0.5)",
          }}
        >
          {ordinal(position)}
          {typeof totalRacers === "number" && (
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--fs-sm)",
                marginLeft: "var(--space-1)",
              }}
            >
              / {totalRacers}
            </span>
          )}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
        style={{
          position: "relative",
          height: 4,
          borderRadius: "var(--radius-pill)",
          background: "oklch(22% 0.014 260 / 0.8)",
          overflow: "hidden",
          border: "1px solid var(--color-line)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${progress}%`,
            background: "var(--color-accent)",
            boxShadow: "var(--glow-accent)",
            transition: "width var(--dur-slow) var(--ease-out-quart)",
          }}
        />
      </div>
    </div>
  );
}

export default LapCounter;
