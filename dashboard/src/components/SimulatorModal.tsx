import React, { useState } from 'react';
import { Sparkles, X, Play, RefreshCw, Flame, Droplets, CheckCircle2 } from 'lucide-react';
import type { PotStatus } from '../types';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pots: PotStatus[];
  onSimulatePotUpdate: (potId: number, moisturePct: number, pumpState: boolean) => Promise<void>;
  onSimulatePingEsp32: () => Promise<void>;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  pots,
  onSimulatePotUpdate,
  onSimulatePingEsp32,
}) => {
  const [selectedPotId, setSelectedPotId] = useState<number>(1);
  const [customMoisture, setCustomMoisture] = useState<number>(25);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Quick preset: Make pot dry (20%)
  const handleMakeDry = async (potId: number) => {
    setIsProcessing(true);
    try {
      await onSimulatePotUpdate(potId, 22, false);
      showFeedback(`Pasu #${potId} berjaya diset ke Kering (22%)!`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick preset: Make pot optimal (75%)
  const handleMakeOptimal = async (potId: number) => {
    setIsProcessing(true);
    try {
      await onSimulatePotUpdate(potId, 75, false);
      showFeedback(`Pasu #${potId} berjaya diset ke Lembap (75%)!`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick preset: Simulate pump running
  const handleSimulatePumpRunning = async (potId: number) => {
    setIsProcessing(true);
    try {
      await onSimulatePotUpdate(potId, 25, true);
      showFeedback(`Pam Pasu #${potId} disimulasikan HIDUP!`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply custom moisture
  const handleApplyCustom = async () => {
    setIsProcessing(true);
    try {
      await onSimulatePotUpdate(selectedPotId, customMoisture, false);
      showFeedback(`Pasu #${selectedPotId} diset ke ${customMoisture}%!`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Heartbeat ping
  const handleHeartbeat = async () => {
    setIsProcessing(true);
    try {
      await onSimulatePingEsp32();
      showFeedback(`Heartbeat ESP32 berjaya dikemaskini (Online)!`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-card bg-white/95 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-emerald-200/80 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                Simulator Perkakasan IoT (Demo FYP)
              </h3>
              <p className="text-xs text-slate-500">
                Uji interaktiviti papan pemuka tanpa menunggu tanah kering sebenar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Quick Action Buttons per Pot */}
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Simulasi Pantas Mengikut Pasu:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {pots.map((pot) => (
              <div
                key={pot.pot_id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800 truncate">
                    Pasu #{pot.pot_id}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                    {pot.moisture_pct}%
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleMakeDry(pot.pot_id)}
                    title="Simulasi Tanah Kering"
                    className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Flame className="w-3 h-3" />
                    Kering (22%)
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleMakeOptimal(pot.pot_id)}
                    title="Simulasi Tanah Lembap"
                    className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Droplets className="w-3 h-3" />
                    Lembap (75%)
                  </button>
                </div>
                <button
                  disabled={isProcessing}
                  onClick={() => handleSimulatePumpRunning(pot.pot_id)}
                  className="mt-1.5 w-full py-1 text-[10px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5" />
                  Simulasi Pam Berjalan
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Moisture Slider */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center justify-between text-xs mb-2 font-bold text-slate-700">
            <span>Pilih Pasu & Nilai Kelembapan Kustom:</span>
            <select
              value={selectedPotId}
              onChange={(e) => setSelectedPotId(parseInt(e.target.value, 10))}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {pots.map((p) => (
                <option key={p.pot_id} value={p.pot_id}>
                  Pasu #{p.pot_id} ({p.pot_name})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={customMoisture}
              onChange={(e) => setCustomMoisture(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <span className="w-12 text-center text-sm font-extrabold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
              {customMoisture}%
            </span>
          </div>
          <button
            disabled={isProcessing}
            onClick={handleApplyCustom}
            className="mt-3 w-full py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Terapkan Nilai Ke Pasu #{selectedPotId}
          </button>
        </div>

        {/* Heartbeat Ping */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Simulasikan isyarat detak jantung (*Heartbeat*) ESP32:
          </span>
          <button
            disabled={isProcessing}
            onClick={handleHeartbeat}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            Ping Online
          </button>
        </div>
      </div>
    </div>
  );
};
