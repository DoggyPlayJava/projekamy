import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSun,
  CloudLightning,
  Droplets,
  Wind,
  Umbrella,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
  rainProbabilityNextHours: { time: string; prob: number }[];
  currentRainMm: number;
}

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatedRain, setSimulatedRain] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Kuantan, Pahang (POLISAS coordinates)
  const LAT = 3.8168;
  const LON = 103.3317;

  const fetchWeather = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability,weather_code&timezone=Asia%2FSingapore&forecast_days=1`
      );

      if (!res.ok) throw new Error('Gagal memuat turun data cuaca Open-Meteo');

      const data = await res.json();
      const current = data.current;
      const hourly = data.hourly;

      // Extract next 4 hours probability
      const currentHour = new Date().getHours();
      const next4Hours = [];
      for (let i = 0; i < 4; i++) {
        const targetHour = (currentHour + i) % 24;
        const timeLabel = `${String(targetHour).padStart(2, '0')}:00`;
        const prob = hourly.precipitation_probability[targetHour] ?? 10;
        next4Hours.push({ time: timeLabel, prob });
      }

      setWeather({
        temperature: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        weatherCode: current.weather_code,
        windSpeed: Math.round(current.wind_speed_10m),
        isDay: current.is_day === 1,
        rainProbabilityNextHours: next4Hours,
        currentRainMm: current.precipitation,
      });
      setError(null);
    } catch (err: any) {
      console.warn('Weather fetch warning:', err);
      // Fallback data for smooth presentation
      setWeather({
        temperature: 28,
        humidity: 82,
        weatherCode: 2,
        windSpeed: 12,
        isDay: true,
        rainProbabilityNextHours: [
          { time: '14:00', prob: 25 },
          { time: '15:00', prob: 40 },
          { time: '16:00', prob: 75 },
          { time: '17:00', prob: 80 },
        ],
        currentRainMm: 0,
      });
      setError('Mod Luar Talian (Data Anggaran Kuantan)');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Weather description & icon helper
  const getWeatherInfo = (code: number, isDay: boolean) => {
    if (code === 0) {
      return {
        label: isDay ? 'Cerah & Panas' : 'Malam Jelas',
        icon: Sun,
        color: 'text-amber-500',
        bg: 'bg-amber-50',
      };
    }
    if (code >= 1 && code <= 3) {
      return {
        label: 'Mendung Berawan',
        icon: CloudSun,
        color: 'text-sky-500',
        bg: 'bg-sky-50',
      };
    }
    if (code >= 51 && code <= 65) {
      return {
        label: 'Hujan Mengalir',
        icon: CloudRain,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
      };
    }
    if (code >= 80 && code <= 82) {
      return {
        label: 'Hujan Lebat',
        icon: CloudRain,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
      };
    }
    if (code >= 95) {
      return {
        label: 'Ribut Petir',
        icon: CloudLightning,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      };
    }
    return {
      label: 'Mendung',
      icon: Cloud,
      color: 'text-slate-500',
      bg: 'bg-slate-50',
    };
  };

  // Check if rain probability in upcoming hours is >= 70%
  const highestProbUpcoming = weather?.rainProbabilityNextHours.reduce(
    (max, cur) => (cur.prob > max ? cur.prob : max),
    0
  ) ?? 0;

  // Actual or simulated rain state
  const isRainImminent =
    simulatedRain !== null
      ? simulatedRain
      : (weather && (weather.currentRainMm > 0 || highestProbUpcoming >= 70));

  const weatherInfo = weather ? getWeatherInfo(weather.weatherCode, weather.isDay) : null;
  const WeatherIcon = weatherInfo ? weatherInfo.icon : Sun;

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Decorative ambient glow */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800">
                  Ramalan Cuaca Tempatan
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 inline-flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  Kuantan, Pahang
                </span>
                {error && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {error}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Penyelarasan pintar jadual pengairan berasaskan data Open-Meteo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchWeather}
              disabled={isRefreshing}
              title="Kemaskini data cuaca"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Current Weather Snapshot */}
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Memuat turun data satelit kaji cuaca Kuantan...
          </div>
        ) : weather ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/60 border border-white/80 mb-4">
              {/* Temperature & Condition */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl ${weatherInfo?.bg} ${weatherInfo?.color} flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <WeatherIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-800">
                      {weather.temperature}°C
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {weatherInfo?.label}
                  </span>
                </div>
              </div>

              {/* Humidity */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-100">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">
                    Kelembapan Udara
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {weather.humidity}%
                  </span>
                </div>
              </div>

              {/* Wind Speed */}
              <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-100">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">
                    Kelajuan Angin
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {weather.windSpeed} km/j
                  </span>
                </div>
              </div>
            </div>

            {/* Hourly Rain Probability Forecast Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-600 flex items-center gap-1.5">
                  <Umbrella className="w-3.5 h-3.5 text-blue-500" />
                  Kebarangkalian Hujan (4 Jam Akan Datang):
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Maksimum: {highestProbUpcoming}%
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {weather.rainProbabilityNextHours.map((slot, idx) => {
                  const isHigh = slot.prob >= 70;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl text-center border transition-all ${
                        isHigh
                          ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-sm'
                          : 'bg-white/40 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-400">
                        {slot.time}
                      </div>
                      <div
                        className={`text-sm font-extrabold mt-0.5 ${
                          isHigh ? 'text-blue-700' : 'text-slate-800'
                        }`}
                      >
                        {slot.prob}%
                      </div>
                      <div className="w-full bg-slate-200/70 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isHigh ? 'bg-blue-600' : 'bg-slate-400'
                          }`}
                          style={{ width: `${slot.prob}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Smart Weather-Aware Decision Callout */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isRainImminent
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50/80 border-blue-200/80 text-blue-950'
              : 'bg-gradient-to-r from-emerald-50 to-teal-50/80 border-emerald-200/80 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`p-1.5 rounded-xl mt-0.5 ${
                isRainImminent
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isRainImminent ? (
                <Umbrella className="w-4 h-4 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-wide uppercase">
                  {isRainImminent
                    ? 'Logik Pintar: Penjimatan Air Aktif'
                    : 'Logik Pintar: Operasi Normal'}
                </span>
                {isRainImminent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800 animate-pulse">
                    Auto-Skip Siraman
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 font-medium leading-relaxed">
                {isRainImminent
                  ? 'Siraman ditangguhkan secara automatik kerana hujan diramalkan tiba tidak lama lagi (>70%). Mengelakkan pembaziran air dan limpahan tanah!'
                  : 'Cuaca cerah/kering. Sistem beroperasi mengikut ambang kelembapan tanah sebenar setiap pasu.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Viva Simulation Button Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 font-medium">Ujian Simulasi Cuaca Viva:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSimulatedRain(false)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              simulatedRain === false
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            ☀️ Cerah
          </button>
          <button
            onClick={() => setSimulatedRain(true)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              simulatedRain === true
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            🌧️ Hujan &gt; 80%
          </button>
          {simulatedRain !== null && (
            <button
              onClick={() => setSimulatedRain(null)}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
