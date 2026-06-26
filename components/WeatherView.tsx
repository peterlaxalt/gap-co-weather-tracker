"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Drop,
  Waves,
  NavigationArrow,
  Path,
  Mountains,
  CaretDown,
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
const FIRST_W = 92; // keep in sync with .town / .corner / .b-pill width
const SCROLL_TO_HOUR = 6;
const NOW_SPAN = 4; // hours each side of "now" that the blue band fades across

function hourLabel(h: number): string {
  const ampm = h < 12 ? "a" : "p";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}

// Solid header background for the "now" band: blue, peaking at the current hour
// and fading to plain white by ±NOW_SPAN hours. (Solid so the sticky header
// stays opaque over scrolling content.)
function nowBandColor(h: number, now: number | null): string | undefined {
  if (now === null) return undefined;
  const d = Math.abs(h - now);
  if (d > NOW_SPAN) return undefined;
  const a = 0.55 * (1 - d / NOW_SPAN);
  const mix = (c: number) => Math.round(255 + (c - 255) * a);
  return `rgb(${mix(37)}, ${mix(99)}, ${mix(235)})`;
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
  const [nowHour, setNowHour] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = SCROLL_TO_HOUR * HOUR_W;
    const h = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
    setNowHour(h % 24);
  }, []);

  function toggle(day: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

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
              <th
                key={h}
                className={`hour ${h % 6 === 0 ? "hour-mark" : ""} ${h === nowHour ? "now" : ""}`}
                style={{ background: nowBandColor(h, nowHour) }}
              >
                {hourLabel(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {forecast.tripDays.map((d) => (
            <DayGroup
              key={d.day}
              d={d}
              nowHour={nowHour}
              open={!collapsed.has(d.day)}
              onToggle={() => toggle(d.day)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayGroup({
  d,
  nowHour,
  open,
  onToggle,
}: {
  d: TripDayForecast;
  nowHour: number | null;
  open: boolean;
  onToggle: () => void;
}) {
  const [, mm, dd] = d.date.split("-");
  const dateLabel = `${Number(mm)}-${Number(dd)}`;
  return (
    <>
      <tr className="banner">
        <td className="banner-cell" colSpan={HOURS.length + 1} onClick={onToggle} aria-expanded={open}>
          <div className="banner-inner">
            <span className="b-pill">
              <span className="b-dnum">D{d.day}</span>
              <CaretDown size={11} weight="bold" className={`b-caret ${open ? "" : "closed"}`} />
            </span>
            <div className="b-body">
              <span className="b-date">
                {d.weekday} {dateLabel}
              </span>
              <span className="b-stats">
                <Path size={11} weight="bold" /> {d.miles} mi
                <Mountains size={11} weight="bold" /> {d.elevationFt.toLocaleString()} ft
              </span>
              <DaySummaryChip d={d} />
            </div>
          </div>
        </td>
      </tr>
      {open &&
        (d.available ? (
          <>
            <TownRow town={d.start} role="start" nowHour={nowHour} />
            <TownRow town={d.end} role="end" nowHour={nowHour} />
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
        ))}
    </>
  );
}

function DaySummaryChip({ d }: { d: TripDayForecast }) {
  if (!d.summary) return null;
  const { key, color } = conditionIcon(d.summary.code, d.summary.maxPop / 100);
  const Icon = ICONS[key];
  return (
    <span className="b-wx">
      <Icon size={15} weight="fill" color={color} />
      {d.summary.maxPop >= 10 && (
        <span className="b-rain">
          <Drop size={12} weight="fill" /> {d.summary.maxPop}%
        </span>
      )}
    </span>
  );
}

function townRange(t: TownDay): { lo: number; hi: number } | null {
  const temps = Object.values(t.byHour).map((p) => p.temp);
  if (temps.length === 0) return null;
  return { lo: Math.min(...temps), hi: Math.max(...temps) };
}

function TownRow({ town, role, nowHour }: { town: TownDay; role: "start" | "end"; nowHour: number | null }) {
  const range = townRange(town);
  return (
    <tr className="town-row">
      <th className="town" data-role={role}>
        <span className="t-name">{town.name}</span>
        {range && (
          <span className="t-range">
            {range.lo}–{range.hi}°
          </span>
        )}
        <span className="t-tag">{role}</span>
      </th>
      {HOURS.map((h) => (
        <Cell key={h} p={town.byHour[h]} mark={h % 6 === 0} isNow={h === nowHour} />
      ))}
    </tr>
  );
}

function Cell({ p, mark, isNow }: { p: ForecastPoint | undefined; mark: boolean; isNow: boolean }) {
  const cls = `cell ${mark ? "mark" : ""} ${isNow ? "now" : ""}`;
  if (!p) {
    return (
      <td className={cls}>
        <span className="dash">·</span>
      </td>
    );
  }
  const { key, color } = conditionIcon(p.weatherCode, p.pop);
  const Icon = ICONS[key];
  const { bg, fg } = tempColorScale(p.temp);
  const pop = Math.round(p.pop * 100);
  const windy = isWindy(p.windSpeed);
  const title =
    `${p.temp}°F (feels ${p.feelsLike}°) · ${pop}% rain · ` +
    `wind ${p.windSpeed} mph from ${windCompass(p.windDeg)}${p.windGust ? ` (gust ${p.windGust})` : ""} · ` +
    `${p.humidity}% humidity`;
  return (
    <td className={cls} style={{ background: popTint(p.pop) }} title={title}>
      <Icon className="c-icon" size={15} weight="fill" color={color} />
      <span className="temp" style={{ background: bg, color: fg }}>
        {p.temp}°
      </span>
      <span className={`rain ${pop >= 40 ? "rain-hi" : ""}`}>
        <Drop size={9} weight="fill" /> {pop}%
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
        <Waves size={9} weight="bold" /> {p.humidity}%
      </span>
    </td>
  );
}
