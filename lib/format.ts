// Pure presentation helpers (safe to import in client components).

// Map an OpenWeather "weather id" to an emoji glyph.
export function weatherEmoji(id: number): string {
  if (id >= 200 && id < 300) return "⛈️"; // thunderstorm
  if (id >= 300 && id < 400) return "🌦️"; // drizzle
  if (id === 511) return "🌧️"; // freezing rain
  if (id >= 500 && id < 600) return "🌧️"; // rain
  if (id >= 600 && id < 700) return "🌨️"; // snow
  if (id >= 700 && id < 800) return "🌫️"; // mist/fog/haze
  if (id === 800) return "☀️"; // clear
  if (id === 801) return "🌤️"; // few clouds
  if (id === 802) return "⛅"; // scattered
  if (id >= 803) return "☁️"; // broken/overcast
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
