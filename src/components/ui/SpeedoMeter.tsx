import * as React from "react";

export interface SpeedoMeterProps {
  /** Current speed in km/h. Clamped to [0, maxSpeed] for display. */
  speed: number;
  /** Top speed of the active car. Used to compute the fill ratio. */
  maxSpeed: number;
  /** Optional unit label. Defaults to "KM/H". */
  unit?: string;
  /** Optional current gear label, e.g. "3" or "R". Hidden if omitted. */
  gear?: string | number;
  /** Optional className for layout overrides from the HUD container. */
  className?: string;
}

/**
 * SpeedoMeter — HUD speed indicator.
 *
 * Layout (skeleton; Kostya wires real values + count-up via Framer Motion):
 *   ┌──────────────────────────┐
 *   │ SPEED            GEAR 3  │
 *   │  248                     │
 *   │  km/h                    │
 *   │ ▓▓▓▓▓▓▓▓▓▓▒▒░░░░░░░░     │  ← rev bar, --grad-speed
 *   └──────────────────────────┘
 */
export function SpeedoMeter({
  speed,
  maxSpeed,
  unit = "KM/H",
  gear,
  className,
}: SpeedoMeterProps) {
  const safeMax = Math.max(1, maxSpeed);
  const ratio = Math.min(1, Math.max(0, speed / safeMax));
  const pct = (ratio * 100).toFixed(1);
  const shown = Math.round(Math.min(safeMax, Math.max(0, speed)));

  return (
    <div
      role="status"
      aria-label={`Speed ${shown} ${unit}`}
      className={["hud-card", "speedometer", className].filter(Boolean).join(" ")}
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
        <span>Speed</span>
        {gear !== undefined && (
          <span aria-label="Gear">
            Gear <strong style={{ color: "var(--color-text)" }}>{gear}</strong>
          </span>
        )}
      </header>

      <div
        data-mono
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-2)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text)",
          lineHeight: "var(--lh-tight)",
        }}
      >
        <span
          style={{
            fontSize: "var(--fs-4xl)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          {shown}
        </span>
        <span
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-text-muted)",
            letterSpacing: "var(--tracking-wider)",
          }}
        >
          {unit}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={shown}
        style={{
          position: "relative",
          height: 6,
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
            width: `${pct}%`,
            background: "var(--grad-speed)",
            transition: "width var(--dur-fast) var(--ease-out-quart)",
          }}
        />
      </div>
    </div>
  );
}

export default SpeedoMeter;
