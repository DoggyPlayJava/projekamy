import React from 'react';
import { Thermometer, Sun, Moon, Droplets, Volume2, VolumeX, AlertTriangle, ShieldCheck, Zap, Flame, Wind } from 'lucide-react';
import type { WeatherStationStatus } from '../types';

interface WeatherCardsProps {
  status: WeatherStationStatus;
}

export const WeatherCards: React.FC<WeatherCardsProps> = ({ status }) => {
  // Moisture radial math
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const isSensorFault = status.sensor_connected === false;
  const moistureOffset = isSensorFault
    ? circumference * 0.75
    : circumference - (status.moisture_pct / 100) * circumference;

  const moistureStroke = isSensorFault
    ? '#64748b' // slate-500
    : status.moisture_pct >= 60
    ? '#10b981' // emerald-500
    : status.moisture_pct >= 30
    ? '#f59e0b' // amber-500
    : '#f43f5e'; // rose-500

  // Temperature status calculation
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
    : 'Suhu Optimum';

  const tempBadgeColor = isExtremeHeat
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    : isWarm
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* 1. DHT11 TEMPERATURE & AIR HUMIDITY CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        isExtremeHeat
          ? 'border-rose-500/60 shadow-rose-500/20 shadow-2xl'
          : isWarm
          ? 'border-amber-500/40 shadow-amber-500/10 shadow-xl'
          : 'border-white/10'
      }`}>
        {isExtremeHeat && (
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/15 via-transparent to-transparent pointer-events-none animate-pulse" />
        )}

        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
              isExtremeHeat
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
            }`}>
              DHT11 Mikroklimat
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
              GPIO 33
            </span>
          </div>

          {/* Icon & Primary Stat (Temperature & Humidity) */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400">Suhu & Kelembapan Udara</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h3 className={`text-3xl font-black tracking-tight ${
                  isExtremeHeat ? 'text-rose-400' : isWarm ? 'text-amber-400' : 'text-slate-100'
                }`}>
                  {temp.toFixed(1)}°
                </h3>
                <span className="text-sm font-bold text-slate-400">C</span>
              </div>
              <p className="text-xs font-semibold text-slate-300 mt-0.5 flex items-center gap-1">
                <Wind className="w-3 h-3 text-cyan-400" />
                <span>Udara: <strong className="text-white font-mono">{status.air_humidity_pct ?? 60}% RH</strong></span>
              </p>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
              isExtremeHeat
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20'
                : isWarm
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg'
                : 'bg-slate-800/80 text-teal-400 border border-white/5'
            }`}>
              {isExtremeHeat ? (
                <Flame className="w-7 h-7 text-rose-400 animate-bounce" />
              ) : (
                <Thermometer className="w-7 h-7" />
              )}
              {isExtremeHeat && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-400 animate-ping" />
              )}
            </div>
          </div>
        </div>

        {/* Temperature State Badge & Comfort Indicator */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-400">Status Haba:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tempBadgeColor}`}>
              {tempStatusText}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 border border-white/5 overflow-hidden">
            {/* Visual gradient 0 to 50 C */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExtremeHeat
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(Math.max((temp / 45) * 100, 10), 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Ambang amaran haba: &gt; 35.0°C
          </p>
        </div>
      </div>

      {/* 2. LDR LIGHT SENSOR CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        status.is_night
          ? 'border-indigo-500/40 shadow-indigo-500/10 shadow-xl'
          : 'border-amber-500/40 shadow-amber-500/10 shadow-xl'
      }`}>
        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
              status.is_night 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              Sensor Cahaya LDR
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
              GPIO 34 (AO)
            </span>
          </div>

          {/* Icon & Primary Stat */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400">Keadaan Sekitar</p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${
                status.is_night ? 'text-indigo-300' : 'text-amber-400'
              }`}>
                {status.is_night ? 'Waktu Malam' : 'Waktu Siang'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Pin AO digunakan (DO dibiarkan kosong)
              </p>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              status.is_night
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/20'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/20'
            }`}>
              {status.is_night ? (
                <Moon className="w-7 h-7 text-indigo-300 animate-pulse" />
              ) : (
                <Sun className="w-7 h-7 text-amber-400 animate-spin" style={{ animationDuration: '16s' }} />
              )}
            </div>
          </div>
        </div>

        {/* Light Level Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-400">Kecerahan Cahaya:</span>
            <span className={status.is_night ? 'text-indigo-300 font-mono' : 'text-amber-400 font-mono'}>
              {status.light_pct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 border border-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status.is_night 
                  ? 'bg-gradient-to-r from-slate-700 to-indigo-500' 
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${status.light_pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Ambang malam: &lt; 25% lux kecerahan
          </p>
        </div>
      </div>

      {/* 3. SOIL MOISTURE SENSOR CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        isSensorFault
          ? 'border-rose-500/50 shadow-rose-500/10 shadow-xl'
          : status.moisture_pct < 20
          ? 'border-rose-500/40 shadow-rose-500/10 shadow-xl'
          : status.moisture_pct < 30
          ? 'border-amber-500/40 shadow-amber-500/10 shadow-xl'
          : 'border-emerald-500/30 shadow-emerald-500/10 shadow-xl'
      }`}>
        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Kelembapan Tanah
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
              GPIO 32
            </span>
          </div>

          {/* Radial Circular Gauge */}
          <div className="flex items-center justify-center my-3 relative">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="#1e293b"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke={moistureStroke}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={moistureOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
                />
              </svg>

              {/* Gauge Center */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                {isSensorFault ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 mb-0.5 animate-pulse" />
                    <span className="text-xl font-black text-rose-400">--</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">Terputus</span>
                  </>
                ) : (
                  <>
                    <Droplets className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                    <span className="text-xl font-black text-white tracking-tight">{status.moisture_pct}%</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Lembap</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Moisture State Badge */}
        <div>
          {isSensorFault ? (
            <div className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Wayar Sensor Tercabut</span>
            </div>
          ) : (
            <div className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 ${
              status.moisture_pct >= 60
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : status.moisture_pct >= 30
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {status.moisture_pct >= 60 
                  ? 'Tanah Lembap (Optimal)' 
                  : status.moisture_pct >= 30 
                  ? 'Kelembapan Sederhana' 
                  : 'Tanah Terlalu Kering! (<20%)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. BUZZER AUDIO ALERT CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        status.buzzer_active 
          ? 'border-rose-500/60 shadow-rose-500/20 shadow-2xl' 
          : 'border-white/10'
      }`}>
        {status.buzzer_active && (
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/20 via-transparent to-transparent pointer-events-none animate-pulse" />
        )}

        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
              status.buzzer_active 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                : 'bg-slate-700/50 text-slate-300 border-white/10'
            }`}>
              Penggera Audio
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
              GPIO 18
            </span>
          </div>

          {/* Icon & Primary Stat */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400">Status Buzzer</p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${
                status.buzzer_active ? 'text-rose-400 animate-pulse' : 'text-slate-200'
              }`}>
                {status.buzzer_active ? 'BUNYI AKTIF!' : status.buzzer_enabled ? 'Sedia (Standby)' : 'Disenyapkan'}
              </h3>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
              status.buzzer_active 
                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-xl shadow-rose-500/30' 
                : !status.buzzer_enabled
                ? 'bg-slate-800 text-slate-500 border border-white/5'
                : 'bg-slate-800 text-emerald-400 border border-white/5'
            }`}>
              {status.buzzer_enabled ? (
                <Volume2 className={`w-7 h-7 ${status.buzzer_active ? 'animate-bounce' : ''}`} />
              ) : (
                <VolumeX className="w-7 h-7 text-slate-500" />
              )}
              {status.buzzer_active && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-400 animate-ping" />
              )}
            </div>
          </div>
        </div>

        {/* Reason Box */}
        <div>
          <p className="text-xs font-bold text-slate-400 mb-1">Punca Status Semasa:</p>
          <div className={`px-3 py-2 rounded-xl border text-xs font-black truncate ${
            status.buzzer_active
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-800/80 text-slate-400 border-white/5'
          }`}>
            {status.buzzer_reason || 'STANDBY'}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-rose-400" />
            Ambang amaran: Haba &gt; 35°C | Kering &lt; 20%
          </p>
        </div>
      </div>
    </div>
  );
};
