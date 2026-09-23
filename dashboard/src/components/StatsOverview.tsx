import React from 'react';
import { Droplet, Activity, CheckCircle2, Waves, Gauge, GlassWater } from 'lucide-react';
import type { PotStatus, WateringLog } from '../types';

interface StatsOverviewProps {
  pots: PotStatus[];
  wateringLogs: WateringLog[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ pots, wateringLogs }) => {
  // Calculate average moisture
  const avgMoisture = pots.length > 0
    ? Math.round(pots.reduce((acc, p) => acc + p.moisture_pct, 0) / pots.length)
    : 0;

  // Count active pumps
  const activePumpsCount = pots.filter((p) => p.pump_state).length;

  // Count today's watering events & volumetric water used
  const today = new Date().toDateString();
  const todayLogs = wateringLogs.filter(
    (log) => new Date(log.watered_at).toDateString() === today
  );
  const todayWateringCount = todayLogs.length;

  // 20 ml/s (~1.2L/min) standard 5V submersible pump flow estimation
  const totalSecondsToday = todayLogs.reduce(
    (acc, log) => acc + (log.duration_seconds || 5),
    0
  );
  const estimatedLitersToday = (totalSecondsToday * 0.02).toFixed(2);

  return (
    <div className="glass-card rounded-2xl border border-white/80 shadow-xs backdrop-blur-md bg-white/75 overflow-hidden mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100/80">
        {/* 1. Purata Kelembapan */}
        <div className="p-4 sm:p-5 flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Purata Kelembapan
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{avgMoisture}%</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  avgMoisture >= 60
                    ? 'bg-emerald-100 text-emerald-800'
                    : avgMoisture >= 35
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {avgMoisture >= 60 ? 'Optimal' : avgMoisture >= 35 ? 'Sederhana' : 'Kering'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">4 Pasu Tanaman</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Pam Sedang Beroperasi */}
        <div className="p-4 sm:p-5 flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Pam Beroperasi
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{activePumpsCount}</span>
              <span className="text-xs text-slate-400 font-semibold">/ 4</span>
              {activePumpsCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 animate-pulse">
                  Aktif
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              {activePumpsCount > 0 ? 'Siraman berlangsung' : 'Semua pam sedia'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${
              activePumpsCount > 0
                ? 'bg-emerald-100 text-emerald-600 animate-bounce'
                : 'bg-slate-50 text-slate-400 group-hover:scale-105'
            }`}
          >
            <Droplet className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Siraman Hari Ini */}
        <div className="p-4 sm:p-5 flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Kitaran Hari Ini
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{todayWateringCount}</span>
              <span className="text-xs text-slate-400 font-semibold">kali</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Auto & Manual</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Penggunaan Air Hari Ini */}
        <div className="p-4 sm:p-5 flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Penggunaan Air
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{estimatedLitersToday}</span>
              <span className="text-xs text-slate-400 font-semibold">Liter</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              Volumetrik ~20ml/s
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50/70 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <GlassWater className="w-5 h-5" />
          </div>
        </div>

        {/* 5. Status Tangki Air */}
        <div className="p-4 sm:p-5 flex items-center justify-between group col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Tangki Air PVC
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mencukupi
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Tekanan sedia</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Waves className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
