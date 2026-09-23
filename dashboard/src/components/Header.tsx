import React, { useState, useEffect } from 'react';
import { Sprout, Wifi, WifiOff, Clock, Activity, Sparkles, RefreshCw } from 'lucide-react';
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
    <header className="glass-card rounded-3xl p-5 mb-8 border border-white/60 shadow-lg relative overflow-hidden">
      {/* Decorative emerald gradient glow in background */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-green-400/15 rounded-full blur-3xl pointer-events-none" />

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

        {/* Right: Status Badges, Clock, Notification Bell & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Realtime Supabase Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>{isRealtimeConnected ? 'Supabase Live' : 'Menyambung...'}</span>
          </div>

          {/* ESP32 Hardware Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all ${
              isEsp32Online
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {isEsp32Online ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>ESP32 Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>ESP32 Standby</span>
              </>
            )}
          </div>

          {/* Clock Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/70 text-xs font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{timeString || '--:--:--'}</span>
          </div>

          {/* Notification Bell (Integrated from JPP-POLISAS) */}
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            permission={permission}
            onRequestPermission={onRequestPermission}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onClearAll={onClearAll}
          />

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            title="Muat semula data"
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-emerald-700 border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Test Simulator Toggle Button (Perfect for Demo) */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isSimulatorOpen
                ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatorOpen ? 'Tutup Simulator' : 'Mod Simulasi Demo'}</span>
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
