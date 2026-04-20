import { useEffect, useState } from "react";

const weatherCodeMap = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mostly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌦️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Heavy hail storm", icon: "⛈️" },
};

function formatLocalDate(timezone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date());
}

function formatHour(value, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(new Date(value));
}

function formatLocation(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function getThemeFromCode(code) {
  if (code === 0 || code === 1) return "theme-clear";
  if (code === 2 || code === 3) return "theme-clouds";
  if (code === 45 || code === 48) return "theme-fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return "theme-rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return "theme-snow";
  if (code >= 95) return "theme-storm";
  return "";
}

async function fetchWeatherForPlace(place) {
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`,
  );

  const weatherData = await weatherRes.json();
  const currentCode = weatherData.current.weather_code;
  const currentMeta = weatherCodeMap[currentCode] || {
    label: "Weather update",
    icon: "🌍",
  };

  return {
    place: formatLocation(place),
    admin: place.admin1 || "",
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: weatherData.timezone,
    current: {
      temp: Math.round(weatherData.current.temperature_2m),
      feelsLike: Math.round(weatherData.current.apparent_temperature),
      humidity: weatherData.current.relative_humidity_2m,
      wind: Math.round(weatherData.current.wind_speed_10m),
      code: currentCode,
      label: currentMeta.label,
      icon: currentMeta.icon,
    },
    hourly: weatherData.hourly.time.slice(0, 6).map((time, index) => {
      const code = weatherData.hourly.weather_code[index];
      const meta = weatherCodeMap[code] || { icon: "🌤️", label: "Weather" };
      return {
        time,
        temp: Math.round(weatherData.hourly.temperature_2m[index]),
        icon: meta.icon,
        label: meta.label,
      };
    }),
  };
}

export default function App() {
  const [query, setQuery] = useState("India");
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState(
    "Search a city, state, or country to see live weather.",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchLocations();
  }, []);

  useEffect(() => {
    const theme = weather ? getThemeFromCode(weather.current.code) : "";
    document.body.className = theme;

    return () => {
      document.body.className = "";
    };
  }, [weather]);

  async function searchLocations(cityName) {
    const cleaned = cityName.trim();
    if (!cleaned) {
      setStatus("Please enter a location name.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Searching matching locations...");

      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleaned)}&count=8&language=en&format=json`,
      );
      const geoData = await geoRes.json();

      if (!geoData.results || !geoData.results.length) {
        throw new Error("No matching city, state, or country found.");
      }

      await selectLocation(geoData.results[0]);
    } catch (error) {
      setWeather(null);
      setStatus(
        error.message || "Something went wrong while searching locations.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectLocation(place) {
    try {
      setLoading(true);
      setStatus(`Fetching live weather for ${formatLocation(place)}...`);

      const weatherCard = await fetchWeatherForPlace(place);
      setWeather(weatherCard);
      setStatus(`Showing live weather for ${formatLocation(place)}.`);
    } catch (error) {
      setWeather(null);
      setStatus(error.message || "Could not load weather for this location.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    searchLocations(query);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="panel">
          <h1 className="headline">
            Live <span>Weather</span> Search
          </h1>

          <p className="subtext">
            Search any city, state, or country to see live weather.
          </p>

          <form className="search-wrap" onSubmit={handleSubmit}>
            <input
              className="search-input"
              type="text"
              placeholder="Search city, state, or country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="search-btn" type="submit">
              {loading ? "Loading..." : "Search Weather"}
            </button>
          </form>

          <div className="quick-tags">
            {["India", "London", "California", "Japan", "Dubai"].map((city) => (
              <button
                key={city}
                className="tag"
                type="button"
                onClick={() => {
                  setQuery(city);
                  searchLocations(city);
                }}
              >
                {city}
              </button>
            ))}
          </div>

          <div className="status">{status}</div>
        </div>

        <div className="panel summary-card">
          {weather ? (
            <>
              <div>
                <div className="summary-top">
                  <div>
                    <p className="eyebrow">Current Location</p>
                    <h2 className="place">{weather.place}</h2>
                    <p className="date">{formatLocalDate(weather.timezone)}</p>
                  </div>
                  <div className="weather-icon">{weather.current.icon}</div>
                </div>

                <div className="temp-row">
                  <div className="temp">{weather.current.temp}°C</div>
                  <div className="condition">{weather.current.label}</div>
                </div>
              </div>

              <div className="metrics">
                <div className="metric">
                  <span className="metric-label">Feels Like</span>
                  <span className="metric-value">
                    {weather.current.feelsLike}°C
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Humidity</span>
                  <span className="metric-value">
                    {weather.current.humidity}%
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Wind Speed</span>
                  <span className="metric-value">
                    {weather.current.wind} km/h
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Timezone</span>
                  <span className="metric-value">{weather.timezone}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty">
              <div>
                <strong>No weather loaded yet</strong>
                Search any location to show its live weather here.
              </div>
            </div>
          )}
        </div>
      </section>

      {weather && (
        <section className="bottom-grid">
          <div className="panel">
            <h3 className="section-title">Next Hours</h3>
            <div className="hourly-grid">
              {weather.hourly.map((hour) => (
                <div className="hour-card" key={hour.time}>
                  <div className="hour-time">
                    {formatHour(hour.time, weather.timezone)}
                  </div>
                  <div className="hour-icon">{hour.icon}</div>
                  <div className="hour-temp">{hour.temp}°C</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3 className="section-title">Location Details</h3>
            <div className="details-list">
              <div className="detail-item">
                <span className="detail-label">Region</span>
                <span className="detail-value">
                  {weather.admin || "Not available"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Country</span>
                <span className="detail-value">
                  {weather.country || "Not available"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Latitude</span>
                <span className="detail-value">
                  {weather.latitude.toFixed(2)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Longitude</span>
                <span className="detail-value">
                  {weather.longitude.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
