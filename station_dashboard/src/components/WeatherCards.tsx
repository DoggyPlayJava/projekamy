import React from 'react';
import { Thermometer, Sun, Moon, Volume2, VolumeX, ShieldCheck, Zap, Flame, Wind } from 'lucide-react';
import type { WeatherStationStatus } from '../types';

interface WeatherCardsProps {
  status: WeatherStationStatus;
}

export const WeatherCards: React.FC<WeatherCardsProps> = ({ status }) => {
  // 1. Temperature metrics
  const temp = status.temperature_c ?? 28;
  const isExtremeHeat = temp >= 35 || status.heat_alert;
  const isWarm = temp >= 30 && temp < 35;
  const isCool = temp < 24;

  const tempStatusText = isExtremeHeat
    ? 'Haba Melampau!'
    : isWarm
    ? 'Cuaca Panas'
    : isCool
    ? 'Suhu Sejuk'
    : 'Suhu Selesa';

  const tempBadgeColor = isExtremeHeat
    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    : isWarm
    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

  // 2. Air Humidity metrics
  const humidity = status.air_humidity_pct ?? 65;
  const isVeryDry = humidity < 40;
  const isHumid = humidity >= 70;
  const humidityStatusText = isVeryDry
    ? 'Udara Kering (<40%)'
    : isHumid
    ? 'Udara Lembap'
    : 'Selesa (Optimum)';

  const humidityBadgeColor = isVeryDry
    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    : isHumid
    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30'
    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

  // 3. Heat Index metrics
  const heatIndex = status.heat_index_c ?? (temp + (humidity > 60 ? 1.5 : 0.5));
  const isHeatIndexDanger = heatIndex >= 38;
  const isHeatIndexCaution = heatIndex >= 32 && heatIndex < 38;

  const heatIndexText = isHeatIndexDanger
    ? 'Bahaya Haba!'
    : isHeatIndexCaution
    ? 'Berjaga-jaga'
    : 'Zon Normal';

  const heatIndexBadge = isHeatIndexDanger
    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
    : isHeatIndexCaution
    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

  // Radial math for Humidity Gauge
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const humidityOffset = circumference - (humidity / 100) * circumference;
  const humidityStroke = isVeryDry
    ? '#f43f5e' // rose
    : isHumid
    ? '#0284c7' // cyan/sky
    : '#10b981'; // emerald

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* 1. SUHU UDARA CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        isExtremeHeat
          ? 'border-rose-500/60 shadow-rose-500/15 shadow-xl'
          : isWarm
          ? 'border-amber-500/40 shadow-amber-500/10 shadow-lg'
          : 'border-slate-200 dark:border-white/10'
      }`}>
        {isExtremeHeat && (
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/15 via-transparent to-transparent pointer-events-none animate-pulse" />
        )}

        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
              isExtremeHeat
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
            }`}>
              DHT11 Suhu Udara
            </span>
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
              GPIO 33
            </span>
          </div>

          {/* Primary Stat */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suhu Semasa</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h3 className={`text-3xl font-black tracking-tight ${
                  isExtremeHeat ? 'text-rose-600 dark:text-rose-400' : isWarm ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {temp.toFixed(1)}°
                </h3>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">C</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Zon selesa: <span className="text-emerald-600 dark:text-emerald-400 font-bold">24°C - 32°C</span>
              </p>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
              isExtremeHeat
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20'
                : isWarm
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-lg'
                : 'bg-rose-50 dark:bg-slate-800/80 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-white/5'
            }`}>
              {isExtremeHeat ? (
                <Flame className="w-7 h-7 text-rose-600 dark:text-rose-400 animate-bounce" />
              ) : (
                <Thermometer className="w-7 h-7" />
              )}
              {isExtremeHeat && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
          </div>
        </div>

        {/* Temperature Progress Indicator */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-500 dark:text-slate-400">Klasifikasi Haba:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tempBadgeColor}`}>
              {tempStatusText}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300/60 dark:border-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExtremeHeat
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(Math.max((temp / 45) * 100, 10), 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-rose-500 dark:text-rose-400" />
            Ambang amaran: &gt; 35.0°C
          </p>
        </div>
      </div>

      {/* 2. KELEMBAPAN RELATIF UDARA CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        isVeryDry
          ? 'border-rose-500/50 shadow-rose-500/10 shadow-xl'
          : 'border-slate-200 dark:border-white/10'
      }`}>
        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              DHT11 Kelembapan
            </span>
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
              GPIO 33
            </span>
          </div>

          {/* Radial Circular Gauge for Humidity */}
          <div className="flex items-center justify-center my-3 relative">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke={humidityStroke}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={humidityOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
                />
              </svg>

              {/* Gauge Center */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <Wind className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 mb-0.5" />
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{humidity}%</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">RH UDARA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Humidity State Badge */}
        <div>
          <div className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 ${humidityBadgeColor}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{humidityStatusText}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
            Ambang amaran kering: &lt; 40% RH
          </p>
        </div>
      </div>

      {/* 3. LDR LIGHT & SOLAR SENSOR CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        status.is_night
          ? 'border-indigo-500/40 shadow-indigo-500/10 shadow-lg'
          : 'border-amber-500/40 shadow-amber-500/10 shadow-lg'
      }`}>
        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
              status.is_night 
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' 
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
            }`}>
              Sensor Cahaya LDR
            </span>
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
              GPIO 34 (AO)
            </span>
          </div>

          {/* Icon & Primary Stat */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Keadaan Persekitaran</p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${
                status.is_night ? 'text-indigo-600 dark:text-indigo-300' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {status.is_night ? 'Waktu Malam' : 'Waktu Siang'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {status.is_night ? 'Gelap / Cahaya rendah' : 'Cahaya suria dikesan'}
              </p>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              status.is_night
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/15'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/15'
            }`}>
              {status.is_night ? (
                <Moon className="w-7 h-7 text-indigo-600 dark:text-indigo-300 animate-pulse" />
              ) : (
                <Sun className="w-7 h-7 text-amber-500 dark:text-amber-400 animate-spin" style={{ animationDuration: '16s' }} />
              )}
            </div>
          </div>
        </div>

        {/* Light Level Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-500 dark:text-slate-400">Kecerahan Cahaya:</span>
            <span className={status.is_night ? 'text-indigo-600 dark:text-indigo-300 font-mono font-bold' : 'text-amber-600 dark:text-amber-400 font-mono font-bold'}>
              {status.light_pct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300/60 dark:border-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status.is_night 
                  ? 'bg-gradient-to-r from-slate-400 to-indigo-500' 
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${status.light_pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            Ambang malam: &lt; 25% lux kecerahan
          </p>
        </div>
      </div>

      {/* 4. INDEKS HABA & PENGGERA BUZZER CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        status.buzzer_active 
          ? 'border-rose-500/60 shadow-rose-500/20 shadow-xl' 
          : 'border-slate-200 dark:border-white/10'
      }`}>
        {status.buzzer_active && (
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/15 via-transparent to-transparent pointer-events-none animate-pulse" />
        )}

        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
              status.buzzer_active 
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30' 
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
            }`}>
              Indeks Haba & Penggera
            </span>
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
              GPIO 18 (Active LOW)
            </span>
          </div>

          {/* Primary Stat: Heat Index & Buzzer Status */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suhu Dirasai (*Heat Index*)</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {Number(heatIndex).toFixed(1)}°
                </h3>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">C</span>
                <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded border ${heatIndexBadge}`}>
                  {heatIndexText}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1">
                Buzzer: <span className={status.buzzer_active ? 'text-rose-600 dark:text-rose-400 font-black animate-pulse' : 'text-slate-600 dark:text-slate-300'}>
                  {status.buzzer_active ? 'BUNYI AKTIF!' : status.buzzer_enabled ? 'Sedia (Standby)' : 'Disenyapkan'}
                </span>
              </p>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
              status.buzzer_active 
                ? 'bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/50 shadow-xl shadow-rose-500/20' 
                : !status.buzzer_enabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5'
                : 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-white/5'
            }`}>
              {status.buzzer_enabled ? (
                <Volume2 className={`w-7 h-7 ${status.buzzer_active ? 'animate-bounce' : ''}`} />
              ) : (
                <VolumeX className="w-7 h-7 text-slate-400 dark:text-slate-500" />
              )}
              {status.buzzer_active && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
          </div>
        </div>

        {/* Reason Box */}
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Status Penggera Semasa:</p>
          <div className={`px-3 py-2 rounded-xl border text-xs font-black truncate ${
            status.buzzer_active
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/5'
          }`}>
            {status.buzzer_reason || 'STANDBY'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-rose-500 dark:text-rose-400" />
            Ambang amaran: Suhu &gt; 35°C | Udara &lt; 40%
          </p>
        </div>
      </div>
    </div>
  );
};
