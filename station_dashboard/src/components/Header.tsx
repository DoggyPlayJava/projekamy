import React, { useState, useEffect } from 'react';
import { Cloud, Wifi, WifiOff, Bell, BellOff, Volume2, Sparkles, RefreshCw, Radio } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HeaderProps {
  isCloudConnected: boolean;
  isStationOnline: boolean;
  lastUpdated: string;
  buzzerEnabled: boolean;
  buzzerActive: boolean;
  onToggleMute: () => Promise<void>;
  onTestBuzzer: () => Promise<void>;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isCloudConnected,
  isStationOnline,
  lastUpdated,
  buzzerEnabled,
  buzzerActive,
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
      <div className="glass-panel rounded-3xl px-6 py-4 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Titles */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
              <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            {buzzerActive && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                POLISAS IoT
              </span>
              <span className="text-xs text-slate-400 font-medium">Stesen Cuaca & Tanaman</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Stesen Pemantauan Agro
              <span className="text-xs font-bold text-cyan-400 font-mono">v2.0</span>
            </h1>
          </div>
        </div>

        {/* Right Section: System Capsule & Action Controls */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Unified Glass Status Capsule */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-800/80 border border-white/10 text-xs font-semibold shadow-inner">
            {/* Cloud Status */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500'}`} />
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Cloud</span>
            </div>

            <span className="text-slate-600">|</span>

            {/* ESP32 Status */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isStationOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              {isStationOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className={isStationOnline ? 'text-emerald-300' : 'text-rose-400'}>
                {isStationOnline ? 'ESP32 Online' : 'ESP32 Offline'}
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">|</span>

            {/* System Clock */}
            <span className="font-mono text-slate-300 text-[11px] hidden sm:inline">
              {currentTime}
            </span>
          </div>

          {/* Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              buzzerEnabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
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
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-white/5'
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
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Uji Buzzer</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title={`Kemaskini data (${lastUpdated})`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
