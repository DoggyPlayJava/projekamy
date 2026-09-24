import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { PotStatus, MoistureLog, WateringLog, IrrigationSchedule } from './types';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { PotCard } from './components/PotCard';
import { ScheduleManager } from './components/ScheduleManager';
import { MoistureChart } from './components/MoistureChart';
import { WateringLogTable } from './components/WateringLogTable';
import { SimulatorModal } from './components/SimulatorModal';
import { WeatherWidget } from './components/WeatherWidget';
import { CostSavingWidget } from './components/CostSavingWidget';
import { OfflineBanner } from './components/OfflineBanner';
import { NavigationTabs, type TabId } from './components/NavigationTabs';
import { useSmartNotifications } from './hooks/useSmartNotifications';

export const App: React.FC = () => {
  const [pots, setPots] = useState<PotStatus[]>([]);
  const [moistureLogs, setMoistureLogs] = useState<MoistureLog[]>([]);
  const [wateringLogs, setWateringLogs] = useState<WateringLog[]>([]);
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [isEsp32Online, setIsEsp32Online] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active navigation tab with persistence
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = localStorage.getItem('smart_irrigation_tab') as TabId;
    return saved && ['garden', 'weather-roi', 'schedules', 'analytics'].includes(saved)
      ? saved
      : 'garden';
  });

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    localStorage.setItem('smart_irrigation_tab', tab);
  };

  // Smart notification hook (adapted from JPP-POLISAS)
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markRead,
    markAllRead,
    clearAll,
  } = useSmartNotifications(pots, isEsp32Online);

  // Check if ESP32 sent telemetry in the last 60 seconds
  const evaluateEsp32Liveness = useCallback((potsList: PotStatus[]) => {
    if (potsList.length === 0) return;
    const now = new Date().getTime();
    let mostRecentTime = 0;

    potsList.forEach((p) => {
      if (p.updated_at) {
        const time = new Date(p.updated_at).getTime();
        if (time > mostRecentTime) mostRecentTime = time;
      }
    });

    if (mostRecentTime > 0) {
      setLastUpdatedTime(new Date(mostRecentTime).toISOString());
      // Considered online if updated within 90 seconds (resilient to minor network jitter)
      setIsEsp32Online(now - mostRecentTime < 90000);
    }
  }, []);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    const { data: schedData, error } = await supabase
      .from('irrigation_schedules')
      .select('*')
      .order('time_of_day', { ascending: true });

    if (!error && schedData) {
      setSchedules(schedData as IrrigationSchedule[]);
    }
  }, []);

  // Fetch initial data from Supabase
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch 4 pots
      const { data: potData, error: potError } = await supabase
        .from('pot_status')
        .select('*')
        .order('pot_id', { ascending: true });

      if (potError) {
        console.error('Error fetching pot_status:', potError);
      } else if (potData) {
        setPots(potData as PotStatus[]);
        evaluateEsp32Liveness(potData as PotStatus[]);
      }

      // 2. Fetch moisture logs for charts
      const { data: mLogs, error: mError } = await supabase
        .from('moisture_logs')
        .select('*')
        .order('recorded_at', { ascending: true })
        .limit(60);

      if (mError) {
        console.error('Error fetching moisture_logs:', mError);
      } else if (mLogs) {
        setMoistureLogs(mLogs as MoistureLog[]);
      }

      // 3. Fetch watering history
      const { data: wLogs, error: wError } = await supabase
        .from('watering_logs')
        .select('*')
        .order('watered_at', { ascending: false })
        .limit(20);

      if (wError) {
        console.error('Error fetching watering_logs:', wError);
      } else if (wLogs) {
        setWateringLogs(wLogs as WateringLog[]);
      }

      // 4. Fetch schedules
      await fetchSchedules();
    } finally {
      setIsLoading(false);
    }
  }, [evaluateEsp32Liveness, fetchSchedules]);

  // Set up Supabase Realtime WebSocket Subscription
  useEffect(() => {
    fetchData();

    // Subscribe to realtime database changes
    const channel = supabase
      .channel('agro-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pot_status' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as PotStatus;
            setPots((prev) => {
              const next = prev.map((p) => (p.pot_id === updated.pot_id ? updated : p));
              evaluateEsp32Liveness(next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'watering_logs' },
        (payload) => {
          const newLog = payload.new as WateringLog;
          setWateringLogs((prev) => [newLog, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moisture_logs' },
        (payload) => {
          const newLog = payload.new as MoistureLog;
          setMoistureLogs((prev) => [...prev.slice(-59), newLog]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'irrigation_schedules' },
        () => {
          fetchSchedules();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
        }
      });

    // Check liveness interval every 5 seconds (active watchdog)
    const interval = setInterval(() => {
      setPots((currentPots) => {
        evaluateEsp32Liveness(currentPots);
        return currentPots;
      });
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData, evaluateEsp32Liveness, fetchSchedules]);

  // Update pot attributes (name, threshold, auto_mode) in Supabase
  const handleUpdatePot = async (potId: number, updates: Partial<PotStatus>) => {
    // Optimistic UI update
    setPots((prev) =>
      prev.map((p) => (p.pot_id === potId ? { ...p, ...updates } : p))
    );

    const { error } = await supabase
      .from('pot_status')
      .update(updates)
      .eq('pot_id', potId);

    if (error) {
      console.error('Failed to update pot in Supabase:', error);
      fetchData(); // Rollback if error
    }
  };

  // Trigger manual or scheduled watering
  const handleTriggerWatering = async (
    potId: number,
    durationSec: number = 5,
    triggerType: 'MANUAL' | 'SCHEDULE' = 'MANUAL'
  ) => {
    // 1. Optimistic UI update: show pump state true immediately
    setPots((prev) =>
      prev.map((p) =>
        p.pot_id === potId
          ? { ...p, pump_state: true, last_watered_at: new Date().toISOString() }
          : p
      )
    );

    // 2. Insert command into pump_commands for ESP32 to execute
    await supabase.from('pump_commands').insert({
      pot_id: potId,
      action: 'WATER_NOW',
      duration_seconds: durationSec,
      status: 'PENDING',
    });

    // 3. Update pot_status table pump_state
    await supabase
      .from('pot_status')
      .update({
        pump_state: true,
        last_watered_at: new Date().toISOString(),
      })
      .eq('pot_id', potId);

    // 4. Create record in watering_logs
    const pot = pots.find((p) => p.pot_id === potId);
    await supabase.from('watering_logs').insert({
      pot_id: potId,
      pot_name: pot?.pot_name || `Pasu ${potId}`,
      trigger_type: triggerType,
      duration_seconds: durationSec,
      moisture_before: pot?.moisture_pct,
    });

    // 5. Auto revert pump state after duration in UI
    setTimeout(async () => {
      setPots((prev) =>
        prev.map((p) => (p.pot_id === potId ? { ...p, pump_state: false } : p))
      );
      await supabase
        .from('pot_status')
        .update({ pump_state: false })
        .eq('pot_id', potId);
    }, durationSec * 1000);
  };

  // Schedule Management Handlers
  const handleAddSchedule = async (
    newSched: Omit<IrrigationSchedule, 'id' | 'created_at'>
  ) => {
    const { error } = await supabase.from('irrigation_schedules').insert(newSched);
    if (!error) fetchSchedules();
  };

  const handleToggleSchedule = async (id: number, currentEnabled: boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_enabled: !currentEnabled } : s))
    );
    await supabase
      .from('irrigation_schedules')
      .update({ is_enabled: !currentEnabled })
      .eq('id', id);
  };

  const handleDeleteSchedule = async (id: number) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    await supabase.from('irrigation_schedules').delete().eq('id', id);
  };

  const handleExecuteSchedule = async (sched: IrrigationSchedule) => {
    for (const potId of sched.target_pots) {
      const pot = pots.find((p) => p.pot_id === potId);

      // Smart Skip check: If soil is already wet (> threshold), skip watering
      if (sched.skip_if_wet && pot && pot.moisture_pct > pot.threshold_pct) {
        console.log(
          `[Smart Skip] Pasu ${potId} masih lembap (${pot.moisture_pct}% > ${pot.threshold_pct}%). Siraman dilangkau.`
        );
        continue;
      }

      await handleTriggerWatering(potId, sched.duration_seconds, 'SCHEDULE');
    }

    await supabase
      .from('irrigation_schedules')
      .update({ last_executed_at: new Date().toISOString() })
      .eq('id', sched.id);
  };

  // Background Automatic Schedule Evaluator
  const potsRef = useRef(pots);
  potsRef.current = pots;
  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;

  useEffect(() => {
    const scheduleChecker = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`; // "08:00"

      schedulesRef.current.forEach((sched) => {
        if (!sched.is_enabled) return;
        const schedTimeStr = sched.time_of_day.slice(0, 5); // "08:00"

        if (currentTimeStr === schedTimeStr) {
          const lastExec = sched.last_executed_at
            ? new Date(sched.last_executed_at).getTime()
            : 0;
          // Run once per minute
          if (now.getTime() - lastExec > 65000) {
            console.log(`[JADUAL AUTOMATIK] Menjalankan: ${sched.label} (${schedTimeStr})`);
            handleExecuteSchedule(sched);
          }
        }
      });
    }, 30000);

    return () => clearInterval(scheduleChecker);
  }, []);

  // Simulation handler for demo
  const handleSimulatePotUpdate = async (
    potId: number,
    moisturePct: number,
    pumpState: boolean
  ) => {
    const nowIso = new Date().toISOString();

    setPots((prev) =>
      prev.map((p) =>
        p.pot_id === potId
          ? {
              ...p,
              moisture_pct: moisturePct,
              pump_state: pumpState,
              updated_at: nowIso,
            }
          : p
      )
    );

    await supabase
      .from('pot_status')
      .update({
        moisture_pct: moisturePct,
        pump_state: pumpState,
        updated_at: nowIso,
      })
      .eq('pot_id', potId);

    // Also record moisture log
    await supabase.from('moisture_logs').insert({
      pot_id: potId,
      moisture_pct: moisturePct,
      recorded_at: nowIso,
    });

    setMoistureLogs((prev) => [
      ...prev,
      {
        id: Date.now(),
        pot_id: potId,
        moisture_pct: moisturePct,
        recorded_at: nowIso,
      },
    ]);
  };

  // Heartbeat ping simulation
  const handleSimulatePingEsp32 = async () => {
    const nowIso = new Date().toISOString();
    setLastUpdatedTime(nowIso);
    setIsEsp32Online(true);
    setPots((prev) => prev.map((p) => ({ ...p, updated_at: nowIso })));

    await supabase
      .from('pot_status')
      .update({ updated_at: nowIso })
      .gte('pot_id', 1);
  };

  // Heartbeat disconnect simulation (for demoing offline watchdog)
  const handleSimulateDisconnectEsp32 = () => {
    const oldTimeIso = new Date(Date.now() - 90000).toISOString(); // 90 seconds ago
    setLastUpdatedTime(oldTimeIso);
    setIsEsp32Online(false);
    setPots((prev) => prev.map((p) => ({ ...p, updated_at: oldTimeIso })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-slate-50 to-green-100/60 p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <Header
          isRealtimeConnected={isRealtimeConnected}
          isEsp32Online={isEsp32Online}
          lastUpdatedTime={lastUpdatedTime}
          onRefresh={fetchData}
          onToggleSimulator={() => setIsSimulatorOpen((v) => !v)}
          isSimulatorOpen={isSimulatorOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          permission={permission}
          onRequestPermission={requestPermission}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClearAll={clearAll}
        />

        {/* Offline Watchdog Banner (Active Fail-Safe Alert) */}
        <OfflineBanner
          isEsp32Online={isEsp32Online}
          lastUpdatedTime={lastUpdatedTime}
          onRefresh={fetchData}
        />

        {/* Floating Glass Navigation Tabs */}
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeSchedulesCount={schedules.filter((s) => s.is_enabled).length}
          wateringLogsCount={wateringLogs.length}
        />

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="glass-card rounded-3xl p-16 text-center my-12">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-700">Memuatkan data sistem pengairan...</p>
            <p className="text-xs text-slate-400 mt-1">Menghubungkan ke Supabase Cloud Database</p>
          </div>
        ) : (
          <main className="min-h-[500px]">
            {/* TAB 1: 🌿 Pasu & Pemantauan (Live Garden) */}
            {activeTab === 'garden' && (
              <div className="animate-fade-in space-y-8">
                {/* KPI Stats Overview Banner */}
                <StatsOverview pots={pots} wateringLogs={wateringLogs} />

                {/* 4 Interactive Plant Pot Cards Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                        Status 4 Pasu Tanaman (Live Garden)
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Pantau kelembapan tanah, pilih pratetap tanaman, dan kawal siraman manual
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full">
                      4 Pasu Beroperasi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pots.map((pot) => (
                      <PotCard
                        key={pot.pot_id}
                        pot={pot}
                        onUpdatePot={handleUpdatePot}
                        onTriggerWatering={(pId) => handleTriggerWatering(pId, 5, 'MANUAL')}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ⛅ Kecerdasan Cuaca & Kos (Weather & ROI) */}
            {activeTab === 'weather-roi' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                      Kecerdasan Cuaca & Analisis Impak Kos
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Integrasi ramalan cuaca automatik Kuantan dan kalkulator pulangan pelaburan (ROI) agrikultur
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sky-800 bg-sky-100/80 border border-sky-200 px-3 py-1 rounded-full">
                    Open-Meteo & PAIP Pahang
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WeatherWidget />
                  <CostSavingWidget />
                </div>
              </div>
            )}

            {/* TAB 3: ⏰ Jadual Siraman Pintar (Schedules) */}
            {activeTab === 'schedules' && (
              <div className="animate-fade-in space-y-6">
                <ScheduleManager
                  schedules={schedules}
                  pots={pots}
                  onAddSchedule={handleAddSchedule}
                  onToggleSchedule={handleToggleSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onExecuteScheduleNow={handleExecuteSchedule}
                />
              </div>
            )}

            {/* TAB 4: 📊 Log & Analitik Data (Analytics & CSV Export) */}
            {activeTab === 'analytics' && (
              <div className="animate-fade-in space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                      Analisis Data & Log Sejarah Pengairan
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Siri masa kelembapan tanah dan rekod lengkap kitaran siraman untuk Bab 4 tesis FYP
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-800 bg-purple-100/80 border border-purple-200 px-3 py-1 rounded-full">
                    Format Bab 4 Laporan FYP
                  </span>
                </div>

                {/* Historical Analytics Chart */}
                <MoistureChart moistureLogs={moistureLogs} pots={pots} />

                {/* Recent Watering Events History Table */}
                <WateringLogTable wateringLogs={wateringLogs} />
              </div>
            )}
          </main>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400 font-medium pb-6">
          <p>
            Projek Tahun Akhir (FYP) — Sistem Pengairan Pintar Bersepadu IoT • Politeknik Sultan Haji Ahmad Shah
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Dikuasakan oleh ESP32 Microcontroller, Supabase Realtime & Vite React Dashboard
          </p>
        </footer>

        {/* Hardware Simulator Drawer/Modal for Easy Demo */}
        <SimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          pots={pots}
          onSimulatePotUpdate={handleSimulatePotUpdate}
          onSimulatePingEsp32={handleSimulatePingEsp32}
          onSimulateDisconnectEsp32={handleSimulateDisconnectEsp32}
        />
      </div>
    </div>
  );
};

export default App;
