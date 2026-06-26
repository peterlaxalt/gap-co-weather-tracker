import { getTripForecast } from "@/lib/weather";
import { tripStartDate } from "@/lib/trip";
import WeatherView from "@/components/WeatherView";
import SetupNotice from "@/components/SetupNotice";

// Re-fetch at most every 30 min; matches the per-city fetch cache.
export const revalidate = 1800;

export default async function Page() {
  const forecast = await getTripForecast();

  if (forecast.error === "missing-key" || forecast.error === "invalid-key") {
    return <SetupNotice reason={forecast.error} />;
  }

  return <WeatherView forecast={forecast} hasTripDates={Boolean(tripStartDate())} />;
}
