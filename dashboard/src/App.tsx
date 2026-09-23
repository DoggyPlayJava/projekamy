import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import type { PotStatus, MoistureLog, WateringLog } from './types';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { PotCard } from './components/PotCard';
import { MoistureChart } from './components/MoistureChart';
import { WateringLogTable } from './components/WateringLogTable';
import { SimulatorModal } from './components/SimulatorModal';

export const App: React.FC = () => {
  const [pots, setPots] = useState<PotStatus[]>([]);
  const [moistureLogs, setMoistureLogs] = useState<MoistureLog[]>([]);
  const [wateringLogs, setWateringLogs] = useState<WateringLog[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [isEsp32Online, setIsEsp32Online] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      // Considered online if updated within 60 seconds
      setIsEsp32Online(now - mostRecentTime < 60000);
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
    } finally {
      setIsLoading(false);
    }
  }, [evaluateEsp32Liveness]);

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
        }
      });

    // Check liveness interval every 10 seconds
    const interval = setInterval(() => {
      setPots((currentPots) => {
        evaluateEsp32Liveness(currentPots);
        return currentPots;
      });
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData, evaluateEsp32Liveness]);

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

  // Trigger manual watering from website
  const handleTriggerWatering = async (potId: number) => {
    // 1. Optimistic UI update: show pump state true immediately
    setPots((prev) =>
      prev.map((p) =>
        p.pot_id === potId
          ? { ...p, pump_state: true, last_watered_at: new Date().toISOString() }
          : p
      )
    );

    // 2. Insert command into pump_commands for ESP32 to execute
    const { error: cmdError } = await supabase.from('pump_commands').insert({
      pot_id: potId,
      action: 'WATER_NOW',
      duration_seconds: 5,
      status: 'PENDING',
    });

    if (cmdError) {
      console.error('Failed to dispatch pump command:', cmdError);
    }

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
      trigger_type: 'MANUAL',
      duration_seconds: 5,
      moisture_before: pot?.moisture_pct,
    });

    // 5. Auto revert pump state after 5 seconds in UI
    setTimeout(async () => {
      setPots((prev) =>
        prev.map((p) => (p.pot_id === potId ? { ...p, pump_state: false } : p))
      );
      await supabase
        .from('pot_status')
        .update({ pump_state: false })
        .eq('pot_id', potId);
    }, 5000);
  };

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

    await supabase
      .from('pot_status')
      .update({ updated_at: nowIso })
      .gte('pot_id', 1);
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
        />

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="glass-card rounded-3xl p-16 text-center my-12">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-700">Memuatkan data sistem pengairan...</p>
            <p className="text-xs text-slate-400 mt-1">Menghubungkan ke Supabase Cloud Database</p>
          </div>
        ) : (
          <>
            {/* KPI Stats Overview Banner */}
            <StatsOverview pots={pots} wateringLogs={wateringLogs} />

            {/* 4 Interactive Plant Pot Cards Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    Status 4 Pasu Tanaman (Live Status)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Pantau kelembapan tanah dan laksanakan siraman manual bagi setiap pasu
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
                    onTriggerWatering={handleTriggerWatering}
                  />
                ))}
              </div>
            </div>

            {/* Historical Analytics Chart */}
            <MoistureChart moistureLogs={moistureLogs} pots={pots} />

            {/* Recent Watering Events History Table */}
            <WateringLogTable wateringLogs={wateringLogs} />
          </>
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
        />
      </div>
    </div>
  );
};

export default App;
