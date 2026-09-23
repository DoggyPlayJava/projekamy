import React from 'react';
import { History, CheckCircle, Smartphone, Cpu, Droplets, Download } from 'lucide-react';
import type { WateringLog } from '../types';

interface WateringLogTableProps {
  wateringLogs: WateringLog[];
}

export const WateringLogTable: React.FC<WateringLogTableProps> = ({ wateringLogs }) => {
  const exportToCSV = () => {
    if (wateringLogs.length === 0) return;

    // Headers
    const headers = [
      'No',
      'Tarikh & Masa',
      'Pasu Tanaman',
      'Punca Tindakan (Mod)',
      'Tempoh Siraman (Saat)',
      'Kelembapan Sebelum (%)',
      'Anggaran Penggunaan Air (mL)',
      'Status'
    ];

    // Rows
    const rows = wateringLogs.map((log, index) => {
      const date = new Date(log.watered_at);
      const formattedDate = `"${date.toLocaleDateString('ms-MY')} ${date.toLocaleTimeString('ms-MY')}"`;
      const pot = `"${log.pot_name || `Pasu #${log.pot_id}`}"`;
      const mode = log.trigger_type === 'AUTO' ? '"Auto (Sensor)"' : '"Manual (Web)"';
      const duration = log.duration_seconds || 5;
      const moisture = log.moisture_before !== undefined ? log.moisture_before : '-';
      const waterUsedMl = duration * 20; // 20 ml/s standard submersible pump rate
      const status = '"Selesai"';

      return [
        index + 1,
        formattedDate,
        pot,
        mode,
        duration,
        moisture,
        waterUsedMl,
        status
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekod_siraman_polisas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
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
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">
            {wateringLogs.length} rekod
          </span>
          <button
            onClick={exportToCSV}
            disabled={wateringLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
            title="Muat turun data untuk lampiran Bab 4 tesis / laporan FYP"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport CSV / Excel
          </button>
        </div>
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
