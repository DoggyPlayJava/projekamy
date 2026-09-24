import React, { useState } from 'react';
import { Droplet, Edit2, Check, Sliders, Power, Sparkles, AlertCircle, AlertTriangle, ShieldAlert, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { PotStatus } from '../types';

interface PotCardProps {
  pot: PotStatus;
  onUpdatePot: (potId: number, updates: Partial<PotStatus>) => Promise<void>;
  onTriggerWatering: (potId: number) => Promise<void>;
}

export const CROP_PRESETS = [
  { name: 'Sawi Hijau', type: 'Sawi', threshold: 35, icon: '🥬' },
  { name: 'Salad Bulat', type: 'Salad', threshold: 40, icon: '🥗' },
  { name: 'Kangkung Air', type: 'Kangkung', threshold: 50, icon: '🌿' },
  { name: 'Bayam Merah', type: 'Bayam', threshold: 35, icon: '🌱' },
  { name: 'Cili Kulai', type: 'Cili', threshold: 30, icon: '🌶️' },
  { name: 'Daun Pudina', type: 'Herba', threshold: 45, icon: '🍃' },
];

export const PotCard: React.FC<PotCardProps> = ({
  pot,
  onUpdatePot,
  onTriggerWatering,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(pot.pot_name);
  const [isWateringPending, setIsWateringPending] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);

  // Sensor hardware connection check
  const isSensorFault = pot.sensor_connected === false;

  // Moisture state assessment
  const isOptimal = pot.moisture_pct >= 60;
  const isModerate = pot.moisture_pct >= 35 && pot.moisture_pct < 60;
  const isDry = pot.moisture_pct < 35;

  // Gauge color palette - Nordic Agro Discipline
  const strokeColor = isSensorFault
    ? '#cbd5e1' // slate-300 when sensor is disconnected
    : isOptimal
    ? '#059669' // emerald-600
    : isModerate
    ? '#d97706' // amber-600
    : '#e11d48'; // rose-600

  // SVG circular gauge math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isSensorFault 
    ? circumference * 0.75 
    : circumference - (pot.moisture_pct / 100) * circumference;

  // Handle saving renamed plant
  const handleSaveName = async () => {
    if (nameInput.trim() && nameInput !== pot.pot_name) {
      await onUpdatePot(pot.pot_id, { pot_name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  // Handle threshold slider
  const handleThresholdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    await onUpdatePot(pot.pot_id, { threshold_pct: val });
  };

  // Handle auto mode toggle
  const handleToggleAuto = async () => {
    await onUpdatePot(pot.pot_id, { auto_mode: !pot.auto_mode });
  };

  // Handle manual watering with celebration confetti
  const handleManualWater = async () => {
    setIsWateringPending(true);
    try {
      confetti({
        particleCount: 30,
        spread: 55,
        origin: { y: 0.8 },
        colors: ['#059669', '#10b981', '#34d399'],
      });
      await onTriggerWatering(pot.pot_id);
    } finally {
      setTimeout(() => setIsWateringPending(false), 1200);
    }
  };

  // Select crop preset
  const handleSelectPreset = async (preset: typeof CROP_PRESETS[0]) => {
    const newName = `Pasu ${pot.pot_id} (${preset.name})`;
    setNameInput(newName);
    setIsPresetOpen(false);
    await onUpdatePot(pot.pot_id, {
      pot_name: newName,
      plant_type: preset.type,
      threshold_pct: preset.threshold,
    });
  };

  // Format relative time for last watered
  const formatLastWatered = (timeStr?: string) => {
    if (!timeStr) return 'Belum disiram';
    const date = new Date(timeStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Baru sahaja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  };

  // Detect current preset match
  const matchedPreset = CROP_PRESETS.find((p) => pot.pot_name.includes(p.name));

  return (
    <div
      className={`glass-card rounded-3xl p-5 border relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${
        pot.pump_state
          ? 'border-emerald-500 ring-2 ring-emerald-400/30 shadow-xl shadow-emerald-600/10'
          : isDry
          ? 'border-rose-300/80 shadow-md shadow-rose-500/5'
          : 'border-white/80 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Active Pump Water Ripple Ambient Glow */}
      {pot.pump_state && (
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent pointer-events-none animate-pulse" />
      )}

      <div>
        {/* Top Meta Bar: Pot ID, Hardware Pin, Alert Pill & Sleek Preset Dropdown */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
              Pasu #{pot.pot_id}
            </span>

            {/* Hardware Relay Tag */}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/50">
              {pot.pot_id === 1 ? 'Relay K1' : pot.pot_id === 2 ? 'Relay K2' : `Port #${pot.pot_id}`}
            </span>

            {pot.pump_state ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                MENYIRAM
              </span>
            ) : isSensorFault ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                SENSOR TERPUTUS
              </span>
            ) : isDry ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                KERING
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                OPTIMAL
              </span>
            )}
          </div>

          {/* Minimalist Crop Preset Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPresetOpen(!isPresetOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
              title="Pilih Profil Sayuran Komersial"
            >
              <span>{matchedPreset ? matchedPreset.icon : '🌱'}</span>
              <span className="max-w-[70px] truncate">{matchedPreset ? matchedPreset.name : 'Profil'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isPresetOpen && (
              <div className="absolute right-0 top-8 w-48 rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-emerald-100 p-1.5 z-30 animate-fade-in">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-100 mb-1">
                  Pustaka Pratetap Sayur
                </p>
                {CROP_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-emerald-50 text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                      {p.threshold}%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Plant Title with Inline Quick Edit */}
        {isEditingName ? (
          <div className="flex items-center gap-1.5 mb-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              autoFocus
              className="text-sm font-bold text-slate-800 bg-white border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full"
            />
            <button
              onClick={handleSaveName}
              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 group cursor-pointer mb-2"
            onClick={() => setIsEditingName(true)}
            title="Klik untuk menukar nama pasu"
          >
            <h3 className="text-base font-black text-slate-800 tracking-tight truncate">
              {pot.pot_name}
            </h3>
            <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
          </div>
        )}

        {/* Circular Radial Gauge: Hero Visual Element */}
        <div className="flex flex-col items-center justify-center my-2 relative">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="#f1f5f9"
                strokeWidth="9"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke={strokeColor}
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
                }}
              />
            </svg>

            {/* Center Content: Percentage or Fault Indicator */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              {isSensorFault ? (
                <>
                  <AlertTriangle className="w-5 h-5 mb-0.5 text-rose-500 animate-pulse" />
                  <span className="text-2xl font-black text-rose-600 tracking-tight">--</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-600">
                    Tidak Dikesan
                  </span>
                </>
              ) : (
                <>
                  <Droplet
                    className={`w-4 h-4 mb-0.5 transition-colors ${
                      pot.pump_state
                        ? 'text-emerald-500 animate-bounce'
                        : isOptimal
                        ? 'text-emerald-600'
                        : isModerate
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  />
                  <span className="text-2xl font-black text-slate-800 tracking-tight">
                    {pot.moisture_pct}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Kelembapan
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sleek Compact Threshold Slider */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-emerald-600" />
              Ambang Siram:
            </span>
            <span className="font-black text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100 text-[11px]">
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
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        {/* Fail-Safe Safety Lockout Badge when Sensor Disconnected */}
        {isSensorFault && (
          <div className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs animate-fade-in">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
            <span>Auto-Siram Dikunci (Lindungi tanaman daripada limpahan air)</span>
          </div>
        )}
      </div>

      {/* Action Controls & Footer */}
      <div>
        <div className="mt-3.5 flex items-center gap-2">
          {/* Auto Mode Switch */}
          <button
            onClick={handleToggleAuto}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              pot.auto_mode
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Power className={`w-3 h-3 ${pot.auto_mode ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{pot.auto_mode ? 'Mod Auto' : 'Mod Manual'}</span>
          </button>

          {/* Quick Manual Water Button */}
          <button
            onClick={handleManualWater}
            disabled={isWateringPending || pot.pump_state}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer ${
              pot.pump_state
                ? 'bg-emerald-600 shadow-emerald-600/20 animate-pulse cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
            }`}
          >
            {pot.pump_state ? (
              <>
                <Droplet className="w-3 h-3 animate-bounce" />
                <span>Menyiram...</span>
              </>
            ) : isWateringPending ? (
              <>
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Droplet className="w-3 h-3" />
                <span>Siram (5s)</span>
              </>
            )}
          </button>
        </div>

        {/* Relative Watered Time */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Siraman Terakhir:</span>
          <span className="font-semibold text-slate-600">{formatLastWatered(pot.last_watered_at)}</span>
        </div>
      </div>
    </div>
  );
};
