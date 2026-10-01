import React, { useState } from 'react';
import { TrendingUp, Droplets, CloudRain, Sun, Activity } from 'lucide-react';
import type { WeatherStationLog } from '../types';

interface StationChartProps {
  logs: WeatherStationLog[];
}

export const StationChart: React.FC<StationChartProps> = ({ logs }) => {
  const [showMoisture, setShowMoisture] = useState(true);
  const [showRain, setShowRain] = useState(true);
  const [showLight, setShowLight] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Fallback dummy data if logs are empty (for fresh setup)
  const displayLogs = logs.length > 0 ? logs : Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    moisture_pct: 45 + Math.round(Math.sin(i / 2) * 10),
    rain_intensity_pct: i > 7 ? 65 : 0,
    rain_detected: i > 7,
    light_pct: 60 + Math.round(Math.cos(i / 3) * 20),
    is_night: false,
    buzzer_state: i > 7,
    recorded_at: new Date(Date.now() - (12 - i) * 60000).toISOString(),
  }));

  const chartHeight = 220;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 25;

  const pointsCount = displayLogs.length;
  const stepX = (chartWidth - paddingX * 2) / Math.max(pointsCount - 1, 1);

  // Compute SVG Points
  const getCoordinates = (value: number, index: number) => {
    const x = paddingX + index * stepX;
    const y = chartHeight - paddingY - (value / 100) * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const generatePath = (key: 'moisture_pct' | 'rain_intensity_pct' | 'light_pct') => {
    return displayLogs
      .map((item, idx) => {
        const { x, y } = getCoordinates(item[key], idx);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const generateArea = (key: 'moisture_pct' | 'rain_intensity_pct' | 'light_pct') => {
    const linePath = generatePath(key);
    const lastX = paddingX + (pointsCount - 1) * stepX;
    const bottomY = chartHeight - paddingY;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${paddingX} ${bottomY} Z`;
  };

  // Summary Metrics
  const avgMoisture = Math.round(displayLogs.reduce((acc, l) => acc + l.moisture_pct, 0) / pointsCount);
  const avgRain = Math.round(displayLogs.reduce((acc, l) => acc + l.rain_intensity_pct, 0) / pointsCount);
  const avgLight = Math.round(displayLogs.reduce((acc, l) => acc + l.light_pct, 0) / pointsCount);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl mb-8">
      {/* Chart Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Analitik Trend Cuaca & Tanah (3-dalam-1)
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Data masa nyata direkodkan dari sensor fizikal ESP32 ke awan Supabase
          </p>
        </div>

        {/* Legend Filter Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Moisture Toggle */}
          <button
            onClick={() => setShowMoisture(!showMoisture)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showMoisture
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-800/60 text-slate-500 border-white/5 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <Droplets className="w-3.5 h-3.5" />
            <span>Tanah ({avgMoisture}%)</span>
          </button>

          {/* Rain Toggle */}
          <button
            onClick={() => setShowRain(!showRain)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showRain
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-800/60 text-slate-500 border-white/5 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <CloudRain className="w-3.5 h-3.5" />
            <span>Hujan ({avgRain}%)</span>
          </button>

          {/* Light Toggle */}
          <button
            onClick={() => setShowLight(!showLight)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showLight
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-slate-800/60 text-slate-500 border-white/5 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <Sun className="w-3.5 h-3.5" />
            <span>Cahaya ({avgLight}%)</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Area */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Emerald Gradient */}
            <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Cyan Gradient */}
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Amber Gradient */}
            <linearGradient id="lightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (0%, 25%, 50%, 75%, 100%) */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = chartHeight - paddingY - (val / 100) * (chartHeight - paddingY * 2);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Filled Areas */}
          {showMoisture && (
            <path d={generateArea('moisture_pct')} fill="url(#moistureGradient)" />
          )}
          {showRain && (
            <path d={generateArea('rain_intensity_pct')} fill="url(#rainGradient)" />
          )}
          {showLight && (
            <path d={generateArea('light_pct')} fill="url(#lightGradient)" />
          )}

          {/* Line Paths */}
          {showMoisture && (
            <path
              d={generatePath('moisture_pct')}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showRain && (
            <path
              d={generatePath('rain_intensity_pct')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showLight && (
            <path
              d={generatePath('light_pct')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points & Hover Targets */}
          {displayLogs.map((item, idx) => {
            const ptMoisture = getCoordinates(item.moisture_pct, idx);
            const ptRain = getCoordinates(item.rain_intensity_pct, idx);
            const ptLight = getCoordinates(item.light_pct, idx);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={item.id || idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                {/* Invisible hover bar */}
                <rect
                  x={ptMoisture.x - stepX / 2}
                  y={paddingY}
                  width={stepX}
                  height={chartHeight - paddingY * 2}
                  fill="transparent"
                />

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={ptMoisture.x}
                    y1={paddingY}
                    x2={ptMoisture.x}
                    y2={chartHeight - paddingY}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Visible Dots */}
                {showMoisture && (
                  <circle
                    cx={ptMoisture.x}
                    cy={ptMoisture.y}
                    r={isHovered ? 5 : 2.5}
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                )}
                {showRain && (
                  <circle
                    cx={ptRain.x}
                    cy={ptRain.y}
                    r={isHovered ? 5 : 2.5}
                    fill="#06b6d4"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                )}
                {showLight && (
                  <circle
                    cx={ptLight.x}
                    cy={ptLight.y}
                    r={isHovered ? 5 : 2.5}
                    fill="#f59e0b"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Interactive Hover Tooltip */}
        {hoverIndex !== null && displayLogs[hoverIndex] && (
          <div
            className="absolute top-2 pointer-events-none p-2.5 rounded-xl bg-slate-800/95 backdrop-blur-md border border-white/10 shadow-2xl text-xs z-30 transition-all"
            style={{
              left: `${Math.min(Math.max((hoverIndex / (pointsCount - 1)) * 100, 10), 85)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-[10px] font-mono text-slate-400 border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between gap-3">
              <span>Masa:</span>
              <span className="text-white font-bold">
                {new Date(displayLogs[hoverIndex].recorded_at).toLocaleTimeString('ms-MY', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </p>
            <div className="space-y-1 font-semibold text-[11px]">
              {showMoisture && (
                <div className="flex items-center justify-between gap-3 text-emerald-300">
                  <span>🌿 Tanah:</span>
                  <span className="font-mono">{displayLogs[hoverIndex].moisture_pct}%</span>
                </div>
              )}
              {showRain && (
                <div className="flex items-center justify-between gap-3 text-cyan-300">
                  <span>🌧️ Hujan:</span>
                  <span className="font-mono">{displayLogs[hoverIndex].rain_intensity_pct}%</span>
                </div>
              )}
              {showLight && (
                <div className="flex items-center justify-between gap-3 text-amber-300">
                  <span>☀️ Cahaya:</span>
                  <span className="font-mono">{displayLogs[hoverIndex].light_pct}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Indicator */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Frekuensi kemaskini: Setiap 1 minit ke Supabase</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          Jumlah rekod: {displayLogs.length} titik data
        </span>
      </div>
    </div>
  );
};
