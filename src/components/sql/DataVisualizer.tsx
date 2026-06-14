'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useMemo } from 'react';
import { BarChart2, LineChart, PieChart, Sparkles, AlertTriangle, TrendingUp, HelpCircle, AreaChart, Grid, Table, Hash, Volume2, VolumeX } from 'lucide-react';

import { BusinessInsights } from '@/types';

interface DataVisualizerProps {
  rows: Record<string, unknown>[];
  insights: BusinessInsights | null | undefined;
}

export default function DataVisualizer({ rows, insights }: DataVisualizerProps) {
  const [activeTab, setActiveTab] = useState<'bar' | 'line' | 'pie' | 'area' | 'heatmap' | 'kpi' | 'table'>('bar');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speaking on unmount
  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayTts = (text: string) => {
    if (typeof window === 'undefined') return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN'; // Elegant Indian accent
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-detect keys if insights config is missing or invalid
  const keys = useMemo(() => {
    if (!rows || rows.length === 0) return { xKey: '', yKey: '' };
    const columns = Object.keys(rows[0]);
    
    let xKey = insights?.chartConfig?.xAxisKey || '';
    let yKey = insights?.chartConfig?.yAxisKey || '';

    // If keys don't exist in data, run detection
    if (!xKey || !columns.includes(xKey) || !yKey || !columns.includes(yKey)) {
      let detectedY = '';
      let detectedX = '';

      // Find first column with mostly numeric values for Y
      for (const col of columns) {
        const numericValues = rows
          .map(r => {
            const v = r[col];
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.-]/g, ''));
            return NaN;
          })
          .filter(v => !isNaN(v));

        if (numericValues.length > rows.length * 0.6 && !detectedY) {
          detectedY = col;
        } else if (!detectedX && col !== 'id') {
          detectedX = col;
        }
      }

      xKey = detectedX || columns[0] || '';
      yKey = detectedY || columns[1] || columns[0] || '';
    }

    return { xKey, yKey };
  }, [rows, insights]);

  // Set default active tab based on AI recommendation
  React.useEffect(() => {
    if (insights?.recommendedChart && ['bar', 'line', 'pie', 'area', 'heatmap', 'kpi', 'table'].includes(insights.recommendedChart)) {
      setActiveTab(insights.recommendedChart as any);
    } else {
      // Auto-detect logic: if X axis seems to be date-like, default to line
      const firstXVal = String(rows[0]?.[keys.xKey] || '');
      const isDate = /^\d{4}[-/]\d{2}([-/]\d{2})?/.test(firstXVal) || 
                     /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(firstXVal) ||
                     firstXVal.toLowerCase().includes('month') || 
                     firstXVal.toLowerCase().includes('year');
      
      if (isDate) {
        setActiveTab('line');
      } else if (rows.length <= 8) {
        setActiveTab('pie');
      } else {
        setActiveTab('bar');
      }
    }
  }, [insights, keys, rows]);

  // Parse and prepare data points
  const chartData = useMemo(() => {
    if (!rows || rows.length === 0 || !keys.xKey || !keys.yKey) return [];

    return rows
      .map((row, index) => {
        const label = String(row[keys.xKey] ?? `Row ${index + 1}`);
        const rawValue = row[keys.yKey];
        let value = 0;
        
        if (typeof rawValue === 'number') {
          value = rawValue;
        } else if (typeof rawValue === 'string') {
          const parsed = parseFloat(rawValue.replace(/[^0-9.-]/g, ''));
          value = isNaN(parsed) ? 0 : parsed;
        }

        return { label, value };
      })
      .filter(d => d.label && !isNaN(d.value));
  }, [rows, keys]);

  // Limit items for display and aggregate if needed
  const displayData = useMemo(() => {
    if (chartData.length === 0) return [];
    
    if (activeTab === 'pie' && chartData.length > 8) {
      const sorted = [...chartData].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 7);
      const othersValue = sorted.slice(7).reduce((acc, curr) => acc + curr.value, 0);
      return [...top, { label: 'Others', value: othersValue }];
    }
    
    // Bar and Line display top 12
    if (chartData.length > 12) {
      return chartData.slice(0, 12);
    }
    
    return chartData;
  }, [chartData, activeTab]);

  // Calculations for SVGs
  const values = displayData.map(d => d.value);
  const maxValue = Math.max(...values, 1) * 1.1; // 10% padding on top
  const minValue = Math.min(...values, 0);

  // Format labels nicely
  const formatValue = (val: number) => {
    if (val >= 1e7) return (val / 1e7).toFixed(1) + 'Cr';
    if (val >= 1e5) return (val / 1e5).toFixed(1) + 'L';
    if (val >= 1e3) return (val / 1e3).toFixed(1) + 'k';
    return val.toLocaleString([], { maximumFractionDigits: 1 });
  };

  // Harmonious cyber ops palette
  const colors = [
    '#00f2ff', // Cyan (Accent)
    '#6366f1', // Indigo (Accent Secondary)
    '#10b981', // Emerald (Accent Green)
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
    '#ef4444', // Red
  ];

  return (
    <div className="space-y-4">
      {/* 1. AI Business Summary & Insights Panel */}
      {insights && (
        <div className="p-4 rounded-xl border border-card-border bg-gradient-to-br from-accent-secondary/5 to-accent/5 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 text-accent select-none pointer-events-none">
            <Sparkles size={48} className="animate-pulse" />
          </div>

          <div className="flex items-center gap-2 mb-2 select-none">
            <div className="p-1 rounded bg-accent/10 border border-accent/20 text-accent">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent/80">AI Business Insights</h4>
          </div>

          <p className="text-xs text-foreground font-medium leading-relaxed mb-3">
            {insights.summary}
          </p>

          {/* Highlights & Anomalies List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5">
            {insights.insights.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block select-none">Key Trends / Highlights</span>
                <ul className="space-y-1">
                  {insights.insights.map((ins, idx) => (
                    <li key={idx} className="text-[10px] text-foreground opacity-90 flex items-start gap-1.5 leading-relaxed">
                      <TrendingUp size={11} className="text-accent-green shrink-0 mt-0.5" />
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insights.anomalies.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block select-none">Anomalies / Callouts</span>
                <ul className="space-y-1">
                  {insights.anomalies.map((anom, idx) => (
                    <li key={idx} className="text-[10px] text-foreground opacity-90 flex items-start gap-1.5 leading-relaxed">
                      <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{anom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI Storytelling Section */}
          {insights.storytelling && (
            <div className="mt-4 p-3 rounded-lg border border-white/5 bg-background/30 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-accent-secondary uppercase tracking-wider block select-none">AI Business Story</span>
                <button
                  type="button"
                  onClick={() => handlePlayTts(insights.storytelling || '')}
                  className={`p-1 rounded bg-white/5 border border-white/10 hover:border-accent hover:bg-accent/10 text-text-muted hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[9px]`}
                  title="Read story aloud"
                >
                  {isSpeaking ? <VolumeX size={12} className="text-red-400 animate-pulse" /> : <Volume2 size={12} />}
                  <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                </button>
              </div>
              <p className="text-xs text-foreground opacity-90 leading-relaxed italic">
                &ldquo;{insights.storytelling}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. Visualizations Container */}
      {displayData.length > 0 ? (
        <div className="p-4 rounded-xl border border-card-border bg-card-bg/40 flex flex-col gap-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Interactive Chart</span>
              <span className="text-xs font-semibold text-foreground mt-0.5">
                {keys.yKey.replace(/_/g, ' ')} by {keys.xKey.replace(/_/g, ' ')}
              </span>
            </div>

            {/* View Mode Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-background border border-card-border select-none">
              <button
                onClick={() => setActiveTab('bar')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'bar' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="Bar Chart"
              >
                <BarChart2 size={14} />
              </button>
              <button
                onClick={() => setActiveTab('line')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'line' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="Line Chart"
              >
                <LineChart size={14} />
              </button>
              <button
                onClick={() => setActiveTab('pie')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'pie' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="Donut Chart"
              >
                <PieChart size={14} />
              </button>
              <button
                onClick={() => setActiveTab('area')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'area' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="Area Chart"
              >
                <AreaChart size={14} />
              </button>
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'heatmap' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="Heatmap Matrix"
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setActiveTab('kpi')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'kpi' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="KPI Metric Card"
              >
                <Hash size={14} />
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`p-1.5 rounded-md text-text-muted hover:text-white transition-all cursor-pointer ${
                  activeTab === 'table' ? 'bg-white/5 text-accent border border-white/5' : 'border border-transparent'
                }`}
                title="Data Table Summary"
              >
                <Table size={14} />
              </button>
            </div>
          </div>

          {/* Render Active Chart Type */}
          <div className="h-64 flex items-center justify-center relative overflow-hidden select-none bg-background/20 rounded-lg p-2">
            
            {/* BAR CHART */}
            {activeTab === 'bar' && (
              <svg viewBox="0 0 500 240" className="w-full h-full">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2ff" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#74f5ff" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 20 + ratio * 170;
                  const val = maxValue - ratio * (maxValue - minValue);
                  return (
                    <g key={idx}>
                      <line x1="50" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                      <text x="40" y={y + 3} fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">
                        {formatValue(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {displayData.map((d, i) => {
                  const count = displayData.length;
                  const padding = 12;
                  const w = (410 - (count - 1) * padding) / count;
                  const x = 60 + i * (w + padding);
                  
                  // Height mapping
                  const yRatio = maxValue - minValue > 0 ? (d.value - minValue) / (maxValue - minValue) : 0;
                  const barHeight = Math.max(yRatio * 170, 4); // minimum 4px height
                  const y = 190 - barHeight;

                  const isHovered = hoveredIndex === i;

                  return (
                    <g 
                      key={i}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Bar rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={barHeight}
                        rx="3"
                        fill={isHovered ? "url(#barGradHover)" : "url(#barGrad)"}
                        className="transition-all duration-300 ease-out"
                      />

                      {/* Hover Info tooltip display */}
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.max(50, x + w / 2 - 60)}
                            y={Math.max(5, y - 28)}
                            width="120"
                            height="22"
                            rx="5"
                            fill="#050508"
                            stroke="#00f2ff"
                            strokeWidth="1"
                          />
                          <text
                            x={Math.max(50, x + w / 2 - 60) + 60}
                            y={Math.max(5, y - 28) + 14}
                            fill="#fff"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {formatValue(d.value)}
                          </text>
                        </g>
                      )}

                      {/* X Labels */}
                      <text
                        x={x + w / 2}
                        y="208"
                        fill={isHovered ? "#fff" : "#94a3b8"}
                        fontSize="8"
                        textAnchor="middle"
                        className="transition-colors duration-200"
                        transform={`rotate(-20, ${x + w / 2}, 208)`}
                      >
                        {d.label.length > 10 ? d.label.substring(0, 8) + '..' : d.label}
                      </text>
                    </g>
                  );
                })}
                {/* Baseline */}
                <line x1="50" y1="190" x2="480" y2="190" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>
            )}

            {/* LINE CHART */}
            {activeTab === 'line' && (
              <svg viewBox="0 0 500 240" className="w-full h-full">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#00f2ff" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#00f2ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 20 + ratio * 170;
                  const val = maxValue - ratio * (maxValue - minValue);
                  return (
                    <g key={idx}>
                      <line x1="50" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                      <text x="40" y={y + 3} fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">
                        {formatValue(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Lines and Areas */}
                {(() => {
                  const points = displayData.map((d, i) => {
                    const count = displayData.length;
                    const w = 400 / (count > 1 ? count - 1 : 1);
                    const x = 60 + i * w;
                    
                    const yRatio = maxValue - minValue > 0 ? (d.value - minValue) / (maxValue - minValue) : 0;
                    const y = 190 - yRatio * 170;
                    return { x, y };
                  });

                  if (points.length === 0) return null;

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                  return (
                    <g>
                      {/* Area Path */}
                      <path d={areaPath} fill="url(#areaGrad)" />
                      {/* Line Path */}
                      <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />

                      {/* Connection dots & Tooltips */}
                      {displayData.map((d, i) => {
                        const pt = points[i];
                        const isHovered = hoveredIndex === i;

                        return (
                          <g 
                            key={i}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? "#00f2ff" : "#6366f1"}
                              stroke="#050508"
                              strokeWidth="1.5"
                              className="transition-all duration-200"
                            />

                            {/* Tooltip */}
                            {isHovered && (
                              <g>
                                <rect
                                  x={Math.max(50, pt.x - 50)}
                                  y={Math.max(5, pt.y - 28)}
                                  width="100"
                                  height="20"
                                  rx="4"
                                  fill="#050508"
                                  stroke="#00f2ff"
                                  strokeWidth="1"
                                />
                                <text
                                  x={Math.max(50, pt.x - 50) + 50}
                                  y={Math.max(5, pt.y - 28) + 12}
                                  fill="#fff"
                                  fontSize="8"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {formatValue(d.value)}
                                </text>
                              </g>
                            )}

                            {/* Label */}
                            <text
                              x={pt.x}
                              y="208"
                              fill={isHovered ? "#fff" : "#94a3b8"}
                              fontSize="8"
                              textAnchor="middle"
                              transform={`rotate(-20, ${pt.x}, 208)`}
                              className="transition-colors duration-200"
                            >
                              {d.label.length > 10 ? d.label.substring(0, 8) + '..' : d.label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
                {/* Baseline */}
                <line x1="50" y1="190" x2="480" y2="190" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>
            )}

            {/* DONUT CHART */}
            {activeTab === 'pie' && (
              <div className="flex items-center justify-center w-full gap-8">
                {/* Left: Donut SVG */}
                <div className="w-48 h-48 relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      const total = values.reduce((a, b) => a + b, 0);
                      let accumulatedPercent = 0;

                      return displayData.map((d, i) => {
                        const percent = total > 0 ? d.value / total : 0;
                        const strokeDasharray = `${percent * 282.6} 282.6`;
                        const strokeDashoffset = -accumulatedPercent * 282.6;
                        accumulatedPercent += percent;

                        const isHovered = hoveredIndex === i;
                        const strokeWidth = isHovered ? 12 : 9;

                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="45"
                            fill="transparent"
                            stroke={colors[i % colors.length]}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer transition-all duration-200 hover:scale-105 origin-center"
                            style={{ transformOrigin: '50px 50px' }}
                          />
                        );
                      });
                    })()}
                  </svg>
                  
                  {/* Center Cutout Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-background rounded-full scale-[0.66] shadow-xl border border-white/5 select-none pointer-events-none">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                      {hoveredIndex !== null ? displayData[hoveredIndex].label : 'Total Sum'}
                    </span>
                    <span className="text-sm font-extrabold text-foreground mt-0.5 font-mono">
                      {formatValue(
                        hoveredIndex !== null 
                          ? displayData[hoveredIndex].value 
                          : values.reduce((a, b) => a + b, 0)
                      )}
                    </span>
                    {hoveredIndex !== null && (
                      <span className="text-[8px] font-bold text-accent-secondary mt-0.5">
                        {((displayData[hoveredIndex].value / Math.max(values.reduce((a, b) => a + b, 0), 1)) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Legend list */}
                <div className="flex-1 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-2">
                  {displayData.map((d, i) => {
                    const total = values.reduce((a, b) => a + b, 0);
                    const percent = total > 0 ? (d.value / total) * 100 : 0;
                    const isHovered = hoveredIndex === i;

                    return (
                      <div 
                        key={i}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                          isHovered 
                            ? 'bg-white/5 border-white/10 shadow-sm' 
                            : 'bg-transparent border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="h-2 w-2 rounded-full shrink-0" 
                            style={{ backgroundColor: colors[i % colors.length] }}
                          />
                          <span className={`text-[10px] truncate ${isHovered ? 'text-white font-semibold' : 'text-text-muted font-medium'}`}>
                            {d.label}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2 select-none">
                          <span className="text-[10px] font-bold text-foreground font-mono">{formatValue(d.value)}</span>
                          <span className="text-[9px] text-text-muted font-medium ml-1.5">{percent.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AREA CHART */}
            {activeTab === 'area' && (
              <svg viewBox="0 0 500 240" className="w-full h-full">
                <defs>
                  <linearGradient id="areaGradOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00f2ff" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="areaLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00f2ff" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 20 + ratio * 170;
                  const val = maxValue - ratio * (maxValue - minValue);
                  return (
                    <g key={idx}>
                      <line x1="50" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                      <text x="40" y={y + 3} fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">
                        {formatValue(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Area and Line */}
                {(() => {
                  const points = displayData.map((d, i) => {
                    const count = displayData.length;
                    const w = 400 / (count > 1 ? count - 1 : 1);
                    const x = 60 + i * w;
                    
                    const yRatio = maxValue - minValue > 0 ? (d.value - minValue) / (maxValue - minValue) : 0;
                    const y = 190 - yRatio * 170;
                    return { x, y };
                  });

                  if (points.length === 0) return null;

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                  return (
                    <g>
                      <path d={areaPath} fill="url(#areaGradOnly)" />
                      <path d={linePath} fill="none" stroke="url(#areaLineGrad)" strokeWidth="2.5" strokeLinecap="round" />

                      {displayData.map((d, i) => {
                        const pt = points[i];
                        const isHovered = hoveredIndex === i;

                        return (
                          <g 
                            key={i}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? "#00f2ff" : "#6366f1"}
                              stroke="#050508"
                              strokeWidth="1.5"
                            />

                            {isHovered && (
                              <g>
                                <rect
                                  x={Math.max(50, pt.x - 50)}
                                  y={Math.max(5, pt.y - 28)}
                                  width="100"
                                  height="20"
                                  rx="4"
                                  fill="#050508"
                                  stroke="#00f2ff"
                                  strokeWidth="1"
                                />
                                <text
                                  x={Math.max(50, pt.x - 50) + 50}
                                  y={Math.max(5, pt.y - 28) + 12}
                                  fill="#fff"
                                  fontSize="8"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {formatValue(d.value)}
                                </text>
                              </g>
                            )}

                            <text
                              x={pt.x}
                              y="208"
                              fill={isHovered ? "#fff" : "#94a3b8"}
                              fontSize="8"
                              textAnchor="middle"
                              transform={`rotate(-20, ${pt.x}, 208)`}
                            >
                              {d.label.length > 10 ? d.label.substring(0, 8) + '..' : d.label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
                <line x1="50" y1="190" x2="480" y2="190" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>
            )}

            {/* KPI CARD */}
            {activeTab === 'kpi' && (
              <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-gradient-to-br from-accent/5 to-accent-secondary/5 rounded-xl border border-white/5 relative overflow-hidden select-none">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-accent/5 rounded-full blur-xl" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  {keys.yKey.replace(/_/g, ' ') || 'Metric Value'}
                </span>
                <span className="text-4xl font-extrabold text-white tracking-tight font-mono bg-gradient-to-r from-white via-cyan-100 to-accent bg-clip-text text-transparent drop-shadow-md">
                  {formatValue(
                    chartData.length === 1 
                      ? chartData[0].value 
                      : chartData.reduce((acc, curr) => acc + curr.value, 0)
                  )}
                </span>
                {chartData.length > 1 && (
                  <span className="text-[10px] text-text-muted mt-2">
                    Sum of {chartData.length} records • Average: {formatValue(chartData.reduce((acc, curr) => acc + curr.value, 0) / chartData.length)}
                  </span>
                )}
                {chartData.length === 1 && chartData[0].label && (
                  <span className="text-[10px] text-text-muted mt-2">
                    Ref: {chartData[0].label}
                  </span>
                )}
              </div>
            )}

            {/* HEATMAP GRID */}
            {activeTab === 'heatmap' && (
              <div className="w-full h-full flex flex-col justify-center p-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-2">
                  {displayData.map((d, i) => {
                    const ratio = maxValue > 0 ? d.value / maxValue : 0;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-white/5 flex flex-col justify-between h-20 transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(135deg, rgba(99, 102, 241, ${0.1 + ratio * 0.4}) 0%, rgba(0, 242, 255, ${ratio * 0.3}) 100%)`,
                          boxShadow: ratio > 0.7 ? '0 0 10px rgba(0, 242, 255, 0.15)' : 'none',
                        }}
                      >
                        <span className="text-[9px] font-bold text-text-muted truncate select-none">{d.label}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-bold text-white font-mono">{formatValue(d.value)}</span>
                          <span className="text-[8px] font-semibold text-accent" style={{ opacity: 0.5 + ratio * 0.5 }}>
                            {Math.round(ratio * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COMPACT TABLE */}
            {activeTab === 'table' && (
              <div className="w-full h-full overflow-hidden border border-white/5 rounded-lg bg-card-bg/25 backdrop-blur-md flex flex-col">
                <div className="overflow-y-auto max-h-56 w-full pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/2 select-none">
                        <th className="py-2 px-3 text-[9px] font-bold text-text-muted uppercase tracking-wider">{keys.xKey.replace(/_/g, ' ')}</th>
                        <th className="py-2 px-3 text-[9px] font-bold text-text-muted uppercase tracking-wider text-right">{keys.yKey.replace(/_/g, ' ')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((d, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="py-2 px-3 text-[10px] text-foreground font-medium truncate max-w-[200px]">{d.label}</td>
                          <td className="py-2 px-3 text-[10px] text-accent font-bold font-mono text-right">{formatValue(d.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Info footnote */}
          {chartData.length > displayData.length && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/2 border border-white/5 text-[9px] text-text-muted select-none">
              <HelpCircle size={10} className="text-accent" />
              <span>Showing top {displayData.length} records. Inspect the full result set in the raw data table tab.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-card-border bg-card-bg/10 rounded-xl select-none">
          <HelpCircle size={20} className="text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-muted">No visualizable numeric comparison data returned from this query.</p>
        </div>
      )}
    </div>
  );
}
