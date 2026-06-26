"use client";

import { useMemo, useState } from "react";
import type { TripForecast, CityForecast, ForecastPoint } from "@/lib/weather";
import { TRIP_DAYS } from "@/lib/trip";
import { weatherEmoji, windArrow, popTint, tempColor, isWindy } from "@/lib/format";

type Props = {
  forecast: TripForecast;
  hasTripDates: boolean;
};

export default function WeatherView({ forecast, hasTripDates }: Props) {
  const { days, cities } = forecast;

  // Default to the first trip-badged day if dates are set, else the first day.
  const defaultIdx = useMemo(() => {
    const i = days.findIndex((d) => d.tripBadge === "Day 1");
    return i >= 0 ? i : 0;
  }, [days]);

  const [activeIdx, setActiveIdx] = useState(defaultIdx);
  const day = days[activeIdx];

  // Which city rows to highlight for the selected day's trip leg.
  const highlightKeys = useMemo(() => {
    if (!day?.tripBadge) return new Set<string>();
    const n = Number(day.tripBadge.replace(/\D/g, ""));
    const td = TRIP_DAYS.find((t) => t.day === n);
    return new Set(td ? [td.startKey, td.endKey] : []);
  }, [day]);

  if (!day) {
    return (
      <main className="wrap">
        <Header forecast={forecast} />
        <p className="empty">
          {forecast.error
            ? `Couldn't load the forecast (${forecast.error}). Check your API key and try again.`
            : "No forecast data available yet."}
        </p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Header forecast={forecast} />

      <nav className="tabs" aria-label="Forecast days">
        {days.map((d, i) => (
          <button
            key={d.dateKey}
            className={`tab ${i === activeIdx ? "active" : ""}`}
            onClick={() => setActiveIdx(i)}
          >
            {d.tripBadge && <span className="tab-badge">{d.tripBadge}</span>}
            <span className="tab-day">{d.weekday}</span>
            <span className="tab-date">{d.pretty.replace(/^\w+,\s/, "")}</span>
          </button>
        ))}
      </nav>

      <LegCaption day={day} />

      <div className="grid-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="corner">Town</th>
              {day.slots.map((s) => (
                <th key={s.dt} className="hour">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <CityRow
                key={c.key}
                city={c}
                slotDts={day.slots.map((s) => s.dt)}
                highlight={highlightKeys.has(c.key)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Legend />
    </main>
  );
}

function Header({ forecast }: { forecast: TripForecast }) {
  const updated = relativeTime(forecast.generatedAt);
  return (
    <header className="hero">
      <h1>
        <span className="bike">🚲</span> GAP &amp; C&amp;O Weather
      </h1>
      <p className="sub">Pittsburgh → DC · hour-by-hour along the trail</p>
      <p className="updated">Updated {updated} · auto-refreshes every 30 min</p>
    </header>
  );
}

function LegCaption({ day }: { day: TripForecast["days"][number] }) {
  if (!day.tripBadge) return null;
  const n = Number(day.tripBadge.replace(/\D/g, ""));
  const td = TRIP_DAYS.find((t) => t.day === n);
  if (!td) return null;
  return (
    <p className="leg">
      <strong>{day.tripBadge}:</strong> {td.label} · {td.miles} mi · {td.elevationFt.toLocaleString()} ft
    </p>
  );
}

function CityRow({
  city,
  slotDts,
  highlight,
}: {
  city: CityForecast;
  slotDts: number[];
  highlight: boolean;
}) {
  const pts = slotDts.map((dt) => city.points[dt]).filter(Boolean) as ForecastPoint[];
  const summary = daySummary(pts);
  const roleText = city.roles
    .map((r) => `D${r.day} ${r.role === "start" ? "start" : "end"}`)
    .join(" · ");

  return (
    <tr className={highlight ? "row-hi" : ""}>
      <th className="city">
        <span className="city-name">{city.name}</span>
        <span className="city-region">{city.region}</span>
        {summary && (
          <span className="city-summary">
            {summary.lo}°–{summary.hi}° · 💧{summary.maxPop}%
          </span>
        )}
        {roleText && <span className="city-roles">{roleText}</span>}
      </th>
      {slotDts.map((dt) => (
        <Cell key={dt} p={city.points[dt]} />
      ))}
    </tr>
  );
}

function Cell({ p }: { p: ForecastPoint | undefined }) {
  if (!p) {
    return (
      <td className="cell empty-cell">
        <span className="dash">—</span>
      </td>
    );
  }
  const pop = Math.round(p.pop * 100);
  return (
    <td className="cell" style={{ background: popTint(p.pop) }} title={p.description}>
      <div className="temp" style={{ color: tempColor(p.temp) }}>
        {p.temp}°
      </div>
      <div className="emoji" aria-label={p.description}>
        {weatherEmoji(p.weatherId)}
      </div>
      <div className={`pop ${pop >= 40 ? "pop-hi" : ""}`}>💧 {pop}%</div>
      <div className={`wind ${isWindy(p.windSpeed) ? "wind-hi" : ""}`}>
        <span className="arrow">{windArrow(p.windDeg)}</span> {p.windSpeed}
        <span className="unit"> mph</span>
      </div>
      <div className="hum">💦 {p.humidity}%</div>
    </td>
  );
}

function Legend() {
  return (
    <footer className="legend">
      <div>
        <span className="temp-chip">68°</span> temp (°F)
      </div>
      <div>💧 chance of rain</div>
      <div>
        <span className="arrow">→</span> wind dir + mph
      </div>
      <div>💦 humidity</div>
      <div className="legend-note">
        Blue cells = higher rain chance. Bold wind = 15+ mph (notable headwind).
      </div>
    </footer>
  );
}

// ---- helpers --------------------------------------------------------------

function daySummary(pts: ForecastPoint[]): { hi: number; lo: number; maxPop: number } | null {
  if (pts.length === 0) return null;
  let hi = -Infinity;
  let lo = Infinity;
  let maxPop = 0;
  for (const p of pts) {
    hi = Math.max(hi, p.temp);
    lo = Math.min(lo, p.temp);
    maxPop = Math.max(maxPop, p.pop);
  }
  return { hi, lo, maxPop: Math.round(maxPop * 100) };
}

function relativeTime(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
}
