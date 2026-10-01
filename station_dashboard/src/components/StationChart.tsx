import React, { useState, useMemo } from 'react';
import { TrendingUp, Thermometer, Wind, Sun, Flame, Activity, ZoomIn, Maximize2 } from 'lucide-react';
import type { WeatherStationLog } from '../types';

interface StationChartProps {
  logs: WeatherStationLog[];
}

export const StationChart: React.FC<StationChartProps> = ({ logs }) => {
  const [showTemp, setShowTemp] = useState(true);
  const [showAirHumidity, setShowAirHumidity] = useState(true);
  const [showHeatIndex, setShowHeatIndex] = useState(true);
  const [showLight, setShowLight] = useState(false); // Default OFF for Cahaya as requested so Suhu & Kelembapan auto-zoom!
  const [autoZoom, setAutoZoom] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 1. Prepare chronological data (oldest -> newest, left -> right)
  const baseLogs = logs.length > 0 ? [...logs].reverse() : [];
  
  // If only 1 log exists so far, duplicate one initial point 1 min prior for a nice flat start
  const chartData: WeatherStationLog[] = useMemo(() => {
    if (baseLogs.length === 1) {
      const p = baseLogs[0];
      const prevTime = new Date(new Date(p.recorded_at).getTime() - 60000).toISOString();
      return [{ ...p, id: p.id - 0.5, recorded_at: prevTime }, p];
    }
    if (baseLogs.length > 1) {
      return baseLogs;
    }
    // Fallback dummy data if no records exist yet
    return Array.from({ length: 12 }, (_, i) => {
      const t = Number((27.8 + Math.sin(i / 1.5) * 1.8).toFixed(1));
      const h = 52 + Math.round(Math.cos(i / 2) * 5);
      return {
        id: i + 1,
        temperature_c: t,
        air_humidity_pct: h,
        heat_index_c: Number((t + 1.2).toFixed(1)),
        light_pct: 70 + Math.round(Math.cos(i / 3) * 20),
        is_night: false,
        buzzer_state: false,
        recorded_at: new Date(Date.now() - (12 - i) * 60000).toISOString(),
      };
    });
  }, [baseLogs]);

  const chartHeight = 260;
  const chartWidth = 720;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 40;

  const pointsCount = chartData.length;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const stepX = usableWidth / Math.max(pointsCount - 1, 1);

  // 2. Dynamic Auto-Scale (Auto-Zoom) calculation based ONLY on enabled series
  const { scaleMin, scaleMax, unitLabel } = useMemo(() => {
    if (!autoZoom) {
      return { scaleMin: 0, scaleMax: 100, unitLabel: '%' };
    }

    const activeValues: number[] = [];
    chartData.forEach((item) => {
      if (showTemp && item.temperature_c != null) activeValues.push(Number(item.temperature_c));
      if (showHeatIndex && item.heat_index_c != null) activeValues.push(Number(item.heat_index_c));
      if (showAirHumidity && item.air_humidity_pct != null) activeValues.push(Number(item.air_humidity_pct));
      if (showLight && item.light_pct != null) activeValues.push(Number(item.light_pct));
    });

    if (activeValues.length === 0) {
      return { scaleMin: 0, scaleMax: 100, unitLabel: '%' };
    }

    const rawMin = Math.min(...activeValues);
    const rawMax = Math.max(...activeValues);
    const delta = rawMax - rawMin;

    let sMin: number;
    let sMax: number;

    if (delta < 2) {
      // Very narrow range (e.g. 28.0 - 28.5 C) -> add 1.5 C padding top & bottom for dramatic curve visibility!
      sMin = Math.max(0, Math.floor(rawMin - 1.5));
      sMax = Math.ceil(rawMax + 1.5);
    } else {
      // Add 12% breathing space top and bottom
      sMin = Math.max(0, Math.floor(rawMin - delta * 0.12));
      sMax = Math.ceil(rawMax + delta * 0.12);
    }

    // Determine primary unit label
    const onlyTemperature = (showTemp || showHeatIndex) && !showAirHumidity && !showLight;
    const unit = onlyTemperature ? '°C' : '%';

    return { scaleMin: sMin, scaleMax: sMax, unitLabel: unit };
  }, [chartData, showTemp, showHeatIndex, showAirHumidity, showLight, autoZoom]);

  const scaleRange = Math.max(scaleMax - scaleMin, 1);

  // 3. Coordinate calculation
  const getCoordinates = (value: number, index: number) => {
    const clampedVal = Math.min(Math.max(value, scaleMin), scaleMax);
    const x = paddingLeft + index * stepX;
    const y = chartHeight - paddingBottom - ((clampedVal - scaleMin) / scaleRange) * usableHeight;
    return { x, y };
  };

  // 4. Smooth Bezier Curve (Spline) Generator
  const generateSmoothPath = (key: 'temperature_c' | 'air_humidity_pct' | 'heat_index_c' | 'light_pct') => {
    const points = chartData.map((item, idx) => {
      const val = Number(item[key] ?? scaleMin);
      return getCoordinates(val, idx);
    });

    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    if (points.length === 2) {
      return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
    }

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const generateSmoothArea = (key: 'temperature_c' | 'air_humidity_pct' | 'heat_index_c' | 'light_pct') => {
    const linePath = generateSmoothPath(key);
    if (!linePath) return '';
    const lastX = paddingLeft + (pointsCount - 1) * stepX;
    const bottomY = chartHeight - paddingBottom;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${paddingLeft} ${bottomY} Z`;
  };

  // 5. Grid Ticks (5 values)
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((factor) => {
    const val = scaleMin + factor * scaleRange;
    return {
      value: val,
      y: chartHeight - paddingBottom - factor * usableHeight,
      label: val % 1 === 0 ? val.toFixed(0) : val.toFixed(1),
    };
  });

  // 6. Timeline X-Axis Ticks (up to 6 points across)
  const timelineTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const maxLabels = Math.min(6, chartData.length);
    const step = Math.max(1, Math.floor((chartData.length - 1) / (maxLabels - 1)));
    const indices: number[] = [];
    for (let i = 0; i < chartData.length; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== chartData.length - 1) {
      indices.push(chartData.length - 1);
    }

    return indices.map((idx) => {
      const item = chartData[idx];
      const d = new Date(item.recorded_at);
      const timeStr = d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
      return {
        x: paddingLeft + idx * stepX,
        time: timeStr,
      };
    });
  }, [chartData, stepX]);

  // Statistics Summary
  const tempValues = chartData.map((d) => Number(d.temperature_c ?? 28));
  const minTemp = Math.min(...tempValues).toFixed(1);
  const maxTemp = Math.max(...tempValues).toFixed(1);
  const avgTemp = (tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1);

  const currentItem = chartData[chartData.length - 1];

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-xl mb-8 transition-all">
      {/* Chart Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Analitik Trend Cuaca & Iklim Atmosfera
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Penskalaan dinamik pintar dengan lengkungan spline meteorologi profesional
              </p>
            </div>
          </div>
        </div>

        {/* Legend Controls & Auto-Scale Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-Zoom Toggle Button */}
          <button
            onClick={() => setAutoZoom(!autoZoom)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              autoZoom
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-white/10'
            }`}
            title="Penskalaan auto-zoom: membesarkan turun-naik suhu dan kelembapan secara terperinci"
          >
            {autoZoom ? <ZoomIn className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{autoZoom ? 'Auto-Zoom: AKTIF' : 'Skala: 0-100%'}</span>
          </button>

          {/* Temperature Toggle */}
          <button
            onClick={() => setShowTemp(!showTemp)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showTemp
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <Thermometer className="w-3.5 h-3.5" />
            <span>Suhu ({Number(currentItem?.temperature_c ?? 28).toFixed(1)}°C)</span>
          </button>

          {/* Air Humidity Toggle */}
          <button
            onClick={() => setShowAirHumidity(!showAirHumidity)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showAirHumidity
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <Wind className="w-3.5 h-3.5" />
            <span>Kelembapan ({currentItem?.air_humidity_pct ?? 50}%)</span>
          </button>

          {/* Heat Index Toggle */}
          <button
            onClick={() => setShowHeatIndex(!showHeatIndex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showHeatIndex
                ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <Flame className="w-3.5 h-3.5" />
            <span>Indeks Haba ({Number(currentItem?.heat_index_c ?? 29).toFixed(1)}°C)</span>
          </button>

          {/* Light Toggle */}
          <button
            onClick={() => setShowLight(!showLight)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showLight
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5 opacity-60'
            }`}
            title="Klik untuk papar/sembunyi Cahaya (LDR). Bila ditutup, graf suhu akan dizoom secara mendalam."
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <Sun className="w-3.5 h-3.5" />
            <span>Cahaya ({currentItem?.light_pct ?? 0}%)</span>
          </button>
        </div>
      </div>

      {/* Meteorological Summary Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Min Suhu:</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{minTemp}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Maks Suhu:</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{maxTemp}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Purata:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-white">{avgTemp}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Julat Skala:</span>
          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
            {scaleMin} - {scaleMax}{unitLabel}
          </span>
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

            {/* Sky Gradient */}
            <linearGradient id="airGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>

            {/* Orange Gradient */}
            <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
            </linearGradient>

            {/* Amber Gradient */}
            <linearGradient id="lightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Dynamic Y-Axis Labels */}
          {gridTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={chartWidth - paddingRight}
                y2={tick.y}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] font-bold"
              >
                {tick.label}{unitLabel}
              </text>
            </g>
          ))}

          {/* Filled Areas with smooth Bezier splines */}
          {showTemp && (
            <path d={generateSmoothArea('temperature_c')} fill="url(#tempGradient)" />
          )}
          {showAirHumidity && (
            <path d={generateSmoothArea('air_humidity_pct')} fill="url(#airGradient)" />
          )}
          {showHeatIndex && (
            <path d={generateSmoothArea('heat_index_c')} fill="url(#heatGradient)" />
          )}
          {showLight && (
            <path d={generateSmoothArea('light_pct')} fill="url(#lightGradient)" />
          )}

          {/* Smooth Spline Lines */}
          {showTemp && (
            <path
              d={generateSmoothPath('temperature_c')}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showAirHumidity && (
            <path
              d={generateSmoothPath('air_humidity_pct')}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showHeatIndex && (
            <path
              d={generateSmoothPath('heat_index_c')}
              fill="none"
              stroke="#ea580c"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showLight && (
            <path
              d={generateSmoothPath('light_pct')}
              fill="none"
              stroke="#eab308"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Bottom Timeline Axis Line */}
          <line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={chartWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.2"
          />

          {/* Bottom Timeline X-Axis Labels */}
          {timelineTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={chartHeight - paddingBottom}
                x2={tick.x}
                y2={chartHeight - paddingBottom + 5}
                className="stroke-slate-400 dark:stroke-slate-600"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={chartHeight - paddingBottom + 18}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 font-mono text-[9px] font-semibold"
              >
                {tick.time}
              </text>
            </g>
          ))}

          {/* Data Points & Interactive Hover Columns */}
          {chartData.map((item, idx) => {
            const ptTemp = getCoordinates(Number(item.temperature_c ?? scaleMin), idx);
            const ptAir = getCoordinates(item.air_humidity_pct ?? scaleMin, idx);
            const ptHeat = getCoordinates(Number(item.heat_index_c ?? scaleMin), idx);
            const ptLight = getCoordinates(item.light_pct ?? scaleMin, idx);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={item.id || idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                {/* Full vertical hover target */}
                <rect
                  x={ptTemp.x - stepX / 2}
                  y={paddingTop}
                  width={stepX}
                  height={usableHeight}
                  fill="transparent"
                />

                {/* Vertical hover crosshair */}
                {isHovered && (
                  <line
                    x1={ptTemp.x}
                    y1={paddingTop}
                    x2={ptTemp.x}
                    y2={chartHeight - paddingBottom}
                    className="stroke-cyan-500/80"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Glowing Nodes */}
                {showTemp && (
                  <circle
                    cx={ptTemp.x}
                    cy={ptTemp.y}
                    r={isHovered ? 5.5 : 3}
                    fill="#f43f5e"
                    className="stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                )}
                {showAirHumidity && (
                  <circle
                    cx={ptAir.x}
                    cy={ptAir.y}
                    r={isHovered ? 5.5 : 3}
                    fill="#0284c7"
                    className="stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                )}
                {showHeatIndex && (
                  <circle
                    cx={ptHeat.x}
                    cy={ptHeat.y}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#ea580c"
                    className="stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                )}
                {showLight && (
                  <circle
                    cx={ptLight.x}
                    cy={ptLight.y}
                    r={isHovered ? 5.5 : 3}
                    fill="#eab308"
                    className="stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* High-Definition Interactive Tooltip */}
        {hoverIndex !== null && chartData[hoverIndex] && (
          <div
            className="absolute top-2 pointer-events-none p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl text-xs z-30 transition-all duration-150"
            style={{
              left: `${Math.min(Math.max((hoverIndex / Math.max(pointsCount - 1, 1)) * 100, 10), 85)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 pb-1.5 mb-2 flex items-center justify-between gap-4">
              <span>Masa Rekod:</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {new Date(chartData[hoverIndex].recorded_at).toLocaleTimeString('ms-MY', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </p>
            <div className="space-y-1.5 font-bold text-[11px]">
              {showTemp && (
                <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Suhu Udara:
                  </span>
                  <span className="font-mono">{Number(chartData[hoverIndex].temperature_c ?? 28).toFixed(1)}°C</span>
                </div>
              )}
              {showAirHumidity && (
                <div className="flex items-center justify-between gap-4 text-sky-600 dark:text-sky-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Kelembapan:
                  </span>
                  <span className="font-mono">{chartData[hoverIndex].air_humidity_pct ?? 65}% RH</span>
                </div>
              )}
              {showHeatIndex && (
                <div className="flex items-center justify-between gap-4 text-orange-600 dark:text-orange-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Indeks Haba:
                  </span>
                  <span className="font-mono">{Number(chartData[hoverIndex].heat_index_c ?? 29).toFixed(1)}°C</span>
                </div>
              )}
              {showLight && (
                <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Cahaya Suria:
                  </span>
                  <span className="font-mono">{chartData[hoverIndex].light_pct}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Status Bar */}
      <div className="mt-2 pt-3 border-t border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Frekuensi kemaskini: Setiap 1 minit ke Supabase Cloud</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>Titik Data: <strong>{logs.length} rekod</strong></span>
          <span>•</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">
            {autoZoom ? '🔍 Auto-Zoom Aktif' : '📏 Skala Penuh 0-100%'}
          </span>
        </div>
      </div>
    </div>
  );
};
