import * as React from "react";

export interface CountdownOverlayProps {
  /**
   * Active countdown value rendered in the centre of the screen.
   * - number > 0: shown as digit (e.g. 3, 2, 1).
   * - "GO": shown as the green start cue.
   * - null/undefined: overlay is hidden.
   *
   * Kostya drives this from a timer tick; the component only renders.
   */
  value?: number | "GO" | null;
  /** Optional className for layout overrides. */
  className?: string;
}

/**
 * CountdownOverlay — full-screen 3 / 2 / 1 / GO! cue.
 *
 *   ┌─────────────────────────────┐
 *   │                             │
 *   │                             │
 *   │            3                │
 *   │                             │
 *   │                             │
 *   └─────────────────────────────┘
 */
export function CountdownOverlay({ value, className }: CountdownOverlayProps) {
  if (value === null || value === undefined) return null;

  const isGo = value === "GO";
  const label = isGo ? "GO!" : String(value);
  const color = isGo ? "var(--color-accent)" : "var(--color-text)";
  const glow = isGo ? "var(--glow-accent)" : "none";

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={isGo ? "Race start" : `Countdown ${value}`}
      className={["countdown-overlay", className].filter(Boolean).join(" ")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-overlay)" as unknown as number,
        display: "grid",
        placeItems: "center",
        background: "oklch(8% 0 0 / 0.55)",
        backdropFilter: "blur(2px) saturate(110%)",
        pointerEvents: "none",
      }}
    >
      <span
        key={label /* re-mount per tick so Kostya can add scale-in via Framer */}
        data-mono={!isGo ? "" : undefined}
        style={{
          fontFamily: isGo ? "var(--font-display)" : "var(--font-mono)",
          fontSize: isGo ? "var(--fs-5xl)" : "var(--fs-5xl)",
          color,
          lineHeight: "var(--lh-tight)",
          letterSpacing: "var(--tracking-tight)",
          textShadow: glow === "none" ? "none" : "0 0 32px oklch(76% 0.20 145 / 0.6)",
          fontVariantNumeric: "tabular-nums",
          textTransform: isGo ? "uppercase" : "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default CountdownOverlay;
