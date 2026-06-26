# 🚲 GAP / C&O Weather Tracker

A mobile-first, hour-by-hour weather tracker for a GAP & C&O Canal bike trip from
**Pittsburgh → Washington, DC**. Built so you can scan the whole trail for a given
day and compare towns side by side.

- **Cities as rows, hours as columns.** Sticky town column, swipe the hours across.
- Each cell shows **temperature, conditions, chance of rain, wind (dir + mph), and humidity**.
- Blue tint = higher rain chance; bold wind = 15+ mph headwind territory.
- Day tabs across the forecast window (the free API covers ~5 days out).
- Powered by the free [OpenWeather 5-day / 3-hour forecast API](https://openweathermap.org/forecast5).

## Towns tracked

Pittsburgh → Smithton → Ohiopyle → Frostburg → Little Orleans → Sharpsburg → DC
(each is the end of one day and the start of the next — the overlap you want to compare).

Edit `lib/trip.ts` to change towns, coordinates, or the day-by-day legs.

## Setup

1. Get a free API key at [openweathermap.org/api](https://openweathermap.org/api) — no
   credit card required. New keys can take an hour or two to activate.
2. Copy `.env.example` to `.env.local` and set your key:
   ```
   OPENWEATHER_API_KEY=your_key_here
   ```
   Optionally set `TRIP_START_DATE=YYYY-MM-DD` to label forecast days as "Day 1", "Day 2", …
   and highlight that day's start/end towns.
3. Install and run:
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import it at [vercel.com/new](https://vercel.com/new) — it auto-detects Next.js.
3. Add the environment variable `OPENWEATHER_API_KEY` (and optionally `TRIP_START_DATE`)
   in **Project → Settings → Environment Variables**.
4. Deploy. You'll get a public link to share.

Forecast data is cached and revalidated every 30 minutes, so you stay well within the
free tier's call limits.

## Notes

- Times are shown in Eastern Time (the whole trail is in ET).
- Forecasts only extend ~5 days out, so towns/days beyond that window show once they
  come into range. Open the app within ~5 days of each leg for live numbers.
