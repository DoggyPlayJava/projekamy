import React, { useState } from 'react';
import { Droplet, Edit2, Check, Sliders, Power, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { PotStatus } from '../types';

interface PotCardProps {
  pot: PotStatus;
  onUpdatePot: (potId: number, updates: Partial<PotStatus>) => Promise<void>;
  onTriggerWatering: (potId: number) => Promise<void>;
}

export const PotCard: React.FC<PotCardProps> = ({
  pot,
  onUpdatePot,
  onTriggerWatering,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(pot.pot_name);
  const [isWateringPending, setIsWateringPending] = useState(false);

  // Determine moisture level state
  const isOptimal = pot.moisture_pct >= 60;
  const isModerate = pot.moisture_pct >= 35 && pot.moisture_pct < 60;
  const isDry = pot.moisture_pct < 35;

  // Gauge colors
  const strokeColor = isOptimal
    ? '#10b981' // emerald-500
    : isModerate
    ? '#f59e0b' // amber-500
    : '#ef4444'; // rose-500

  // SVG circular gauge calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pot.moisture_pct / 100) * circumference;

  // Handle saving renamed plant
  const handleSaveName = async () => {
    if (nameInput.trim() && nameInput !== pot.pot_name) {
      await onUpdatePot(pot.pot_id, { pot_name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  // Handle threshold slider change
  const handleThresholdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    await onUpdatePot(pot.pot_id, { threshold_pct: val });
  };

  // Handle auto mode toggle
  const handleToggleAuto = async () => {
    await onUpdatePot(pot.pot_id, { auto_mode: !pot.auto_mode });
  };

  // Handle manual watering button
  const handleManualWater = async () => {
    setIsWateringPending(true);
    try {
      // Trigger festive celebration confetti
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#06b6d4', '#3b82f6'],
      });
      await onTriggerWatering(pot.pot_id);
    } finally {
      setTimeout(() => setIsWateringPending(false), 1200);
    }
  };

  // Format relative time for last watered
  const formatLastWatered = (timeStr?: string) => {
    if (!timeStr) return 'Belum pernah disiram';
    const date = new Date(timeStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Baru sahaja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minit yang lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam yang lalu`;
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={`glass-card glass-card-hover rounded-3xl p-6 border relative overflow-hidden transition-all duration-300 ${
        pot.pump_state
          ? 'border-sky-400 ring-2 ring-sky-300/40 shadow-xl shadow-sky-500/10'
          : isDry
          ? 'border-rose-300 ring-1 ring-rose-200/50'
          : 'border-white/80'
      }`}
    >
      {/* Active Pump Water Wave Glow Background */}
      {pot.pump_state && (
        <div className="absolute inset-0 bg-gradient-to-t from-sky-400/10 via-transparent to-transparent pointer-events-none animate-pulse" />
      )}

      {/* Card Header: Pot Title & Quick Badges */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              Pasu #{pot.pot_id}
            </span>
            {pot.pump_state ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                PAM AKTIF
              </span>
            ) : isDry ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                TANAH KERING
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                OPTIMAL
              </span>
            )}
          </div>

          {/* Plant Name with Inline Edit */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                className="text-base font-bold text-slate-800 bg-white border border-emerald-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full"
              />
              <button
                onClick={handleSaveName}
                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1.5 group cursor-pointer" onClick={() => setIsEditingName(true)}>
              <h3 className="text-lg font-extrabold text-slate-800 truncate" title={pot.pot_name}>
                {pot.pot_name}
              </h3>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </div>

      {/* Circular Radial Gauge */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#e2e8f0"
              strokeWidth="11"
              fill="transparent"
            />
            {/* Animated Progress ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={strokeColor}
              strokeWidth="11"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease',
              }}
            />
          </svg>

          {/* Center Content: Percentage & Droplet */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <Droplet
              className={`w-5 h-5 mb-1 transition-colors ${
                pot.pump_state
                  ? 'text-sky-500 animate-bounce'
                  : isOptimal
                  ? 'text-emerald-500'
                  : isModerate
                  ? 'text-amber-500'
                  : 'text-rose-500'
              }`}
            />
            <span className="text-3xl font-black text-slate-800 tracking-tight">
              {pot.moisture_pct}%
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kelembapan
            </span>
          </div>
        </div>

        {/* Status text badge below gauge */}
        <p className="text-xs font-semibold text-slate-500 mt-2">
          {isOptimal
            ? 'Tanah dalam keadaan lembap & sihat'
            : isModerate
            ? 'Kelembapan tanah sederhana'
            : 'Tanah kering! Perlu disiram air'}
        </p>
      </div>

      {/* Threshold Slider Controller */}
      <div className="mt-5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            Ambang Auto-Siram:
          </span>
          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
            ≤ {pot.threshold_pct}%
          </span>
        </div>
        <input
          type="range"
          min="15"
          max="75"
          step="1"
          value={pot.threshold_pct}
          onChange={handleThresholdChange}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>15% (Kering)</span>
          <span>75% (Sangat Lembap)</span>
        </div>
      </div>

      {/* Action Controls: Auto Toggle & Quick Manual Water */}
      <div className="mt-5 flex items-center gap-2.5">
        {/* Auto Mode Switch */}
        <button
          onClick={handleToggleAuto}
          title={pot.auto_mode ? 'Tukar ke Mod Manual' : 'Tukar ke Mod Automatik'}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            pot.auto_mode
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Power className={`w-3.5 h-3.5 ${pot.auto_mode ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{pot.auto_mode ? 'Mod Auto' : 'Mod Manual'}</span>
        </button>

        {/* Quick Manual Water Button */}
        <button
          onClick={handleManualWater}
          disabled={isWateringPending || pot.pump_state}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer ${
            pot.pump_state
              ? 'bg-sky-500 shadow-sky-500/25 animate-pulse cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-600/20'
          }`}
        >
          {pot.pump_state ? (
            <>
              <Droplet className="w-3.5 h-3.5 animate-bounce" />
              <span>Menyiram...</span>
            </>
          ) : isWateringPending ? (
            <>
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <Droplet className="w-3.5 h-3.5" />
              <span>Siram (5s)</span>
            </>
          )}
        </button>
      </div>

      {/* Card Footer: Last Watered Timestamp */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Siraman Terakhir:</span>
        <span className="font-semibold text-slate-600">{formatLastWatered(pot.last_watered_at)}</span>
      </div>
    </div>
  );
};
