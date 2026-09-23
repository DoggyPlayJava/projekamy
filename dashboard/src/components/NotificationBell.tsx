import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, BellRing, ChevronRight, X } from 'lucide-react';
import type { AppNotification } from '../lib/notifications';
import { NOTIF_CONFIG } from '../lib/notifications';

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  onRequestPermission: () => Promise<void>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  permission,
  onRequestPermission,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    if (diffSec < 30) return 'Baru sahaja';
    if (diffSec < 60) return `${diffSec}s yang lalu`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m yang lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j yang lalu`;
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="Pusat Notifikasi & Amaran"
        className={`relative p-2 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-95 ${
          isOpen || unreadCount > 0
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : 'bg-white/80 hover:bg-white border-slate-200 text-slate-600'
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Unread badge dot */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-xl border border-emerald-100 shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Notifikasi Projek</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {unreadCount > 0 ? `${unreadCount} amaran belum dibaca` : 'Tiada notifikasi baharu'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  title="Tanda semua telah dibaca"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  title="Kosongkan senarai"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Browser Push Permission Alert Prompt */}
          {permission !== 'granted' && (
            <div className="p-3 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between gap-2">
              <div className="text-[11px] text-emerald-900 font-medium">
                Dapatkan pop-up bila tanah kering?
              </div>
              <button
                onClick={onRequestPermission}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
              >
                Aktifkan
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">Pusat notifikasi kosong</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Amaran tanah kering & aktiviti pam air akan dipaparkan di sini.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.SYSTEM;
                const isUnread = !notif.is_read;

                return (
                  <div
                    key={notif.id}
                    onClick={() => onMarkRead(notif.id)}
                    className={`p-3.5 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                      isUnread
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'hover:bg-slate-50 opacity-80'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: config.bg, color: config.color }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: config.dot }}
                          />
                          {config.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium ml-auto">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      <h5
                        className={`text-xs leading-snug ${
                          isUnread
                            ? 'font-extrabold text-slate-800'
                            : 'font-semibold text-slate-600'
                        }`}
                      >
                        {notif.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-2 transition-colors" />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">
                Pemberitahuan automatik beroperasi 24/7
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
