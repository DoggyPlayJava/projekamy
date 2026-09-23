import React from 'react';
import { History, CheckCircle, Smartphone, Cpu, Droplets } from 'lucide-react';
import type { WateringLog } from '../types';

interface WateringLogTableProps {
  wateringLogs: WateringLog[];
}

export const WateringLogTable: React.FC<WateringLogTableProps> = ({ wateringLogs }) => {
  return (
    <div className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              Log Sejarah Siraman Terkini (Watering History)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Rekod setiap kitaran siraman automatik dan manual yang telah dijalankan
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
          {wateringLogs.length} rekod disimpan
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Masa / Tarikh</th>
              <th className="py-3 px-4">Sasaran Pasu</th>
              <th className="py-3 px-4">Punca Tindakan</th>
              <th className="py-3 px-4">Tempoh Siram</th>
              <th className="py-3 px-4">Kelembapan Sebelum</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {wateringLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <Droplets className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Belum ada rekod siraman yang dicatatkan.
                </td>
              </tr>
            ) : (
              wateringLogs.slice(0, 8).map((log) => {
                const date = new Date(log.watered_at);
                const isAuto = log.trigger_type === 'AUTO';

                return (
                  <tr key={log.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {date.toLocaleTimeString('ms-MY', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">
                        ({date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {log.pot_name || `Pasu #${log.pot_id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      {isAuto ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
                          <Cpu className="w-3 h-3" />
                          Auto Sensor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                          <Smartphone className="w-3 h-3" />
                          Manual Web
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      {log.duration_seconds} saat
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {log.moisture_before !== undefined ? (
                        <span className="font-bold text-rose-600">{log.moisture_before}%</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Selesai
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
