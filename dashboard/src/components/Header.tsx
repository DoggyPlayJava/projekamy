import React, { useState, useEffect } from 'react';
import { Sprout, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import type { AppNotification } from '../lib/notifications';

interface HeaderProps {
  isRealtimeConnected: boolean;
  isEsp32Online: boolean;
  lastUpdatedTime: string | null;
  onRefresh: () => void;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
  // Notification Props
  notifications: AppNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  onRequestPermission: () => Promise<void>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRealtimeConnected,
  isEsp32Online,
  lastUpdatedTime,
  onRefresh,
  onToggleSimulator,
  isSimulatorOpen,
  notifications,
  unreadCount,
  permission,
  onRequestPermission,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('ms-MY', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-card rounded-3xl p-5 mb-8 border border-white/60 shadow-lg relative z-30">
      {/* Decorative emerald gradient glow in background with clipped wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-green-400/15 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 text-white flex-shrink-0">
            <Sprout className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Politeknik Sultan Haji Ahmad Shah
              </span>
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                • Kejuruteraan Mekanikal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mt-1 flex items-center gap-2">
              SISTEM PENGAIRAN PINTAR
              <span className="text-emerald-600 font-medium text-lg">IoT</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Papan Pemuka Pemantauan & Kawalan Pengairan Automatik 4 Pasu Tanaman
            </p>
          </div>
        </div>

        {/* Right: Streamlined Status Capsule, Clock, Notifications & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unified System Health Capsule */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-sm text-xs font-semibold">
            {/* Supabase Status */}
            <div
              className="flex items-center gap-1.5"
              title={isRealtimeConnected ? 'Pangkalan data cloud aktif' : 'Menyambung...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-600 font-medium">Cloud</span>
            </div>

            <span className="w-px h-3.5 bg-slate-200" />

            {/* ESP32 Status */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isEsp32Online ? 'bg-emerald-400 opacity-75' : 'bg-rose-400 opacity-75'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isEsp32Online ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </span>
              <span
                className={`text-[11px] font-bold ${
                  isEsp32Online ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isEsp32Online ? 'ESP32 Online' : 'ESP32 Offline'}
              </span>
            </div>
          </div>

          {/* Clock Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100/80 text-xs font-bold text-slate-600 border border-slate-200/60">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeString || '--:--:--'}</span>
          </div>

          {/* Notification Bell */}
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            permission={permission}
            onRequestPermission={onRequestPermission}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onClearAll={onClearAll}
          />

          {/* Quick Refresh Button */}
          <button
            onClick={onRefresh}
            title="Muat semula data"
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-emerald-700 border border-slate-200/80 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Demo Simulator Toggle */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isSimulatorOpen
                ? 'bg-slate-800 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSimulatorOpen ? 'Tutup Demo' : 'Simulasi FYP'}</span>
          </button>
        </div>
      </div>
      
      {lastUpdatedTime && (
        <div className="mt-3 pt-3 border-t border-slate-200/40 flex items-center justify-between text-[11px] text-slate-400">
          <span>ID Projek: PoliSAS-02DKM24F1060 • Sesi 2023/2024</span>
          <span>Kemaskini terakhir: {new Date(lastUpdatedTime).toLocaleTimeString('ms-MY')}</span>
        </div>
      )}
    </header>
  );
};
