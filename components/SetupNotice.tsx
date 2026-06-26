export default function SetupNotice({ reason }: { reason?: "missing-key" | "invalid-key" }) {
  const invalid = reason === "invalid-key";
  return (
    <main className="setup">
      <h1>🚲 GAP / C&O Weather</h1>
      {invalid ? (
        <p>
          Your key is set, but OpenWeather is returning <strong>401 Invalid API key</strong>. Brand-new
          keys take <strong>up to ~2 hours to activate</strong> — if you just created it, wait and
          reload. Otherwise double-check the value below.
        </p>
      ) : (
        <p>Almost there — this app needs a free OpenWeather API key.</p>
      )}
      <ol>
        <li>
          Create a free account at{" "}
          <a href="https://openweathermap.org/api" target="_blank" rel="noreferrer">
            openweathermap.org/api
          </a>{" "}
          (no credit card needed).
        </li>
        <li>
          Copy your API key from the <strong>API keys</strong> tab. New keys can take an hour or two
          to activate.
        </li>
        <li>
          Set it as an environment variable named <code>OPENWEATHER_API_KEY</code> — locally in{" "}
          <code>.env.local</code>, or in your Vercel project settings.
        </li>
        <li>Restart / redeploy.</li>
      </ol>
      <p className="muted">
        Optional: set <code>TRIP_START_DATE</code> (YYYY-MM-DD) to label forecast days as “Day 1”,
        “Day 2”, etc.
      </p>
    </main>
  );
}
