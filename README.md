# 🚲 GAP / C&O Weather Tracker

A mobile-first, hour-by-hour weather tracker for a GAP & C&O Canal bike trip from
**Pittsburgh → Washington, DC**. Built so you can scan the whole trail for a given
day and compare towns side by side.

- **Cities as rows, hours as columns.** Sticky town column, swipe the hours across.
- Each cell shows **temperature, conditions, chance of rain, wind (dir + mph), and humidity**.
- Blue tint = higher rain chance; bold wind = 15+ mph (notable headwind).
- Day tabs across the forecast window (~14 days out).
- Powered by the free, **keyless** [Open-Meteo API](https://open-meteo.com/) — no
  signup, no API key, true hourly data.

## Towns tracked

Pittsburgh → Smithton → Ohiopyle → Frostburg → Little Orleans → Sharpsburg → DC
(each is the end of one day and the start of the next — the overlap you want to compare).

Edit `lib/trip.ts` to change towns, coordinates, or the day-by-day legs.

## Run it

No API key needed. Just:

```
npm install
npm run dev
```

Open http://localhost:3000.

Optionally set a trip start date to label forecast days as "Day 1", "Day 2", … and
highlight each day's start/end towns. Copy `.env.example` to `.env.local` and set:

```
TRIP_START_DATE=2026-06-26
```

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import it at [vercel.com/new](https://vercel.com/new) — it auto-detects Next.js.
3. (Optional) add `TRIP_START_DATE` under **Project → Settings → Environment Variables**.
4. Deploy. You'll get a public link to share — no secrets to configure.

Forecast data is cached and revalidated every 30 minutes.

## Notes

- Times are shown in Eastern Time (the whole trail is in ET).
- Forecasts extend ~14 days out; open the app within that window of each leg for the
  most reliable numbers (precision improves as the date gets closer).
