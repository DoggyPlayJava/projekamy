import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  BellRing,
  Flame,
  Wind,
  Volume2,
  Cpu,
  Sun,
  Sparkles,
  X,
} from 'lucide-react';
import type { WeatherNotification } from '../lib/notifications';
import { NOTIF_CONFIG } from '../lib/notifications';

interface NotificationBellProps {
  notifications: WeatherNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  onRequestPermission: () => Promise<void>;
  onTestPush: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  permission,
  onRequestPermission,
  onTestPush,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatRelativeTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 20) return 'Baru sahaja';
    if (diffSec < 60) return `${diffSec}s yang lalu`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m yang lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j yang lalu`;
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  };

  const getNotifIcon = (type: WeatherNotification['type']) => {
    switch (type) {
      case 'HEAT_ALERT':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'DRY_AIR_ALERT':
        return <Wind className="w-4 h-4 text-sky-500" />;
      case 'BUZZER_ALERT':
        return <Volume2 className="w-4 h-4 text-amber-500" />;
      case 'SYSTEM_ALERT':
        return <Cpu className="w-4 h-4 text-emerald-500" />;
      case 'DAY_NIGHT_ALERT':
        return <Sun className="w-4 h-4 text-violet-500" />;
      case 'TEST_ALERT':
      default:
        return <Sparkles className="w-4 h-4 text-cyan-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="Pusat Notifikasi & Push Alert"
        className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center ${
          isOpen || unreadCount > 0
            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/10'
            : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Unread badge pulse */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Pusat Amaran Cuaca</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {unreadCount > 0 ? `${unreadCount} amaran belum dibaca` : 'Tiada notifikasi baharu'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  title="Tanda semua telah dibaca"
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  title="Kosongkan senarai"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Browser Push Permission Banner */}
          {permission !== 'granted' && (
            <div className="p-3 bg-cyan-50/90 dark:bg-cyan-950/30 border-b border-cyan-100 dark:border-cyan-900/40 flex items-center justify-between gap-2">
              <div className="text-[11px] text-cyan-900 dark:text-cyan-200 font-medium">
                Dapatkan pop-up amaran terus ke OS/Desktop?
              </div>
              <button
                onClick={onRequestPermission}
                className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Aktifkan Push
              </button>
            </div>
          )}

          {/* Quick Actions (Test Push Button) */}
          <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ujian & Status
            </span>
            <button
              onClick={onTestPush}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Uji Push & Bunyi</span>
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-xs font-semibold">Semua keadaan cuaca terkawal</p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  Amaran akan muncul secara automatik jika suhu tinggi atau udara kering dikesan.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.TEST_ALERT;
                return (
                  <div
                    key={notif.id}
                    onClick={() => onMarkRead(notif.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      notif.is_read
                        ? 'opacity-65 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                        : 'bg-cyan-50/30 dark:bg-cyan-950/20 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/40'
                    }`}
                  >
                    {/* Icon container */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: config.bgLight,
                      }}
                    >
                      {getNotifIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.is_read && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: config.dot }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
