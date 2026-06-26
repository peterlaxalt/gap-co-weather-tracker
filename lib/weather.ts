import { WAYPOINTS, TRIP_DAYS, tripStartDate, type Waypoint } from "./trip";

const TZ = "America/New_York"; // entire trail is in Eastern Time
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// ---- Shapes consumed by the UI -------------------------------------------

export type ForecastPoint = {
  dt: number; // unix seconds
  temp: number;
  feelsLike: number;
  pop: number; // 0..1 probability of precipitation
  rainMm: number; // expected rain over the 3h block, mm
  windSpeed: number; // mph
  windDeg: number;
  windGust: number | null; // mph
  humidity: number; // %
  weatherId: number;
  main: string;
  description: string;
};

export type TimeSlot = {
  dt: number;
  label: string; // e.g. "9 AM"
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
  points: Record<number, ForecastPoint>; // keyed by dt
};

export type TripForecast = {
  generatedAt: number;
  days: ForecastDay[];
  cities: CityForecast[];
  error: string | null;
};

// ---- ET date/time helpers -------------------------------------------------

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  hour12: true,
});

const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const prettyFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});

function dateKeyOf(dt: number): string {
  return dateKeyFmt.format(new Date(dt * 1000));
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

// ---- OpenWeather fetch ----------------------------------------------------

type OWForecastResponse = {
  list: Array<{
    dt: number;
    main: { temp: number; feels_like: number; humidity: number };
    weather: Array<{ id: number; main: string; description: string }>;
    wind: { speed: number; deg: number; gust?: number };
    pop?: number;
    rain?: { "3h"?: number };
  }>;
};

async function fetchCity(w: Waypoint, apiKey: string): Promise<ForecastPoint[]> {
  const url = `${FORECAST_URL}?lat=${w.lat}&lon=${w.lon}&units=imperial&appid=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
  if (!res.ok) {
    const err = new Error(`OpenWeather ${res.status} for ${w.name}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const data = (await res.json()) as OWForecastResponse;
  return data.list.map((e) => ({
    dt: e.dt,
    temp: Math.round(e.main.temp),
    feelsLike: Math.round(e.main.feels_like),
    pop: e.pop ?? 0,
    rainMm: e.rain?.["3h"] ?? 0,
    windSpeed: Math.round(e.wind.speed),
    windDeg: e.wind.deg,
    windGust: e.wind.gust != null ? Math.round(e.wind.gust) : null,
    humidity: e.main.humidity,
    weatherId: e.weather[0]?.id ?? 800,
    main: e.weather[0]?.main ?? "Clear",
    description: e.weather[0]?.description ?? "",
  }));
}

// ---- Demo data (OPENWEATHER_API_KEY=demo) ---------------------------------

const MOCK_IDS = [800, 801, 802, 803, 804, 500, 501, 520, 200, 741];

function mockCity(cityIdx: number): ForecastPoint[] {
  // 40 points (5 days x 8), every 3h, starting at the next 3h boundary.
  const now = Math.floor(Date.now() / 1000);
  const step = 3 * 3600;
  const start = Math.ceil(now / step) * step;
  const out: ForecastPoint[] = [];
  for (let i = 0; i < 40; i++) {
    const dt = start + i * step;
    const hourOfDay = (Math.floor(dt / 3600) % 24 + 24) % 24;
    const diurnal = Math.sin(((hourOfDay - 9) / 24) * 2 * Math.PI); // peak ~3pm
    const temp = Math.round(68 + 14 * diurnal + cityIdx * 1.5 - i * 0.05);
    const wid = MOCK_IDS[(cityIdx * 3 + i) % MOCK_IDS.length];
    const rainy = wid >= 200 && wid < 600;
    const pop = rainy ? Math.min(0.95, 0.3 + ((cityIdx + i) % 5) * 0.15) : ((i + cityIdx) % 4) * 0.05;
    out.push({
      dt,
      temp,
      feelsLike: temp + (temp > 80 ? 3 : -1),
      pop,
      rainMm: rainy ? 1.2 : 0,
      windSpeed: 5 + ((cityIdx * 2 + i) % 16),
      windDeg: (cityIdx * 40 + i * 25) % 360,
      windGust: 10 + ((cityIdx + i) % 14),
      humidity: 45 + ((cityIdx * 5 + i * 3) % 50),
      weatherId: wid,
      main: rainy ? "Rain" : "Clouds",
      description: rainy ? "light rain" : "scattered clouds",
    });
  }
  return out;
}

// ---- Build the full trip forecast ----------------------------------------

export async function getTripForecast(): Promise<TripForecast> {
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  const roles = rolesByCity();

  const baseCities: CityForecast[] = WAYPOINTS.map((w) => ({
    key: w.key,
    name: w.name,
    region: w.region,
    roles: roles.get(w.key) ?? [],
    points: {},
  }));

  if (!apiKey) {
    return {
      generatedAt: Math.floor(Date.now() / 1000),
      days: [],
      cities: baseCities,
      error: "missing-key",
    };
  }

  try {
    const results =
      apiKey === "demo"
        ? WAYPOINTS.map((w, i) => mockCity(i))
        : await Promise.all(WAYPOINTS.map((w) => fetchCity(w, apiKey)));

    const cities: CityForecast[] = baseCities.map((c, i) => {
      const points: Record<number, ForecastPoint> = {};
      for (const p of results[i]) points[p.dt] = p;
      return { ...c, points };
    });

    // Collect all distinct timestamps, group into days.
    const allDts = new Set<number>();
    for (const r of results) for (const p of r) allDts.add(p.dt);
    const sortedDts = [...allDts].sort((a, b) => a - b);

    const start = tripStartDate();
    const dayMap = new Map<string, TimeSlot[]>();
    for (const dt of sortedDts) {
      const key = dateKeyOf(dt);
      const slot: TimeSlot = { dt, label: hourFmt.format(new Date(dt * 1000)).replace(/\s/g, " ") };
      (dayMap.get(key) ?? dayMap.set(key, []).get(key)!).push(slot);
    }

    const days: ForecastDay[] = [...dayMap.entries()].map(([dateKey, slots]) => {
      const sample = new Date((slots[0].dt) * 1000);
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

    return {
      generatedAt: Math.floor(Date.now() / 1000),
      days,
      cities,
      error: null,
    };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return {
      generatedAt: Math.floor(Date.now() / 1000),
      days: [],
      cities: baseCities,
      error: status === 401 ? "invalid-key" : err instanceof Error ? err.message : "fetch-failed",
    };
  }
}
