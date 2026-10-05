import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { WeatherStationStatus, WeatherStationLog } from './types';
import { Header } from './components/Header';
import { WeatherCards } from './components/WeatherCards';
import { StationChart } from './components/StationChart';
import { RecentEventsTable } from './components/RecentEventsTable';
import { ToastNotification } from './components/ToastNotification';
import { useWeatherNotifications } from './hooks/useWeatherNotifications';
import { useWebSerial, type NanoTelemetry } from './hooks/useWebSerial';
import { AlertTriangle, ExternalLink, Cpu } from 'lucide-react';

const DEFAULT_STATUS: WeatherStationStatus = {
  id: 1,
  temperature_c: 28.5,
  air_humidity_pct: 65,
  heat_index_c: 29.5,
  heat_alert: false,
  light_pct: 75,
  raw_ldr_adc: 1500,
  is_night: false,
  buzzer_active: false,
  buzzer_enabled: true,
  buzzer_reason: 'STANDBY',
  sensor_connected: true,
  updated_at: new Date().toISOString(),
};

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [status, setStatus] = useState<WeatherStationStatus>(DEFAULT_STATUS);
  const [logs, setLogs] = useState<WeatherStationLog[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isStationOnline, setIsStationOnline] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Memuatkan...');
  const [isLoading, setIsLoading] = useState(true);

  // Web Serial Sync Timers (Throttle cloud updates to avoid hammering Supabase)
  const lastCloudSyncRef = useRef<number>(0);
  const lastLogSyncRef = useRef<number>(0);

  // Real-time Telemetry Handler from Arduino Nano via USB Serial
  const handleNanoTelemetry = useCallback(async (data: NanoTelemetry) => {
    const now = Date.now();
    const nowIso = new Date().toISOString();

    setStatus((prev) => ({
      ...prev,
      temperature_c: data.temp !== undefined ? data.temp : prev.temperature_c,
      air_humidity_pct: data.hum !== undefined ? data.hum : prev.air_humidity_pct,
      heat_index_c: data.hi !== undefined ? data.hi : prev.heat_index_c,
      light_pct: data.light !== undefined ? data.light : prev.light_pct,
      raw_ldr_adc: data.raw_ldr !== undefined ? data.raw_ldr : prev.raw_ldr_adc,
      is_night: data.night !== undefined ? data.night : prev.is_night,
      buzzer_active: data.buzzer !== undefined ? data.buzzer : prev.buzzer_active,
      buzzer_enabled: data.buzzer_en !== undefined ? data.buzzer_en : prev.buzzer_enabled,
      buzzer_reason: data.reason || prev.buzzer_reason,
      updated_at: nowIso,
    }));

    setIsStationOnline(true);
    setLastUpdatedTime(new Date().toLocaleTimeString('ms-MY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }));

    // Forward status to Supabase every 3 seconds for remote dashboard synchronization
    if (now - lastCloudSyncRef.current > 3000) {
      lastCloudSyncRef.current = now;
      supabase
        .from('weather_station_status')
        .upsert({
          id: 1,
          temperature_c: data.temp,
          air_humidity_pct: data.hum,
          heat_index_c: data.hi,
          light_pct: data.light,
          raw_ldr_adc: data.raw_ldr,
          is_night: data.night,
          buzzer_active: data.buzzer,
          buzzer_enabled: data.buzzer_en,
          buzzer_reason: data.reason,
          updated_at: nowIso,
        })
        .then();
    }

    // Insert log history to Supabase every 60 seconds
    if (now - lastLogSyncRef.current > 60000) {
      lastLogSyncRef.current = now;
      supabase
        .from('weather_station_logs')
        .insert({
          temperature_c: data.temp,
          air_humidity_pct: data.hum,
          heat_index_c: data.hi,
          light_pct: data.light,
          raw_ldr_adc: data.raw_ldr,
          is_night: data.night,
          buzzer_state: data.buzzer,
          recorded_at: nowIso,
        })
        .then();
    }
  }, []);

  const webSerial = useWebSerial(handleNanoTelemetry);

  // Weather & Climate Push Notification System
  const {
    notifications,
    unreadCount,
    permission: notificationPermission,
    latestToast,
    dismissToast,
    requestPermission: handleRequestPermission,
    triggerTestNotification,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
    clearAll: handleClearAll,
  } = useWeatherNotifications(status, isStationOnline);

  // Sync theme with HTML root and body class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Watchdog: evaluate ESP32 online state (90 seconds threshold)
  const evaluateLiveness = useCallback((updatedAtStr?: string) => {
    if (!updatedAtStr) return;
    const now = Date.now();
    const updateTime = new Date(updatedAtStr).getTime();
    if (updateTime > 0) {
      setLastUpdatedTime(new Date(updateTime).toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
      setIsStationOnline(now - updateTime < 90000); // 90 seconds tolerance
    }
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch current status
      const { data: statusData, error: statusError } = await supabase
        .from('weather_station_status')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!statusError && statusData) {
        setStatus(statusData as WeatherStationStatus);
        evaluateLiveness(statusData.updated_at);
      }

      // 2. Fetch history logs
      const { data: logsData, error: logsError } = await supabase
        .from('weather_station_logs')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(60);

      if (!logsError && logsData) {
        setLogs(logsData as WeatherStationLog[]);
      }
    } catch (err) {
      console.error('Error fetching station data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [evaluateLiveness]);

  // Set up Supabase Realtime Subscription
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('weather-station-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weather_station_status' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newStatus = payload.new as WeatherStationStatus;
            setStatus(newStatus);
            evaluateLiveness(newStatus.updated_at);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weather_station_logs' },
        (payload) => {
          const newLog = payload.new as WeatherStationLog;
          setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        }
      )
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          setIsCloudConnected(true);
        } else if (subStatus === 'CLOSED' || subStatus === 'CHANNEL_ERROR') {
          setIsCloudConnected(false);
        }
      });

    // 5-second interval watchdog
    const interval = setInterval(() => {
      setStatus((current) => {
        evaluateLiveness(current.updated_at);
        return current;
      });
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData, evaluateLiveness]);

  // Handle Mute / Unmute Buzzer Toggle
  const handleToggleMute = async () => {
    const newMuteState = !status.buzzer_enabled;
    // Optimistic UI update
    setStatus((prev) => ({ ...prev, buzzer_enabled: newMuteState }));

    // Send directly over Web Serial USB if connected to Arduino Nano
    if (webSerial.isConnected) {
      webSerial.sendCommand(newMuteState ? 'UNMUTE' : 'MUTE');
    }

    await supabase
      .from('weather_station_status')
      .update({ buzzer_enabled: newMuteState })
      .eq('id', 1);

    await supabase.from('weather_station_commands').insert({
      action: newMuteState ? 'UNMUTE' : 'MUTE',
      status: 'PENDING',
    });
  };

  // Handle Manual 2-Second Buzzer Test
  const handleTestBuzzer = async () => {
    // Send directly over Web Serial USB if connected to Arduino Nano
    if (webSerial.isConnected) {
      webSerial.sendCommand('TEST_BUZZER');
    }

    await supabase.from('weather_station_commands').insert({
      action: 'TEST_BUZZER_2S',
      status: 'PENDING',
    });
  };

  return (
    <div className="min-h-screen pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Floating Realtime Toast Notification */}
      <ToastNotification toast={latestToast} onDismiss={dismissToast} />

      {/* Navigation & Header */}
      <Header
        isCloudConnected={isCloudConnected}
        isStationOnline={isStationOnline}
        isSerialConnected={webSerial.isConnected}
        isSerialSupported={webSerial.isSupported}
        onConnectSerial={webSerial.connect}
        onDisconnectSerial={webSerial.disconnect}
        lastUpdated={lastUpdatedTime}
        buzzerEnabled={status.buzzer_enabled}
        buzzerActive={status.buzzer_active}
        theme={theme}
        notifications={notifications}
        unreadCount={unreadCount}
        notificationPermission={notificationPermission}
        onRequestPermission={handleRequestPermission}
        onTestPush={triggerTestNotification}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAll}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onToggleMute={handleToggleMute}
        onTestBuzzer={handleTestBuzzer}
        onRefresh={fetchData}
      />

      {/* Offline Alert Banner */}
      {!isStationOnline && !isLoading && !webSerial.isConnected && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Stesen Luar Talian (Offline)</h4>
              <p className="text-xs text-slate-600 dark:text-rose-300/80">
                Tiada telemetri dikesan daripada Arduino Nano (kabel USB) atau awan Supabase. Sila sambungkan kabel USB dan klik butang 'Sambung USB Nano' di atas.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
            Terputus
          </span>
        </div>
      )}

      {/* Main Metric Cards (DHT11 Suhu, Kelembapan, Cahaya LDR, Indeks Haba & Buzzer) */}
      <WeatherCards status={status} />

      {/* 3-in-1 Analytics Chart */}
      <StationChart logs={logs} />

      {/* Recent History Events */}
      <RecentEventsTable logs={logs} />

      {/* Footer Branding & Switcher */}
      <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-slate-600 dark:text-slate-400">Politeknik Sultan Haji Ahmad Shah (POLISAS) • Jabatan Kejuruteraan Mekanikal</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Projek Stesen Cuaca & Tanaman IoT</span>
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-bold"
          >
            <span>Buka Dashboard 4-Pasu</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};
