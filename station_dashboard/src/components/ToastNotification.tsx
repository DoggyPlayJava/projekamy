import React, { useEffect } from 'react';
import { Flame, Wind, Volume2, Cpu, Sun, Sparkles, X } from 'lucide-react';
import type { WeatherNotification } from '../lib/notifications';
import { NOTIF_CONFIG } from '../lib/notifications';

interface ToastNotificationProps {
  toast: WeatherNotification | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const config = NOTIF_CONFIG[toast.type] || NOTIF_CONFIG.TEST_ALERT;

  const getIcon = () => {
    switch (toast.type) {
      case 'HEAT_ALERT':
        return <Flame className="w-5 h-5 text-rose-500 animate-bounce" />;
      case 'DRY_AIR_ALERT':
        return <Wind className="w-5 h-5 text-sky-500" />;
      case 'BUZZER_ALERT':
        return <Volume2 className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'SYSTEM_ALERT':
        return <Cpu className="w-5 h-5 text-emerald-500" />;
      case 'DAY_NIGHT_ALERT':
        return <Sun className="w-5 h-5 text-violet-500" />;
      case 'TEST_ALERT':
      default:
        return <Sparkles className="w-5 h-5 text-cyan-500" />;
    }
  };

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full px-4 animate-fade-in pointer-events-auto">
      <div className="glass-panel rounded-2xl p-4 shadow-2xl border border-cyan-500/30 bg-white/95 dark:bg-slate-900/95 flex items-start gap-3 backdrop-blur-xl">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.bgLight }}
        >
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {config.label}
            </span>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
              Sekarang
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
            {toast.title}
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
