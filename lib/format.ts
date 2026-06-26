// Pure presentation helpers (safe to import in client components).
import type { CSSProperties } from "react";

// Temperature -> pill colors on a cold→hot gradient
// (blue → cyan → green → yellow → orange → red). Returns bg + readable text.
export function tempColorScale(temp: number): { bg: string; fg: string } {
  const t = Math.max(28, Math.min(98, temp));
  const f = (t - 28) / (98 - 28); // 0 cold .. 1 hot
  const hue = 220 - 220 * f; // 220 (blue) .. 0 (red), passing through green/yellow
  const sat = 78;
  const light = 48;
  const bg = `hsl(${hue.toFixed(0)}, ${sat}%, ${light}%)`;
  // The yellow/green band reads bright at L=48 — use dark ink there, else white.
  const fg = hue > 38 && hue < 175 ? "#10261a" : "#ffffff";
  return { bg, fg };
}

// Background tint by precip probability (clear -> blue).
export function popTint(pop: number): string {
  if (pop <= 0.05) return "transparent";
  const a = Math.min(0.42, 0.06 + pop * 0.4);
  return `rgba(37, 99, 235, ${a.toFixed(2)})`;
}

// Alternate rain indicator: a dotted blue pattern, denser/stronger with pop.
// Returned as inline style props so it composes with the cell.
export function popDots(pop: number): CSSProperties {
  if (pop <= 0.05) return {};
  const a = Math.min(0.7, 0.18 + pop * 0.55);
  return {
    backgroundImage: `radial-gradient(rgba(29, 78, 216, ${a.toFixed(2)}) 1.1px, transparent 1.6px)`,
    backgroundSize: "7px 7px",
  };
}

export function windCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// Flag windy conditions for cyclists.
export function isWindy(speed: number): boolean {
  return speed >= 15;
}

// Phosphor icon name + accent color for a WMO weather code.
export type IconKey =
  | "sun"
  | "cloudSun"
  | "cloud"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

// Open-Meteo's weather_code over-reports thunderstorms/rain at longer ranges
// (it flags instability even at ~0% precip). Gate precipitation conditions on
// the actual probability so we don't paint phantom storms. `pop` is 0..1.
export function conditionIcon(code: number, pop: number): { key: IconKey; color: string } {
  const storm = code >= 95;
  const rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const snow = (code >= 71 && code <= 77) || code === 85 || code === 86;

  if (storm && pop >= 0.3) return { key: "storm", color: "#7c3aed" };
  if ((storm || rain) && pop >= 0.2) return { key: "rain", color: "#2563eb" };
  if (snow && pop >= 0.2) return { key: "snow", color: "#60a5fa" };
  if (code === 45 || code === 48) return { key: "fog", color: "#94a3b8" };
  if (code === 0) return { key: "sun", color: "#f59e0b" };
  if (code === 1 || code === 2) return { key: "cloudSun", color: "#eab308" };
  return { key: "cloud", color: "#94a3b8" }; // overcast, or a precip code with low pop
}
