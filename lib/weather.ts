import { WAYPOINTS, TRIP_DAYS, tripStartDate, type Waypoint } from "./trip";

// Open-Meteo: free, no API key, true hourly forecast. The trail is all Eastern
// Time, so we ask the API to return timestamps already localized to ET.
const TZ = "America/New_York";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

// ---- Shapes consumed by the UI -------------------------------------------

export type ForecastPoint = {
  time: string; // local ISO, e.g. "2026-06-26T14:00"
  temp: number;
  feelsLike: number;
  pop: number; // 0..1 probability of precipitation
  precipIn: number; // inches over the hour
  windSpeed: number; // mph
  windDeg: number;
  windGust: number | null; // mph
  humidity: number; // %
  weatherCode: number; // WMO code
  description: string;
};

export type TimeSlot = {
  time: string;
  label: string; // e.g. "2 PM"
};

export type ForecastDay = {
  dateKey: string; // YYYY-MM-DD in ET
  weekday: string; // "Sat"
  pretty: string; // "Sat, Jun 28"
  tripBadge: string | null; // "Day 1" if mapped via TRIP_START_DATE
  slots: TimeSlot[];
};

export type CityRole = { day: number; role: "start" | "end" };

export type CityForecast = {
  key: string;
  name: string;
  region: string;
  roles: CityRole[]; // which trip days this waypoint participates in
  points: Record<string, ForecastPoint>; // keyed by time
};

export type TripForecast = {
  generatedAt: number;
  days: ForecastDay[];
  cities: CityForecast[];
  error: string | null;
};

// ---- WMO weather code -> short description --------------------------------

function describeCode(code: number): string {
  const map: Record<number, string> = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "rime fog",
    51: "light drizzle",
    53: "drizzle",
    55: "dense drizzle",
    56: "freezing drizzle",
    57: "freezing drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "freezing rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    77: "snow grains",
    80: "light showers",
    81: "showers",
    82: "violent showers",
    85: "snow showers",
    86: "snow showers",
    95: "thunderstorm",
    96: "thunderstorm w/ hail",
    99: "thunderstorm w/ hail",
  };
  return map[code] ?? "—";
}

// ---- date/time helpers (timestamps already in ET) ------------------------

const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const prettyFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

function hourLabel(time: string): string {
  const h = Number(time.slice(11, 13));
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
}

// ---- Roles: which days each waypoint appears on ---------------------------

function rolesByCity(): Map<string, CityRole[]> {
  const map = new Map<string, CityRole[]>();
  for (const d of TRIP_DAYS) {
    (map.get(d.startKey) ?? map.set(d.startKey, []).get(d.startKey)!).push({ day: d.day, role: "start" });
    (map.get(d.endKey) ?? map.set(d.endKey, []).get(d.endKey)!).push({ day: d.day, role: "end" });
  }
  return map;
}

// ---- Open-Meteo fetch -----------------------------------------------------

type OMResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    precipitation_probability: (number | null)[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
};

async function fetchCity(w: Waypoint): Promise<ForecastPoint[]> {
  const url =
    `${FORECAST_URL}?latitude=${w.lat}&longitude=${w.lon}` +
    `&hourly=${HOURLY_VARS}` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=${encodeURIComponent(TZ)}&forecast_days=14`;
  const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
  if (!res.ok) {
    throw new Error(`Open-Meteo ${res.status} for ${w.name}`);
  }
  const { hourly } = (await res.json()) as OMResponse;
  return hourly.time.map((time, i) => {
    const code = hourly.weather_code[i] ?? 0;
    const gust = hourly.wind_gusts_10m[i];
    return {
      time,
      temp: Math.round(hourly.temperature_2m[i]),
      feelsLike: Math.round(hourly.apparent_temperature[i]),
      pop: (hourly.precipitation_probability[i] ?? 0) / 100,
      precipIn: hourly.precipitation[i] ?? 0,
      windSpeed: Math.round(hourly.wind_speed_10m[i]),
      windDeg: hourly.wind_direction_10m[i],
      windGust: gust != null ? Math.round(gust) : null,
      humidity: Math.round(hourly.relative_humidity_2m[i]),
      weatherCode: code,
      description: describeCode(code),
    };
  });
}

// ---- Build the full trip forecast ----------------------------------------

export async function getTripForecast(): Promise<TripForecast> {
  const roles = rolesByCity();
  const baseCities: CityForecast[] = WAYPOINTS.map((w) => ({
    key: w.key,
    name: w.name,
    region: w.region,
    roles: roles.get(w.key) ?? [],
    points: {},
  }));

  try {
    const results = await Promise.all(WAYPOINTS.map((w) => fetchCity(w)));

    const cities: CityForecast[] = baseCities.map((c, i) => {
      const points: Record<string, ForecastPoint> = {};
      for (const p of results[i]) points[p.time] = p;
      return { ...c, points };
    });

    // Distinct timestamps grouped into days (all cities share the ET hourly grid).
    const allTimes = new Set<string>();
    for (const r of results) for (const p of r) allTimes.add(p.time);
    const sortedTimes = [...allTimes].sort();

    const start = tripStartDate();
    const dayMap = new Map<string, TimeSlot[]>();
    for (const time of sortedTimes) {
      const key = time.slice(0, 10);
      const slot: TimeSlot = { time, label: hourLabel(time) };
      (dayMap.get(key) ?? dayMap.set(key, []).get(key)!).push(slot);
    }

    const days: ForecastDay[] = [...dayMap.entries()].map(([dateKey, slots]) => {
      const sample = new Date(`${dateKey}T12:00:00Z`);
      let tripBadge: string | null = null;
      if (start) {
        const diff = Math.round(
          (Date.parse(`${dateKey}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000,
        );
        if (diff >= 0 && diff < TRIP_DAYS.length) tripBadge = `Day ${diff + 1}`;
      }
      return {
        dateKey,
        weekday: weekdayFmt.format(sample),
        pretty: prettyFmt.format(sample),
        tripBadge,
        slots,
      };
    });

    return { generatedAt: Math.floor(Date.now() / 1000), days, cities, error: null };
  } catch (err) {
    return {
      generatedAt: Math.floor(Date.now() / 1000),
      days: [],
      cities: baseCities,
      error: err instanceof Error ? err.message : "fetch-failed",
    };
  }
}
