import React, { useState, useEffect } from 'react';
import { Cloud, Wifi, WifiOff, Bell, BellOff, Volume2, Sparkles, RefreshCw, Radio, Sun, Moon, Usb } from 'lucide-react';
import confetti from 'canvas-confetti';
import { NotificationBell } from './NotificationBell';
import type { WeatherNotification } from '../lib/notifications';

interface HeaderProps {
  isCloudConnected: boolean;
  isStationOnline: boolean;
  isSerialConnected: boolean;
  isSerialSupported: boolean;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  lastUpdated: string;
  buzzerEnabled: boolean;
  buzzerActive: boolean;
  theme: 'light' | 'dark';
  notifications: WeatherNotification[];
  unreadCount: number;
  notificationPermission: NotificationPermission;
  onRequestPermission: () => Promise<void>;
  onTestPush: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onToggleTheme: () => void;
  onToggleMute: () => Promise<void>;
  onTestBuzzer: () => Promise<void>;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isCloudConnected,
  isStationOnline,
  isSerialConnected,
  isSerialSupported,
  onConnectSerial,
  onDisconnectSerial,
  lastUpdated,
  buzzerEnabled,
  buzzerActive,
  theme,
  notifications,
  unreadCount,
  notificationPermission,
  onRequestPermission,
  onTestPush,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onToggleTheme,
  onToggleMute,
  onTestBuzzer,
  onRefresh,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isTestingBuzzer, setIsTestingBuzzer] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ms-MY', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTestClick = async () => {
    setIsTestingBuzzer(true);
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.2 },
      colors: ['#38bdf8', '#34d399', '#f59e0b'],
    });
    try {
      await onTestBuzzer();
    } finally {
      setTimeout(() => setIsTestingBuzzer(false), 2200);
    }
  };

  return (
    <header className="sticky top-4 z-40 mb-6">
      <div className="glass-panel rounded-3xl px-6 py-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Titles */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full rounded-[14px] bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
              <Radio className="w-6 h-6 text-cyan-600 dark:text-emerald-400 animate-pulse" />
            </div>
            {buzzerActive && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                POLISAS IoT
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Stesen Cuaca Pintar</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Stesen Amaran Cuaca & Iklim
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">v2.0</span>
            </h1>
          </div>
        </div>

        {/* Right Section: System Capsule & Action Controls */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Unified Glass Status Capsule */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold shadow-inner">
            {/* Cloud Status */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-rose-500'}`} />
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Cloud</span>
            </div>

            <span className="text-slate-300 dark:text-slate-600">|</span>

            {/* Microcontroller Connection Status (USB Nano or Cloud) */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSerialConnected ? 'bg-emerald-500 animate-ping' : isStationOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isSerialConnected ? (
                <Usb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : isStationOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              )}
              <span className={isSerialConnected || isStationOnline ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                {isSerialConnected ? 'Nano USB Live' : isStationOnline ? 'Cloud Online' : 'Terputus'}
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>

            {/* System Clock */}
            <span className="font-mono text-slate-500 dark:text-slate-300 text-[11px] hidden sm:inline">
              {currentTime}
            </span>
          </div>

          {/* Web Serial USB Connect / Disconnect Button */}
          {isSerialSupported && (
            <button
              onClick={isSerialConnected ? onDisconnectSerial : onConnectSerial}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isSerialConnected
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-sm'
                  : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25 shadow-sm active:scale-95'
              }`}
              title={
                isSerialConnected
                  ? 'Arduino Nano berhubung secara langsung via kabel USB. Klik untuk putuskan.'
                  : 'Sambungkan kabel USB Arduino Nano ke komputer/pelayar melalui Web Serial API (Chrome/Edge).'
              }
            >
              <Usb className={`w-3.5 h-3.5 ${isSerialConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`} />
              <span>{isSerialConnected ? 'Nano Berhubung' : 'Sambung USB Nano'}</span>
            </button>
          )}

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10"
            title={theme === 'light' ? 'Tukar ke Mod Gelap (Dark Mode)' : 'Tukar ke Mod Cerah (Light Mode)'}
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Gelap</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Cerah</span>
              </>
            )}
          </button>

          {/* Weather Station Notification & Push Bell */}
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            permission={notificationPermission}
            onRequestPermission={onRequestPermission}
            onTestPush={onTestPush}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onClearAll={onClearAll}
          />

          {/* Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              buzzerEnabled
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
            }`}
            title={buzzerEnabled ? 'Buzzer Aktif (Klik untuk Mute)' : 'Buzzer Disenyapkan (Klik untuk Aktifkan)'}
          >
            {buzzerEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span>{buzzerEnabled ? 'Buzzer: AKTIF' : 'Buzzer: MUTED'}</span>
          </button>

          {/* Test Buzzer Button */}
          <button
            onClick={handleTestClick}
            disabled={isTestingBuzzer || !buzzerEnabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer ${
              isTestingBuzzer
                ? 'bg-rose-600 animate-pulse shadow-rose-500/20'
                : !buzzerEnabled
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-white/5'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'
            }`}
          >
            {isTestingBuzzer ? (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                <span>Membunyikan (2s)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Uji Buzzer</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            title={`Kemaskini data (${lastUpdated})`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
