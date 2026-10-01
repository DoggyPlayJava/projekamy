import React, { useState } from 'react';
import { TrendingUp, Thermometer, Wind, Sun, Flame, Activity } from 'lucide-react';
import type { WeatherStationLog } from '../types';

interface StationChartProps {
  logs: WeatherStationLog[];
}

export const StationChart: React.FC<StationChartProps> = ({ logs }) => {
  const [showTemp, setShowTemp] = useState(true);
  const [showAirHumidity, setShowAirHumidity] = useState(true);
  const [showHeatIndex, setShowHeatIndex] = useState(true);
  const [showLight, setShowLight] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Fallback dummy data if logs are empty (for fresh setup)
  const displayLogs: WeatherStationLog[] = logs.length > 0 ? logs : Array.from({ length: 12 }, (_, i) => {
    const t = Number((27.5 + Math.sin(i / 2) * 3).toFixed(1));
    const h = 65 + Math.round(Math.cos(i / 2) * 8);
    return {
      id: i + 1,
      temperature_c: t,
      air_humidity_pct: h,
      heat_index_c: Number((t + 1.5).toFixed(1)),
      light_pct: 60 + Math.round(Math.cos(i / 3) * 20),
      is_night: false,
      buzzer_state: false,
      recorded_at: new Date(Date.now() - (12 - i) * 60000).toISOString(),
    };
  });

  const chartHeight = 220;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 25;

  const pointsCount = displayLogs.length;
  const stepX = (chartWidth - paddingX * 2) / Math.max(pointsCount - 1, 1);

  // Compute SVG Points (for temperature/heat index, 0-50°C maps to 0-100% SVG height)
  const getCoordinates = (value: number, index: number, isTemperature = false) => {
    const normalizedVal = isTemperature ? Math.min(Math.max((value / 50) * 100, 0), 100) : Math.min(Math.max(value, 0), 100);
    const x = paddingX + index * stepX;
    const y = chartHeight - paddingY - (normalizedVal / 100) * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const generatePath = (key: 'temperature_c' | 'air_humidity_pct' | 'heat_index_c' | 'light_pct') => {
    const isTemp = key === 'temperature_c' || key === 'heat_index_c';
    return displayLogs
      .map((item, idx) => {
        const val = Number(item[key] ?? (isTemp ? 28 : 50));
        const { x, y } = getCoordinates(val, idx, isTemp);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const generateArea = (key: 'temperature_c' | 'air_humidity_pct' | 'heat_index_c' | 'light_pct') => {
    const linePath = generatePath(key);
    const lastX = paddingX + (pointsCount - 1) * stepX;
    const bottomY = chartHeight - paddingY;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${paddingX} ${bottomY} Z`;
  };

  // Summary Metrics
  const avgTemp = (displayLogs.reduce((acc, l) => acc + (Number(l.temperature_c) || 28), 0) / pointsCount).toFixed(1);
  const avgAirHumidity = Math.round(displayLogs.reduce((acc, l) => acc + (l.air_humidity_pct || 65), 0) / pointsCount);
  const avgHeatIndex = (displayLogs.reduce((acc, l) => acc + (Number(l.heat_index_c) || 29), 0) / pointsCount).toFixed(1);
  const avgLight = Math.round(displayLogs.reduce((acc, l) => acc + (l.light_pct || 0), 0) / pointsCount);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl mb-8">
      {/* Chart Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Analitik Trend Cuaca & Iklim Atmosfera (Masa Nyata)
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Data masa nyata direkodkan dari sensor fizikal ESP32 ke awan Supabase
          </p>
        </div>

        {/* Legend Filter Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Temperature Toggle */}
          <button
            onClick={() => setShowTemp(!showTemp)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showTemp
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10'
                : 'bg-slate-800/60 text-slate-500 border-white/5 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <Thermometer className="w-3.5 h-3.5" />
            <span>Suhu ({avgTemp}°C)</span>
          </button>

          {/* Air Humidity Toggle */}
          <button
            onClick={() => setShowAirHumidity(!showAirHumidity)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showAirHumidity
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-800/60 text-slate-500 border-white/5 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <Wind className="w-3.5 h-3.5" />
            <span>Kelembapan ({avgAirHumidity}%)</span>
          </button>

          {/* Heat Index Toggle */}
          <button
            onClick={() => setShowHeatIndex(!showHeatIndex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showHeatIndex
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/10'
                : 'bg-slate-800/60 text-slate-500 border-white/5 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <Flame className="w-3.5 h-3.5" />
            <span>Indeks Haba ({avgHeatIndex}°C)</span>
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
            {/* Rose Gradient */}
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>

            {/* Cyan Gradient */}
            <linearGradient id="airGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Orange Gradient */}
            <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>

            {/* Amber Gradient */}
            <linearGradient id="lightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
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
          {showTemp && (
            <path d={generateArea('temperature_c')} fill="url(#tempGradient)" />
          )}
          {showAirHumidity && (
            <path d={generateArea('air_humidity_pct')} fill="url(#airGradient)" />
          )}
          {showHeatIndex && (
            <path d={generateArea('heat_index_c')} fill="url(#heatGradient)" />
          )}
          {showLight && (
            <path d={generateArea('light_pct')} fill="url(#lightGradient)" />
          )}

          {/* Line Paths */}
          {showTemp && (
            <path
              d={generatePath('temperature_c')}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showAirHumidity && (
            <path
              d={generatePath('air_humidity_pct')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showHeatIndex && (
            <path
              d={generatePath('heat_index_c')}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeDasharray="3 3"
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
            const ptTemp = getCoordinates(Number(item.temperature_c ?? 28), idx, true);
            const ptAir = getCoordinates(item.air_humidity_pct ?? 65, idx);
            const ptHeat = getCoordinates(Number(item.heat_index_c ?? 29), idx, true);
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
                  x={ptTemp.x - stepX / 2}
                  y={paddingY}
                  width={stepX}
                  height={chartHeight - paddingY * 2}
                  fill="transparent"
                />

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={ptTemp.x}
                    y1={paddingY}
                    x2={ptTemp.x}
                    y2={chartHeight - paddingY}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Visible Dots */}
                {showTemp && (
                  <circle
                    cx={ptTemp.x}
                    cy={ptTemp.y}
                    r={isHovered ? 5 : 2.5}
                    fill="#f43f5e"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                )}
                {showAirHumidity && (
                  <circle
                    cx={ptAir.x}
                    cy={ptAir.y}
                    r={isHovered ? 5 : 2.5}
                    fill="#06b6d4"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                )}
                {showHeatIndex && (
                  <circle
                    cx={ptHeat.x}
                    cy={ptHeat.y}
                    r={isHovered ? 4 : 2}
                    fill="#f97316"
                    stroke="#0f172a"
                    strokeWidth="1"
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
              {showTemp && (
                <div className="flex items-center justify-between gap-3 text-rose-300">
                  <span>🌡️ Suhu Udara:</span>
                  <span className="font-mono">{Number(displayLogs[hoverIndex].temperature_c ?? 28).toFixed(1)}°C</span>
                </div>
              )}
              {showAirHumidity && (
                <div className="flex items-center justify-between gap-3 text-cyan-300">
                  <span>💧 Kelembapan Udara:</span>
                  <span className="font-mono">{displayLogs[hoverIndex].air_humidity_pct ?? 65}% RH</span>
                </div>
              )}
              {showHeatIndex && (
                <div className="flex items-center justify-between gap-3 text-orange-300">
                  <span>🔥 Indeks Haba:</span>
                  <span className="font-mono">{Number(displayLogs[hoverIndex].heat_index_c ?? 29).toFixed(1)}°C</span>
                </div>
              )}
              {showLight && (
                <div className="flex items-center justify-between gap-3 text-amber-300">
                  <span>☀️ Cahaya Suria:</span>
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
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Skala Suhu/Indeks Haba: 0 - 50°C dinormalkan | Frekuensi simpan log: 1 minit</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          Jumlah rekod: {displayLogs.length} titik data
        </span>
      </div>
    </div>
  );
};
