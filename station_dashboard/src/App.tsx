import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import type { WeatherStationStatus, WeatherStationLog } from './types';
import { Header } from './components/Header';
import { WeatherCards } from './components/WeatherCards';
import { StationChart } from './components/StationChart';
import { RecentEventsTable } from './components/RecentEventsTable';
import { AlertTriangle, ExternalLink, Cpu } from 'lucide-react';

const DEFAULT_STATUS: WeatherStationStatus = {
  id: 1,
  temperature_c: 28.5,
  air_humidity_pct: 65,
  heat_alert: false,
  moisture_pct: 45,
  raw_moisture_adc: 2400,
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
  const [status, setStatus] = useState<WeatherStationStatus>(DEFAULT_STATUS);
  const [logs, setLogs] = useState<WeatherStationLog[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isStationOnline, setIsStationOnline] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Memuatkan...');
  const [isLoading, setIsLoading] = useState(true);

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
    await supabase.from('weather_station_commands').insert({
      action: 'TEST_BUZZER_2S',
      status: 'PENDING',
    });
  };

  return (
    <div className="min-h-screen pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <Header
        isCloudConnected={isCloudConnected}
        isStationOnline={isStationOnline}
        lastUpdated={lastUpdatedTime}
        buzzerEnabled={status.buzzer_enabled}
        buzzerActive={status.buzzer_active}
        onToggleMute={handleToggleMute}
        onTestBuzzer={handleTestBuzzer}
        onRefresh={fetchData}
      />

      {/* Offline Alert Banner */}
      {!isStationOnline && !isLoading && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">ESP32 Luar Talian (Offline)</h4>
              <p className="text-xs text-rose-300/80">
                Tiada data diterima daripada mikropengawal ESP32 dalam tempoh 90 saat. Sila pastikan bekalan kuasa 5V dan hotspot WiFi aktif.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-1 rounded bg-rose-500/20 text-rose-300">
            Terputus
          </span>
        </div>
      )}

      {/* Main Metric Cards (Hujan, Cahaya, Tanah, Buzzer) */}
      <WeatherCards status={status} />

      {/* 3-in-1 Analytics Chart */}
      <StationChart logs={logs} />

      {/* Recent History Events */}
      <RecentEventsTable logs={logs} />

      {/* Footer Branding & Switcher */}
      <footer className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Politeknik Sultan Haji Ahmad Shah (POLISAS) • Jabatan Kejuruteraan Mekanikal</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-slate-400">Projek Stesen Cuaca & Tanaman IoT</span>
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-bold"
          >
            <span>Buka Dashboard 4-Pasu</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};
