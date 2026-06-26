import { WAYPOINTS, TRIP_DAYS, tripStartDate, waypointByKey, type Waypoint } from "./trip";

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

// Riding window used for the per-day summary.
const RIDE_START_HOUR = 7;
const RIDE_END_HOUR = 19;

// ---- Shapes consumed by the UI -------------------------------------------

export type ForecastPoint = {
  time: string; // local ISO, e.g. "2026-06-26T14:00"
  hour: number; // 0..23
  temp: number;
  feelsLike: number;
  pop: number; // 0..1 probability of precipitation
  precipIn: number; // inches over the hour
  windSpeed: number; // mph
  windDeg: number;
  windGust: number | null; // mph
  humidity: number; // %
  weatherCode: number; // WMO code
};

export type TownDay = {
  key: string;
  name: string;
  region: string;
  byHour: Record<number, ForecastPoint>; // hour-of-day -> point (this day's date)
};

export type DaySummary = { hi: number; lo: number; maxPop: number; code: number } | null;

export type TripDayForecast = {
  day: number;
  date: string; // YYYY-MM-DD
  weekday: string; // "Fri"
  pretty: string; // "Jun 26"
  routeLabel: string; // "Pittsburgh → Smithton"
  miles: number;
  elevationFt: number;
  start: TownDay;
  end: TownDay;
  summary: DaySummary;
  available: boolean;
};

export type TripForecast = {
  generatedAt: number;
  tripDays: TripDayForecast[];
  error: string | null;
};

// ---- date helpers ---------------------------------------------------------

const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const prettyFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

function addDays(isoDate: string, n: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
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
  const res = await fetch(url, {
    next: { revalidate: 1800 }, // cache 30 min
    signal: AbortSignal.timeout(8000), // never hang a build/request on a slow API
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo ${res.status} for ${w.name}`);
  }
  const { hourly } = (await res.json()) as OMResponse;
  return hourly.time.map((time, i) => {
    const gust = hourly.wind_gusts_10m[i];
    return {
      time,
      hour: Number(time.slice(11, 13)),
      temp: Math.round(hourly.temperature_2m[i]),
      feelsLike: Math.round(hourly.apparent_temperature[i]),
      pop: (hourly.precipitation_probability[i] ?? 0) / 100,
      precipIn: hourly.precipitation[i] ?? 0,
      windSpeed: Math.round(hourly.wind_speed_10m[i]),
      windDeg: hourly.wind_direction_10m[i],
      windGust: gust != null ? Math.round(gust) : null,
      humidity: Math.round(hourly.relative_humidity_2m[i]),
      weatherCode: hourly.weather_code[i] ?? 0,
    };
  });
}

// ---- build a town-day from a town's full hourly series --------------------

function townDayFor(key: string, points: ForecastPoint[], date: string): TownDay {
  const w = waypointByKey(key)!;
  const byHour: Record<number, ForecastPoint> = {};
  for (const p of points) {
    if (p.time.slice(0, 10) === date) byHour[p.hour] = p;
  }
  return { key, name: w.name, region: w.region, byHour };
}

function summarize(start: TownDay, end: TownDay): DaySummary {
  let hi = -Infinity;
  let lo = Infinity;
  let maxPop = 0;
  let code = 0;
  let seen = false;
  for (const town of [start, end]) {
    for (let h = RIDE_START_HOUR; h <= RIDE_END_HOUR; h++) {
      const p = town.byHour[h];
      if (!p) continue;
      seen = true;
      hi = Math.max(hi, p.temp);
      lo = Math.min(lo, p.temp);
      maxPop = Math.max(maxPop, p.pop);
      code = Math.max(code, p.weatherCode); // higher WMO code ≈ more severe
    }
  }
  return seen ? { hi, lo, maxPop: Math.round(maxPop * 100), code } : null;
}

// ---- Build the full trip forecast ----------------------------------------

export async function getTripForecast(): Promise<TripForecast> {
  const generatedAt = Math.floor(Date.now() / 1000);
  try {
    const results = await Promise.all(WAYPOINTS.map((w) => fetchCity(w)));
    const series = new Map<string, ForecastPoint[]>();
    WAYPOINTS.forEach((w, i) => series.set(w.key, results[i]));

    // Earliest forecast date available (fallback start when no trip date set).
    let earliest = "9999-12-31";
    for (const r of results) if (r.length && r[0].time < `${earliest}T`) earliest = r[0].time.slice(0, 10);
    const startDate = tripStartDate() ?? earliest;

    const tripDays: TripDayForecast[] = TRIP_DAYS.map((d) => {
      const date = addDays(startDate, d.day - 1);
      const start = townDayFor(d.startKey, series.get(d.startKey)!, date);
      const end = townDayFor(d.endKey, series.get(d.endKey)!, date);
      const sample = new Date(`${date}T12:00:00Z`);
      const available = Object.keys(start.byHour).length > 0;
      return {
        day: d.day,
        date,
        weekday: weekdayFmt.format(sample),
        pretty: prettyFmt.format(sample),
        routeLabel: `${start.name} → ${end.name}`,
        miles: d.miles,
        elevationFt: d.elevationFt,
        start,
        end,
        summary: summarize(start, end),
        available,
      };
    });

    return { generatedAt, tripDays, error: null };
  } catch (err) {
    return {
      generatedAt,
      tripDays: [],
      error: err instanceof Error ? err.message : "fetch-failed",
    };
  }
}
