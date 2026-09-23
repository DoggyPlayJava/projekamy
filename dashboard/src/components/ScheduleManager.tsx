import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarClock,
  Plus,
  Trash2,
  Play,
  ShieldCheck,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { IrrigationSchedule, PotStatus } from '../types';

interface ScheduleManagerProps {
  schedules: IrrigationSchedule[];
  pots: PotStatus[];
  onAddSchedule: (schedule: Omit<IrrigationSchedule, 'id' | 'created_at'>) => Promise<void>;
  onToggleSchedule: (id: number, currentEnabled: boolean) => Promise<void>;
  onDeleteSchedule: (id: number) => Promise<void>;
  onExecuteScheduleNow: (schedule: IrrigationSchedule) => Promise<void>;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  schedules,
  pots,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onExecuteScheduleNow,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState(5);
  const [targetPots, setTargetPots] = useState<number[]>([1, 2, 3, 4]);
  const [skipIfWet, setSkipIfWet] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);

  const togglePotSelection = (potId: number) => {
    setTargetPots((prev) =>
      prev.includes(potId)
        ? prev.length > 1
          ? prev.filter((p) => p !== potId)
          : prev
        : [...prev, potId]
    );
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !time) return;

    setIsSubmitting(true);
    try {
      await onAddSchedule({
        label: label.trim(),
        time_of_day: `${time}:00`,
        target_pots: targetPots,
        duration_seconds: duration,
        skip_if_wet: skipIfWet,
        is_enabled: true,
      });
      setIsModalOpen(false);
      setLabel('');
      setTime('08:00');
      setDuration(5);
      setTargetPots([1, 2, 3, 4]);
      setSkipIfWet(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunNow = async (sched: IrrigationSchedule) => {
    setExecutingId(sched.id);
    try {
      await onExecuteScheduleNow(sched);
    } finally {
      setTimeout(() => setExecutingId(null), 1500);
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm mb-8 relative">
      {/* Decorative background glow with clipped inner wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl" />
      </div>

      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              Penjadualan Masa Pintar (Smart Irrigation Scheduler)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Sistem menyiram tanaman secara berkala dengan perlindungan langkau tanah basah (*Smart Skip*)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadual</span>
        </button>
      </div>

      {/* Schedules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {schedules.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-400">
            <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">Tiada jadual waktu aktif</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Klik butang 'Tambah Jadual' di atas untuk menetapkan masa siraman automatik.
            </p>
          </div>
        ) : (
          schedules.map((sched) => (
            <div
              key={sched.id}
              className={`p-4 rounded-2xl border transition-all ${
                sched.is_enabled
                  ? 'bg-white/90 border-emerald-200/80 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="text-xl font-black text-slate-800 tracking-tight">
                    {formatDisplayTime(sched.time_of_day)}
                  </div>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      sched.is_enabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {sched.label}
                  </span>
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  onClick={() => onToggleSchedule(sched.id, sched.is_enabled)}
                  className="text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                  title={sched.is_enabled ? 'Nyahaktifkan Jadual' : 'Aktifkan Jadual'}
                >
                  {sched.is_enabled ? (
                    <ToggleRight className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Details & Target Pots */}
              <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Sasaran:</span>
                {sched.target_pots.map((potId) => {
                  const pot = pots.find((p) => p.pot_id === potId);
                  return (
                    <span
                      key={potId}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      {pot?.pot_name || `Pasu ${potId}`}
                    </span>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <span>Tempoh: <strong>{sched.duration_seconds}s</strong></span>
                  {sched.skip_if_wet && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                      <ShieldCheck className="w-3 h-3 text-teal-600" />
                      Smart Skip
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Test Now Button */}
                  <button
                    onClick={() => handleRunNow(sched)}
                    disabled={executingId === sched.id}
                    title="Uji siram jadual ini sekarang"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-all border border-emerald-200 cursor-pointer"
                  >
                    <Play className={`w-3 h-3 ${executingId === sched.id ? 'animate-spin' : ''}`} />
                    <span>{executingId === sched.id ? 'Menyiram...' : 'Uji Sekarang'}</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteSchedule(sched.id)}
                    title="Padam Jadual"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Schedule Modal - Mounted via createPortal to document.body to prevent clipping */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white/95 rounded-3xl p-6 max-w-md w-full border border-emerald-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-800">Tambah Jadual Siraman</h4>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama / Label Jadual</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siraman Pagi / Siraman Petang"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Waktu Siraman (24 Jam)</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tempoh Pam (Saat)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value={3}>3 Saat</option>
                    <option value={5}>5 Saat (Standard)</option>
                    <option value={8}>8 Saat</option>
                    <option value={10}>10 Saat</option>
                  </select>
                </div>
              </div>

              {/* Target Pots Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Sasaran Pasu Yang Disiram
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pots.map((pot) => {
                    const isSelected = targetPots.includes(pot.pot_id);
                    return (
                      <button
                        type="button"
                        key={pot.pot_id}
                        onClick={() => togglePotSelection(pot.pot_id)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="truncate">{pot.pot_name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Smart Skip Checkbox */}
              <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="skipIfWet"
                  checked={skipIfWet}
                  onChange={(e) => setSkipIfWet(e.target.checked)}
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                />
                <label htmlFor="skipIfWet" className="text-xs cursor-pointer select-none">
                  <span className="font-extrabold text-teal-900 block">Langkau Jika Tanah Basah (Smart Skip)</span>
                  <span className="text-teal-700 text-[11px] leading-tight block mt-0.5">
                    Jika waktu tiba tetapi kelembapan tanah sudah melebihi had ambang, siraman tidak akan dijalankan untuk mengelak pembaziran air.
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Jadual'}
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
};
