"use client";

import { useEffect, useRef } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Drop,
  Umbrella,
  NavigationArrow,
  Path,
  Mountains,
} from "@phosphor-icons/react/dist/ssr";
import type { TripForecast, TripDayForecast, TownDay, ForecastPoint } from "@/lib/weather";
import {
  tempColorScale,
  popTint,
  isWindy,
  windCompass,
  conditionIcon,
  type IconKey,
} from "@/lib/format";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_W = 50; // keep in sync with .cell / .hour width in globals.css
const FIRST_W = 86; // keep in sync with .town / .corner width
const SCROLL_TO_HOUR = 6;

function hourLabel(h: number): string {
  const ampm = h < 12 ? "a" : "p";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}

const ICONS: Record<IconKey, typeof Sun> = {
  sun: Sun,
  cloudSun: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export default function WeatherView({ forecast }: { forecast: TripForecast }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = SCROLL_TO_HOUR * HOUR_W;
  }, []);

  if (forecast.error || forecast.tripDays.length === 0) {
    return (
      <main className="empty">
        Couldn’t load the forecast{forecast.error ? ` (${forecast.error})` : ""}. Try again shortly.
      </main>
    );
  }

  return (
    <div className="grid-scroll" ref={scrollRef}>
      <table className="grid" style={{ ["--hour-w" as string]: `${HOUR_W}px`, ["--first-w" as string]: `${FIRST_W}px` }}>
        <thead>
          <tr>
            <th className="corner" />
            {HOURS.map((h) => (
              <th key={h} className={`hour ${h % 6 === 0 ? "hour-mark" : ""}`}>
                {hourLabel(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {forecast.tripDays.map((d) => (
            <DayGroup key={d.day} d={d} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayGroup({ d }: { d: TripDayForecast }) {
  return (
    <>
      <tr className="banner">
        <td className="banner-cell" colSpan={HOURS.length + 1}>
          <div className="banner-inner">
            <span className="b-day">Day {d.day}</span>
            <span className="b-date">
              {d.weekday} {d.pretty}
            </span>
            <span className="b-route">{d.routeLabel}</span>
            <span className="b-stats">
              <Path size={11} weight="bold" /> {d.miles} mi
              <Mountains size={11} weight="bold" /> {d.elevationFt.toLocaleString()} ft
            </span>
            <DaySummaryChip d={d} />
          </div>
        </td>
      </tr>
      {d.available ? (
        <>
          <TownRow town={d.start} role="start" />
          <TownRow town={d.end} role="end" />
        </>
      ) : (
        <tr className="town-row">
          <th className="town" data-role="">
            <span className="t-name">{d.start.name}</span>
          </th>
          <td className="unavail" colSpan={HOURS.length}>
            <div className="unavail-inner">Forecast available closer to the date</div>
          </td>
        </tr>
      )}
    </>
  );
}

function DaySummaryChip({ d }: { d: TripDayForecast }) {
  if (!d.summary) return null;
  const { key, color } = conditionIcon(d.summary.code);
  const Icon = ICONS[key];
  return (
    <span className="b-wx">
      <Icon size={15} weight="fill" color={color} />
      <strong>
        {d.summary.lo}–{d.summary.hi}°
      </strong>
      {d.summary.maxPop >= 10 && (
        <span className="b-rain">
          <Umbrella size={12} weight="fill" /> {d.summary.maxPop}%
        </span>
      )}
    </span>
  );
}

function TownRow({ town, role }: { town: TownDay; role: "start" | "end" }) {
  return (
    <tr className="town-row">
      <th className="town" data-role={role}>
        <span className="t-name">{town.name}</span>
        <span className="t-tag">{role}</span>
      </th>
      {HOURS.map((h) => (
        <Cell key={h} p={town.byHour[h]} mark={h % 6 === 0} />
      ))}
    </tr>
  );
}

function Cell({ p, mark }: { p: ForecastPoint | undefined; mark: boolean }) {
  if (!p) {
    return (
      <td className={`cell ${mark ? "mark" : ""}`}>
        <span className="dash">·</span>
      </td>
    );
  }
  const { key, color } = conditionIcon(p.weatherCode);
  const Icon = ICONS[key];
  const { bg, fg } = tempColorScale(p.temp);
  const pop = Math.round(p.pop * 100);
  const windy = isWindy(p.windSpeed);
  const title =
    `${p.temp}°F (feels ${p.feelsLike}°) · ${pop}% rain · ` +
    `wind ${p.windSpeed} mph from ${windCompass(p.windDeg)}${p.windGust ? ` (gust ${p.windGust})` : ""} · ` +
    `${p.humidity}% humidity`;
  return (
    <td className={`cell ${mark ? "mark" : ""}`} style={{ background: popTint(p.pop) }} title={title}>
      <Icon className="c-icon" size={15} weight="fill" color={color} />
      <span className="temp" style={{ background: bg, color: fg }}>
        {p.temp}°
      </span>
      <span className={`rain ${pop >= 40 ? "rain-hi" : ""}`}>
        <Umbrella size={9} weight="fill" /> {pop}
      </span>
      <span className={`wind ${windy ? "wind-hi" : ""}`}>
        <NavigationArrow
          size={9}
          weight="fill"
          style={{ transform: `rotate(${p.windDeg + 135}deg)` }}
        />{" "}
        {p.windSpeed}
      </span>
      <span className="hum">
        <Drop size={9} weight="fill" /> {p.humidity}
      </span>
    </td>
  );
}
