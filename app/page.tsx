import { getTripForecast } from "@/lib/weather";
import WeatherView from "@/components/WeatherView";

// Re-fetch at most every 30 min; matches the per-city fetch cache.
export const revalidate = 1800;

export default async function Page() {
  const forecast = await getTripForecast();
  return <WeatherView forecast={forecast} />;
}
