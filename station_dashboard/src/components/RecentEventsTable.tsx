import React from 'react';
import { History, Thermometer, Wind, Sun, Droplets, Volume2, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { WeatherStationLog } from '../types';

interface RecentEventsTableProps {
  logs: WeatherStationLog[];
}

export const RecentEventsTable: React.FC<RecentEventsTableProps> = ({ logs }) => {
  const recentLogs = logs.slice(0, 10);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-extrabold text-white tracking-tight">
            Log Sejarah Telemetri Terkini
          </h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-white/5">
          10 Rekod Terkini
        </span>
      </div>

      {recentLogs.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          <p>Belum ada rekod log daripada ESP32.</p>
          <p className="text-xs text-slate-600 mt-1">Rekod akan disimpan secara automatik setiap 1 minit.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Masa & Tarikh</th>
                <th className="py-2.5 px-3">Kelembapan Tanah</th>
                <th className="py-2.5 px-3">Suhu Udara (DHT11)</th>
                <th className="py-2.5 px-3">Kelembapan Udara</th>
                <th className="py-2.5 px-3">Cahaya Sekitar (LDR)</th>
                <th className="py-2.5 px-3 text-right">Status Buzzer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-semibold">
              {recentLogs.map((log) => {
                const date = new Date(log.recorded_at);
                const timeStr = date.toLocaleTimeString('ms-MY', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const dateStr = date.toLocaleDateString('ms-MY', {
                  day: 'numeric',
                  month: 'short',
                });

                const temp = Number(log.temperature_c ?? 28);
                const isExtremeHeat = temp >= 35;

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-white text-xs">{timeStr}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{dateStr}</span>
                      </div>
                    </td>

                    {/* Soil Moisture */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Droplets className={`w-3.5 h-3.5 ${
                          log.moisture_pct >= 60 ? 'text-emerald-400' : log.moisture_pct >= 30 ? 'text-amber-400' : 'text-rose-400'
                        }`} />
                        <span className="font-mono text-slate-200">{log.moisture_pct}%</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          log.moisture_pct >= 60 
                            ? 'bg-emerald-500/10 text-emerald-300' 
                            : log.moisture_pct >= 30 
                            ? 'bg-amber-500/10 text-amber-300' 
                            : 'bg-rose-500/10 text-rose-300'
                        }`}>
                          {log.moisture_pct >= 60 ? 'Lembap' : log.moisture_pct >= 30 ? 'Sederhana' : 'Kering'}
                        </span>
                      </div>
                    </td>

                    {/* Temperature */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Thermometer className={`w-3.5 h-3.5 ${isExtremeHeat ? 'text-rose-400' : temp >= 30 ? 'text-amber-400' : 'text-teal-400'}`} />
                        <span className="font-mono text-slate-200">{temp.toFixed(1)}°C</span>
                        {isExtremeHeat ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            PANAS
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-800 text-slate-400">
                            Normal
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Air Humidity */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-mono text-slate-200">{log.air_humidity_pct ?? 65}%</span>
                        <span className="text-[9px] text-slate-500 font-medium">RH</span>
                      </div>
                    </td>

                    {/* Light LDR */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Sun className={`w-3.5 h-3.5 ${log.is_night ? 'text-indigo-400' : 'text-amber-400'}`} />
                        <span className="font-mono text-slate-200">{log.light_pct}%</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          log.is_night ? 'bg-indigo-500/10 text-indigo-300' : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {log.is_night ? 'Malam' : 'Siang'}
                        </span>
                      </div>
                    </td>

                    {/* Buzzer State */}
                    <td className="py-3 px-3 text-right">
                      {log.buzzer_state ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                          <Volume2 className="w-3 h-3" />
                          AKTIF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                          <ShieldCheck className="w-3 h-3 text-slate-500" />
                          STANDBY
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
