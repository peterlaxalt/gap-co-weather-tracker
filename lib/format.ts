// Pure presentation helpers (safe to import in client components).

// Map a WMO weather code (Open-Meteo) to an emoji glyph.
export function weatherCodeEmoji(code: number): string {
  if (code === 0) return "☀️"; // clear
  if (code === 1) return "🌤️"; // mainly clear
  if (code === 2) return "⛅"; // partly cloudy
  if (code === 3) return "☁️"; // overcast
  if (code === 45 || code === 48) return "🌫️"; // fog
  if (code >= 51 && code <= 57) return "🌦️"; // drizzle
  if (code >= 61 && code <= 67) return "🌧️"; // rain
  if (code >= 71 && code <= 77) return "🌨️"; // snow
  if (code >= 80 && code <= 82) return "🌧️"; // rain showers
  if (code === 85 || code === 86) return "🌨️"; // snow showers
  if (code >= 95) return "⛈️"; // thunderstorm
  return "🌡️";
}

const ARROWS = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"]; // direction wind is going TO
// OpenWeather deg = direction wind comes FROM. Arrow points where it's blowing toward.
export function windArrow(deg: number): string {
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return ARROWS[idx];
}

export function windCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// Background tint by precip probability (clear -> blue).
export function popTint(pop: number): string {
  if (pop <= 0.05) return "transparent";
  const a = Math.min(0.4, 0.08 + pop * 0.38);
  return `rgba(59, 130, 246, ${a.toFixed(2)})`;
}

// Color for the temperature number.
export function tempColor(temp: number): string {
  if (temp >= 90) return "#c2410c";
  if (temp >= 80) return "#ea580c";
  if (temp >= 68) return "#16a34a";
  if (temp >= 55) return "#0891b2";
  if (temp >= 40) return "#2563eb";
  return "#4f46e5";
}

// Flag windy conditions for cyclists.
export function isWindy(speed: number): boolean {
  return speed >= 15;
}
