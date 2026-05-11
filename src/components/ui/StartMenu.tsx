import * as React from "react";
import type { CarConfig } from "@/types/game";

export interface StartMenuProps {
  /** Cars to render as selectable cards. Canonical type from @/types/game. */
  cars: readonly CarConfig[];
  /** Currently selected car id. */
  selectedCarId?: string;
  /** Called with the picked car id. */
  onSelectCar?: (id: string) => void;
  /** Called when "Start race" is clicked. */
  onStart?: () => void;
  /** Disables the start button (e.g. while assets load). */
  disabled?: boolean;
}

const MPS_TO_KMH = 3.6;

/**
 * StartMenu — pre-race screen.
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │              RACING  GAME  3D                          │
 *   │   выбери машину                                        │
 *   │                                                        │
 *   │   ┌──────┐   ┌──────┐   ┌──────┐                       │
 *   │   │ CAR1 │   │ CAR2 │   │ CAR3 │                       │
 *   │   └──────┘   └──────┘   └──────┘                       │
 *   │                                                        │
 *   │              [  START RACE  ]                          │
 *   └────────────────────────────────────────────────────────┘
 */
export function StartMenu({
  cars,
  selectedCarId,
  onSelectCar,
  onStart,
  disabled = false,
}: StartMenuProps) {
  return (
    <section
      className="start-menu scanlines"
      style={{
        position: "relative",
        minHeight: "100dvh",
        padding: "var(--space-8) var(--space-6)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: "var(--space-7)",
        alignItems: "center",
        justifyItems: "center",
      }}
    >
      <header
        style={{
          textAlign: "center",
          display: "grid",
          gap: "var(--space-3)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 7vw, var(--fs-5xl))",
            lineHeight: "var(--lh-tight)",
            letterSpacing: "var(--tracking-tight)",
            color: "var(--color-text)",
            textTransform: "uppercase",
          }}
        >
          Racing&nbsp;Game&nbsp;
          <span style={{ color: "var(--color-accent)" }}>3D</span>
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-dim)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-xs)",
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
          }}
        >
          choose your machine
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label="Select car"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-5)",
          width: "min(960px, 100%)",
        }}
      >
        {cars.map((car) => {
          const selected = car.id === selectedCarId;
          const topKmh = Math.round(car.maxSpeed * MPS_TO_KMH);
          return (
            <button
              key={car.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectCar?.(car.id)}
              className="car-card"
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: "var(--space-5)",
                background: "var(--color-bg-1)",
                color: "var(--color-text)",
                border: `1px solid ${
                  selected ? "var(--color-accent)" : "var(--color-line)"
                }`,
                borderRadius: "var(--radius-lg)",
                boxShadow: selected ? "var(--glow-accent)" : "var(--shadow-1)",
                transition:
                  "transform var(--dur-base) var(--ease-out-quart), " +
                  "border-color var(--dur-base) var(--ease-out-quart), " +
                  "box-shadow var(--dur-base) var(--ease-out-quart)",
                display: "grid",
                gap: "var(--space-3)",
              }}
            >
              {/* Color-swatch placeholder — Kostya can swap for <Canvas/> mini-preview
                  or <img src={...} /> once GLB thumbnails are exported. */}
              <div
                aria-hidden
                style={{
                  height: 110,
                  borderRadius: "var(--radius-md)",
                  background: `linear-gradient(135deg, ${car.color} 0%, var(--color-bg-2) 100%)`,
                  border: "1px solid var(--color-line)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-2xs)",
                  color: "var(--color-text)",
                  letterSpacing: "var(--tracking-wider)",
                  textTransform: "uppercase",
                  mixBlendMode: "normal",
                }}
              >
                {car.id}
              </div>

              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--fs-lg)",
                    letterSpacing: "var(--tracking-tight)",
                  }}
                >
                  {car.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-2xs)",
                    letterSpacing: "var(--tracking-wider)",
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {car.id}
                </div>
              </div>

              <dl
                style={{
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "var(--space-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-2xs)",
                  letterSpacing: "var(--tracking-wider)",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                <div>
                  <dt>Top</dt>
                  <dd
                    style={{
                      margin: 0,
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {topKmh}
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "var(--fs-2xs)",
                        marginLeft: 2,
                      }}
                    >
                      km/h
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Accel</dt>
                  <dd
                    style={{
                      margin: 0,
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {car.accel.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt>Mass</dt>
                  <dd
                    style={{
                      margin: 0,
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {car.mass}
                  </dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={disabled || !selectedCarId}
        style={{
          appearance: "none",
          cursor: disabled || !selectedCarId ? "not-allowed" : "pointer",
          padding: "var(--space-4) var(--space-7)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-lg)",
          letterSpacing: "var(--tracking-wider)",
          textTransform: "uppercase",
          color: "var(--color-bg-0)",
          background: "var(--color-accent)",
          border: "1px solid var(--color-accent)",
          borderRadius: "var(--radius-pill)",
          boxShadow: "var(--glow-accent)",
          opacity: disabled || !selectedCarId ? 0.4 : 1,
          transition:
            "transform var(--dur-fast) var(--ease-out-quart), " +
            "box-shadow var(--dur-base) var(--ease-out-quart)",
        }}
      >
        Start race
      </button>
    </section>
  );
}

export default StartMenu;
