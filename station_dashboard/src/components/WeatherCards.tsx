import React from 'react';
import { CloudRain, Sun, Moon, Droplets, Volume2, VolumeX, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* 1. RAINDROP SENSOR CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        status.rain_detected 
          ? 'border-cyan-500/50 shadow-cyan-500/10 shadow-xl' 
          : 'border-white/10'
      }`}>
        {status.rain_detected && (
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent pointer-events-none animate-pulse" />
        )}

        <div>
          {/* Card Meta Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Sensor Hujan
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
              GPIO 33
            </span>
          </div>

          {/* Icon & Primary Stat */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400">Keadaan Hujan</p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${
                status.rain_detected ? 'text-cyan-400' : 'text-slate-200'
              }`}>
                {status.rain_detected ? 'Hujan Dikesan!' : 'Tiada Hujan'}
              </h3>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
              status.rain_detected 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-800/80 text-slate-400 border border-white/5'
            }`}>
              <CloudRain className={`w-7 h-7 ${status.rain_detected ? 'animate-bounce' : ''}`} />
              {status.rain_detected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>
          </div>
        </div>

        {/* Rain Intensity Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-400">Keamatan Titisan:</span>
            <span className={status.rain_detected ? 'text-cyan-300' : 'text-slate-500'}>
              {status.rain_intensity_pct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 border border-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-500"
              style={{ width: `${status.rain_intensity_pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            Ambang amaran: &lt; 3200 ADC
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
              Sensor Cahaya
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
              GPIO 34
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
            <span className={status.is_night ? 'text-indigo-300' : 'text-amber-400'}>
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
            Pengesanan malam: &lt; 25% lux
          </p>
        </div>
      </div>

      {/* 3. SOIL MOISTURE SENSOR CARD */}
      <div className={`glass-panel glass-panel-hover rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${
        isSensorFault
          ? 'border-rose-500/50 shadow-rose-500/10 shadow-xl'
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
                {status.moisture_pct >= 60 ? 'Tanah Lembap (Optimal)' : status.moisture_pct >= 30 ? 'Kelembapan Sederhana' : 'Tanah Terlalu Kering!'}
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
          <p className="text-xs font-bold text-slate-400 mb-1">Punca Status:</p>
          <div className={`px-3 py-2 rounded-xl border text-xs font-black truncate ${
            status.buzzer_active
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-800/80 text-slate-400 border-white/5'
          }`}>
            {status.buzzer_reason}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            Ambang amaran: Hujan &gt; 0% | Kering &lt; 20%
          </p>
        </div>
      </div>
    </div>
  );
};
