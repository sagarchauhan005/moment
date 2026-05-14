import { useEffect, useState } from "react";
import { Calendar, Target, Thermometer } from "lucide-react";
import { todayISO } from "@/lib/time";
import type { DailyLog, FocusState } from "@/types";

const WEATHER_CACHE_KEY = "__moment_weather_v1";
const WEATHER_TTL = 30 * 60 * 1000; // 30 min

interface WeatherData { temp: number; city: string; unit: "C" }

async function fetchWeather(): Promise<WeatherData> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 10 * 60 * 1000,
    })
  );
  const { latitude: lat, longitude: lon } = pos.coords;

  const [weatherRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    ),
  ]);

  const weather = await weatherRes.json();
  const geo = await geoRes.json();

  const temp = Math.round(weather.current.temperature_2m as number);
  const addr = geo.address ?? {};
  const city =
    addr.city ?? addr.town ?? addr.suburb ?? addr.village ?? addr.county ?? "Your location";

  return { temp, city, unit: "C" };
}

function useWeather() {
  const [data, setData] = useState<WeatherData | null>(() => {
    try {
      const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
      if (!raw) return null;
      const { value, fetchedAt } = JSON.parse(raw) as { value: WeatherData; fetchedAt: number };
      return Date.now() - fetchedAt < WEATHER_TTL ? value : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (data) return; // cache hit — don't re-fetch
    fetchWeather()
      .then((w) => {
        setData(w);
        sessionStorage.setItem(
          WEATHER_CACHE_KEY,
          JSON.stringify({ value: w, fetchedAt: Date.now() })
        );
      })
      .catch(() => null);
  }, []);

  return data;
}

export function StatsBar({
  dailyLogs,
  focus,
  tasksTodayCount,
}: {
  dailyLogs: DailyLog[];
  focus: FocusState;
  tasksTodayCount: number;
}) {
  const today = todayISO();
  const todayLog = dailyLogs.find((l) => l.date === today);
  const focusedMinutes = todayLog?.focusMinutes ?? 0;
  const weather = useWeather();

  const focusTimeLeft =
    focus.active && focus.session
      ? Math.max(0, Math.ceil((focus.session.endsAt - Date.now()) / 60000))
      : null;

  return (
    <div className="flex gap-7">
      <Stat
        Icon={Target}
        label="Focused Today"
        value={`${focusedMinutes}m`}
        sub={focusTimeLeft !== null ? `${focusTimeLeft}m left` : undefined}
      />
      <Stat Icon={Calendar} label="Today's Tasks" value={`${tasksTodayCount}`} />
      {weather && (
        <Stat
          Icon={Thermometer}
          label={weather.city}
          value={`${weather.temp}°${weather.unit}`}
        />
      )}
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof Target;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <Icon className="w-[15px] h-[15px] opacity-80" strokeWidth={1.5} />
        <span>{value}</span>
        {sub && <span className="text-white/50 text-[11px]">· {sub}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
