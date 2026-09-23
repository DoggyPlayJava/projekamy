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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* 1. Purata Kelembapan */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/60 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Purata Kelembapan Tanah
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-800">{avgMoisture}%</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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
            <p className="text-xs text-slate-500 mt-1 font-medium">Berdasarkan 4 pasu tanaman</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Gauge className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Pam Sedang Beroperasi */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/60 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pam Air Beroperasi
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-800">
                {activePumpsCount} <span className="text-lg text-slate-400 font-semibold">/ 4</span>
              </span>
              {activePumpsCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 animate-pulse">
                  Menyiram
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {activePumpsCount > 0 ? 'Siraman aktif sedang berlaku' : 'Semua pam dalam keadaan sedia'}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${
              activePumpsCount > 0
                ? 'bg-sky-100 text-sky-600 animate-bounce'
                : 'bg-slate-100 text-slate-500 group-hover:scale-110'
            }`}
          >
            <Droplet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Jumlah Siraman Hari Ini */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/60 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Siraman Hari Ini
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-800">
                {todayWateringCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">kali kitaran</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Termasuk auto & manual web</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4. Anggaran Penggunaan Air (Eco / Volumetrik) */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/60 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Penggunaan Air Hari Ini
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-800">
                {estimatedLitersToday}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Liter</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                Volumetrik ~20ml/s
              </span>
              <span className="text-[11px] text-slate-500 font-medium">({totalSecondsToday}s siram)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <GlassWater className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 5. Status Tangki Air */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/60 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status Tangki Air PVC
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-extrabold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Mencukupi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Air paip sedia untuk siraman</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Waves className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
