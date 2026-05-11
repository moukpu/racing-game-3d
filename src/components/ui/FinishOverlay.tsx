import * as React from "react";

export interface FinishResultRow {
  /** 1-indexed final position. */
  position: number;
  /** Driver / car label, e.g. "You" or "AI #2". */
  name: string;
  /** Total race time, formatted (e.g. "1:42.387"). */
  time: string;
  /** Optional best-lap time. */
  bestLap?: string;
  /** True if this row is the local player. */
  isPlayer?: boolean;
}

export interface FinishOverlayProps {
  /** Ordered table of results, 1st -> last. */
  results: FinishResultRow[];
  /** Title shown on top of the card. Default: "Race finished". */
  title?: string;
  /** Called when the "Race again" button is clicked. */
  onRestart?: () => void;
  /** Called when the "Back to menu" button is clicked. */
  onExit?: () => void;
}

/**
 * FinishOverlay — post-race results screen.
 *
 *   ┌──────────────────────────────────────┐
 *   │           RACE  FINISHED             │
 *   │  ─────────────────────────────────   │
 *   │  1   You      1:41.221   best 32.4   │
 *   │  2   AI #1    1:42.887   best 33.0   │
 *   │  3   AI #2    1:45.014   best 33.5   │
 *   │  ─────────────────────────────────   │
 *   │   [ RACE AGAIN ]   [ BACK TO MENU ]  │
 *   └──────────────────────────────────────┘
 */
export function FinishOverlay({
  results,
  title = "Race finished",
  onRestart,
  onExit,
}: FinishOverlayProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-overlay)" as unknown as number,
        display: "grid",
        placeItems: "center",
        background: "oklch(8% 0 0 / 0.6)",
        backdropFilter: "blur(8px) saturate(120%)",
      }}
    >
      <div
        className="hud-card"
        style={{
          width: "min(640px, calc(100vw - var(--space-6)))",
          padding: "var(--space-7) var(--space-6)",
          display: "grid",
          gap: "var(--space-5)",
        }}
      >
        <header style={{ textAlign: "center", display: "grid", gap: "var(--space-2)" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-3xl)",
              lineHeight: "var(--lh-tight)",
              letterSpacing: "var(--tracking-tight)",
              textTransform: "uppercase",
              color: "var(--color-text)",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-2xs)",
              letterSpacing: "var(--tracking-wider)",
              textTransform: "uppercase",
            }}
          >
            results
          </p>
        </header>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-sm)",
            color: "var(--color-text)",
          }}
        >
          <thead>
            <tr
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--fs-2xs)",
                letterSpacing: "var(--tracking-wider)",
                textTransform: "uppercase",
              }}
            >
              <th style={{ textAlign: "left", padding: "var(--space-2) 0" }}>Pos</th>
              <th style={{ textAlign: "left", padding: "var(--space-2) 0" }}>Driver</th>
              <th style={{ textAlign: "right", padding: "var(--space-2) 0" }}>Time</th>
              <th style={{ textAlign: "right", padding: "var(--space-2) 0" }}>Best lap</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr
                key={`${row.position}-${row.name}`}
                style={{
                  borderTop: "1px solid var(--color-line)",
                  background: row.isPlayer ? "oklch(76% 0.20 145 / 0.07)" : "transparent",
                  color: row.isPlayer ? "var(--color-accent)" : "var(--color-text)",
                }}
              >
                <td style={{ padding: "var(--space-3) 0", fontVariantNumeric: "tabular-nums" }}>
                  {row.position}
                </td>
                <td style={{ padding: "var(--space-3) 0" }}>{row.name}</td>
                <td
                  style={{
                    padding: "var(--space-3) 0",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.time}
                </td>
                <td
                  style={{
                    padding: "var(--space-3) 0",
                    textAlign: "right",
                    color: "var(--color-text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.bestLap ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onRestart}
            style={{
              appearance: "none",
              cursor: "pointer",
              padding: "var(--space-3) var(--space-6)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-md)",
              letterSpacing: "var(--tracking-wider)",
              textTransform: "uppercase",
              color: "var(--color-bg-0)",
              background: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              borderRadius: "var(--radius-pill)",
              boxShadow: "var(--glow-accent)",
            }}
          >
            Race again
          </button>
          <button
            type="button"
            onClick={onExit}
            style={{
              appearance: "none",
              cursor: "pointer",
              padding: "var(--space-3) var(--space-6)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-md)",
              letterSpacing: "var(--tracking-wider)",
              textTransform: "uppercase",
              color: "var(--color-text)",
              background: "transparent",
              border: "1px solid var(--color-line-strong)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            Back to menu
          </button>
        </footer>
      </div>
    </div>
  );
}

export default FinishOverlay;
