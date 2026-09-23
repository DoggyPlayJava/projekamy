import React from 'react';
import { WifiOff, RefreshCw, Power, Radio } from 'lucide-react';

interface OfflineBannerProps {
  isEsp32Online: boolean;
  lastUpdatedTime: string | null;
  onRefresh: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isEsp32Online,
  lastUpdatedTime,
  onRefresh,
}) => {
  if (isEsp32Online) return null;

  const getTimeAgo = () => {
    if (!lastUpdatedTime) return 'Belum ada telemetri dikesan';
    const seconds = Math.round((Date.now() - new Date(lastUpdatedTime).getTime()) / 1000);
    if (seconds < 60) return `${seconds} saat yang lalu`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minit yang lalu`;
  };

  return (
    <div className="mb-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-rose-500/5 animate-fade-in relative overflow-hidden">
      {/* Decorative pulse background */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/15 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-100 text-rose-700 flex-shrink-0 relative">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <WifiOff className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-rose-900 tracking-tight">
                ESP32 OFFLINE: Mikropengawal Terputus Sambungan
              </h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                Fail-Safe Alert
              </span>
            </div>
            <p className="text-xs text-rose-700 font-medium mt-0.5 leading-relaxed">
              Tiada data telemetri diterima daripada ESP32 sejak{' '}
              <strong className="font-extrabold underline">{getTimeAgo()}</strong>. Arahan kawalan
              pam akan disimpan sehingga perkakasan kembali bersambung.
            </p>

            {/* Quick troubleshooting tips */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-rose-800/80 font-semibold">
              <span className="inline-flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-lg border border-rose-200/60">
                <Power className="w-3 h-3 text-rose-600" /> 1. Semak Kabel Kuasa 5V
              </span>
              <span className="inline-flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-lg border border-rose-200/60">
                <Radio className="w-3 h-3 text-rose-600" /> 2. Pastikan Hotspot WiFi Aktif
              </span>
              <span className="inline-flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-lg border border-rose-200/60">
                <RefreshCw className="w-3 h-3 text-rose-600" /> 3. Tekan Butang EN/Reset ESP32
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 sm:self-center">
          <button
            onClick={onRefresh}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Semak Semula Status</span>
          </button>
        </div>
      </div>
    </div>
  );
};
