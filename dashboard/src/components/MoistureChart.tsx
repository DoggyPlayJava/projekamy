import React, { useState } from 'react';
import { TrendingUp, Layers } from 'lucide-react';
import type { MoistureLog, PotStatus } from '../types';

interface MoistureChartProps {
  moistureLogs: MoistureLog[];
  pots: PotStatus[];
}

const POT_COLORS = [
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)', name: 'Pasu 1', bg: 'bg-emerald-500' },
  { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.1)', name: 'Pasu 2', bg: 'bg-cyan-500' },
  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)', name: 'Pasu 3', bg: 'bg-blue-500' },
  { stroke: '#84cc16', fill: 'rgba(132, 204, 22, 0.1)', name: 'Pasu 4', bg: 'bg-lime-500' },
];

export const MoistureChart: React.FC<MoistureChartProps> = ({ moistureLogs, pots }) => {
  const [activePotFilters, setActivePotFilters] = useState<number[]>([1, 2, 3, 4]);

  const togglePotFilter = (potId: number) => {
    setActivePotFilters((prev) =>
      prev.includes(potId)
        ? prev.length > 1
          ? prev.filter((id) => id !== potId)
          : prev
        : [...prev, potId]
    );
  };

  // Prepare chart dimensions
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Group logs by pot_id and sort chronologically
  const potLines = [1, 2, 3, 4].map((potId) => {
    const logs = moistureLogs
      .filter((l) => l.pot_id === potId)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-12); // Last 12 points

    return { potId, logs };
  });

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/80 mb-8 shadow-sm">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                Analitik Sejarah Kelembapan Tanah (Live Trend)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pola kelembapan mengikut peredaran masa bagi setiap pasu
              </p>
            </div>
          </div>
        </div>

        {/* Legend / Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {pots.map((pot, idx) => {
            const color = POT_COLORS[idx % POT_COLORS.length];
            const isVisible = activePotFilters.includes(pot.pot_id);

            return (
              <button
                key={pot.pot_id}
                onClick={() => togglePotFilter(pot.pot_id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isVisible
                    ? 'bg-white border-slate-300 shadow-sm text-slate-800'
                    : 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                <span>{pot.pot_name || `Pasu ${pot.pot_id}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 select-none overflow-visible"
        >
          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = padding.top + graphHeight - (val / 100) * graphHeight;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={val === 0 ? '0' : '4 4'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-semibold"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Critical Threshold 35% Guideline */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight - (35 / 100) * graphHeight}
            x2={width - padding.right}
            y2={padding.top + graphHeight - (35 / 100) * graphHeight}
            stroke="#f87171"
            strokeDasharray="6 3"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <text
            x={width - padding.right}
            y={padding.top + graphHeight - (35 / 100) * graphHeight - 6}
            textAnchor="end"
            className="text-[9px] fill-rose-500 font-bold"
          >
            Ambang Kering (35%)
          </text>

          {/* Plot Lines for each Pot */}
          {potLines.map(({ potId, logs }, idx) => {
            if (!activePotFilters.includes(potId) || logs.length === 0) return null;
            const color = POT_COLORS[idx % POT_COLORS.length];

            // Build path points
            const points = logs.map((log, index) => {
              const x =
                logs.length === 1
                  ? padding.left + graphWidth / 2
                  : padding.left + (index / (logs.length - 1)) * graphWidth;
              const y =
                padding.top + graphHeight - (log.moisture_pct / 100) * graphHeight;
              return { x, y, pct: log.moisture_pct, time: log.recorded_at };
            });

            const pathD = points.reduce((acc, pt, i) => {
              return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
            }, '');

            return (
              <g key={potId}>
                {/* Connecting Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#ffffff"
                    stroke={color.stroke}
                    strokeWidth="2.5"
                    className="hover:r-6 transition-all cursor-pointer"
                  >
                    <title>{`${pots[potId - 1]?.pot_name || `Pasu ${potId}`}: ${pt.pct}% (${new Date(
                      pt.time
                    ).toLocaleTimeString('ms-MY')})`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2 font-medium">
        <span>Masa Terdahulu</span>
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-emerald-600" />
          Kemas kini automatik setiap 1 minit
        </span>
        <span>Masa Terkini</span>
      </div>
    </div>
  );
};
