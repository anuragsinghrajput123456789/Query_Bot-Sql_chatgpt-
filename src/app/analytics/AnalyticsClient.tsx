'use client';

import React, { useState, useEffect } from 'react';
import HeaderNavbar from '../HeaderNavbar';
import { 
  Database, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  ArrowRight,
  TrendingDown,
  Activity,
  DollarSign
} from 'lucide-react';

interface AnalyticsClientProps {
  user: {
    id: number;
    username: string;
    role: 'user' | 'admin';
  } | null;
}

export default function AnalyticsClient({ user }: AnalyticsClientProps) {
  const [decisionData, setDecisionData] = useState<any | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(true);
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(true);

  // What-if simulator states
  const [sliderUserGrowth, setSliderUserGrowth] = useState<number>(0);
  const [sliderConversion, setSliderConversion] = useState<number>(2.0);

  const fetchDecisionData = async () => {
    setIsDecisionLoading(true);
    try {
      const res = await fetch('/api/ai/health');
      const data = await res.json();
      if (data.success) {
        setDecisionData(data);
        if (data.stats && data.stats.conversionRate) {
          setSliderConversion(data.stats.conversionRate);
        }
      }
    } catch (e) {
      console.error('Failed to load business health data:', e);
    } finally {
      setIsDecisionLoading(false);
    }
  };

  const fetchForecastData = async () => {
    setIsForecastLoading(true);
    try {
      const res = await fetch('/api/ai/forecast');
      const data = await res.json();
      if (data.success) {
        setForecastData(data);
      }
    } catch (e) {
      console.error('Failed to load forecast data:', e);
    } finally {
      setIsForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisionData();
    fetchForecastData();
  }, []);

  // What-if calculations
  const stats = decisionData?.stats;
  const healthScore = decisionData?.healthScore || 0;
  const breakdown = decisionData?.breakdown;
  const ceoMode = decisionData?.ceoMode;

  const actualMonthlyRev = stats?.revNew30d || 0;
  const actualConv = stats?.conversionRate || 2.0;
  const simulatedRev = Math.round(actualMonthlyRev * (1 + sliderUserGrowth / 100) * (sliderConversion / Math.max(actualConv, 0.1)));
  const revenueDifference = simulatedRev - actualMonthlyRev;
  const revenueDiffPercent = actualMonthlyRev > 0 ? Math.round((revenueDifference / actualMonthlyRev) * 100) : 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050508] text-foreground font-sans">
      {/* Background decorations */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl animate-pulse duration-[10000ms]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent-secondary/5 blur-3xl animate-pulse duration-[12000ms]" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />

      <HeaderNavbar user={user} />

      <main className="relative z-10 flex-1 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 select-none">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Activity className="text-accent-secondary animate-pulse" size={24} />
              <span>Executive Analytics Cockpit</span>
            </h2>
            <p className="text-xs text-text-muted mt-1">Platform business health, ML predictions, and revenue modeling simulator.</p>
          </div>
          <button
            onClick={() => {
              fetchDecisionData();
              fetchForecastData();
            }}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer"
          >
            Sync Live Metrics
          </button>
        </div>

        {isDecisionLoading || isForecastLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-text-muted select-none gap-3">
            <Database size={32} className="animate-spin text-accent" />
            <span className="text-sm font-medium">Analyzing Matrimonial Data Warehouses...</span>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            
            {/* 1. Health Score Progress Circle and Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Health Score Ring */}
              <div className="p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-accent/20 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-accent-secondary/5 opacity-40" />
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 relative select-none"> Matrimonial Health Index</span>
                
                {/* Visual Circular Progress Ring */}
                <div className="relative h-32 w-32 flex items-center justify-center mb-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#healthGrad)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScore / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#00f2ff" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center select-none">
                    <span className="text-4xl font-extrabold text-white font-mono">{healthScore}</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-accent-green">Stable</span>
                  </div>
                </div>
                
                <p className="text-xs text-text-muted leading-relaxed relative px-4 select-none">
                  A compiled rating index based on subscriber registrations, active payments, refund volumes, and support tickets.
                </p>
              </div>

              {/* Health Breakdown */}
              <div className="lg:col-span-2 p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl flex flex-col justify-between group hover:border-accent/20 transition-all duration-300">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 select-none">Platform Metrics Breakdown</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm flex-1">
                  <div className="space-y-2 border-b border-white/5 sm:border-r sm:border-b-0 pr-4 pb-3 sm:pb-0">
                    <div className="flex justify-between font-bold text-white">
                      <span>Premium Subscriptions</span>
                      <span className="text-accent font-mono font-bold">{stats?.conversionRate}% conversion</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">{breakdown?.revenue || breakdown?.conversion}</p>
                  </div>
                  <div className="space-y-2 pl-0 sm:pl-4">
                    <div className="flex justify-between font-bold text-white">
                      <span>User Growth Index</span>
                      <span className="text-accent-green font-mono font-bold">+{stats?.userGrowth}%</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">{breakdown?.growth || breakdown?.users}</p>
                  </div>
                  <div className="space-y-2 border-t border-white/5 sm:border-r sm:border-t-0 pr-4 pt-3 sm:pt-4">
                    <div className="flex justify-between font-bold text-white">
                      <span>Refund Rate</span>
                      <span className="text-accent-green font-mono font-bold">{stats?.refundRate}% (Low)</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">{breakdown?.refunds || 'Refund volumes are within safe thresholds (under 2% average).'}</p>
                  </div>
                  <div className="space-y-2 border-t border-white/5 pl-0 sm:pl-4 pt-3 sm:pt-4">
                    <div className="flex justify-between font-bold text-white">
                      <span>Abuse & Security Profile</span>
                      <span className="text-white font-mono font-bold">Guarded</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">{breakdown?.risk || 'Support ticket volumes are stable. Abuse/fraud reporting is within normal range.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CEO Mode Executive Briefing */}
            {ceoMode && (
              <div className="p-6 rounded-2xl border border-card-border bg-gradient-to-br from-accent-secondary/5 to-accent/5 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-2 select-none">
                  <div className="p-1 rounded bg-accent-secondary/15 border border-accent-secondary/20 text-accent-secondary">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent-secondary/95">CEO Mode Briefing</h4>
                </div>
                
                <p className="text-sm text-foreground font-medium leading-relaxed bg-[#050508]/40 p-4 rounded-xl border border-white/5 italic">
                  &ldquo;{ceoMode.executiveSummary}&rdquo;
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block border-b border-white/5 pb-1">Bottlenecks & Risks</span>
                    <ul className="space-y-2">
                      {ceoMode.risks?.map((r: string, idx: number) => (
                        <li key={idx} className="text-xs text-foreground opacity-90 flex items-start gap-2 leading-relaxed">
                          <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block border-b border-white/5 pb-1">Growth Opportunities</span>
                    <ul className="space-y-2">
                      {ceoMode.opportunities?.map((o: string, idx: number) => (
                        <li key={idx} className="text-xs text-foreground opacity-90 flex items-start gap-2 leading-relaxed">
                          <TrendingUp size={12} className="text-accent shrink-0 mt-0.5" />
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block border-b border-white/5 pb-1">Strategic Recommendations</span>
                    <ul className="space-y-2">
                      {ceoMode.recommendations?.map((rec: string, idx: number) => (
                        <li key={idx} className="text-xs text-foreground opacity-90 flex items-start gap-2 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-green shrink-0 mt-2 animate-pulse" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 3. What-If Revenue Simulator */}
            <div className="p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">What-If Revenue Simulator</span>
                  <span className="text-[11px] text-text-muted mt-0.5">Drag sliders to estimate subscription margins dynamically.</span>
                </div>
                
                {/* HUD Simulator Readout */}
                <div className="text-right flex items-center gap-4 bg-white/2 border border-white/5 rounded-xl px-4 py-2.5 w-max">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Simulated Monthly Revenue</span>
                    <span className="text-xl font-extrabold text-white font-mono">₹{simulatedRev.toLocaleString()}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-bold font-mono ${revenueDifference >= 0 ? 'bg-accent-green-bg text-accent-green' : 'bg-red-500/10 text-red-400'}`}>
                    {revenueDifference >= 0 ? '+' : ''}{revenueDiffPercent}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-muted">User Registrations Scale:</span>
                    <span className="text-white font-mono font-bold">{sliderUserGrowth > 0 ? '+' : ''}{sliderUserGrowth}%</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="100"
                    value={sliderUserGrowth}
                    onChange={(e) => setSliderUserGrowth(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[9px] text-text-muted font-bold uppercase">
                    <span>-20% Churn</span>
                    <span>0% Stable</span>
                    <span>+100% Growth</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-muted">Paid Conversion Target:</span>
                    <span className="text-white font-mono font-bold">{sliderConversion.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={sliderConversion}
                    onChange={(e) => setSliderConversion(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-accent-secondary"
                  />
                  <div className="flex justify-between text-[9px] text-text-muted font-bold uppercase">
                    <span>0.5% Low</span>
                    <span>{actualConv.toFixed(1)}% Current</span>
                    <span>15.0% High</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Forecasting Timeline Projections */}
            {forecastData && (
              <div className="p-6 rounded-2xl border border-card-border bg-card-bg/45 backdrop-blur-xl space-y-6">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">AI Projections & Pro Forecasts</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2 flex flex-col justify-between hover:bg-white/3 transition-colors">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Next Week Projection</span>
                    <span className="text-lg font-extrabold text-accent mt-1.5 font-mono">₹{(forecastData.metrics?.nextWeek || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2 flex flex-col justify-between hover:bg-white/3 transition-colors">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Next Month Projection</span>
                    <span className="text-lg font-extrabold text-accent mt-1.5 font-mono">₹{(forecastData.metrics?.nextMonth || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2 flex flex-col justify-between hover:bg-white/3 transition-colors">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Next Quarter Projection</span>
                    <span className="text-lg font-extrabold text-accent mt-1.5 font-mono">₹{(forecastData.metrics?.nextQuarter || 0).toLocaleString()}</span>
                  </div>
                </div>

                {forecastData.forecast && forecastData.forecast.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Projected Revenue Timeline</span>
                    <div className="h-56 bg-[#050508]/30 rounded-xl p-3 flex items-center justify-center relative overflow-hidden border border-white/5">
                      <svg viewBox="0 0 500 200" className="w-full h-full">
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = 15 + ratio * 140;
                          return (
                            <line key={idx} x1="40" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                          );
                        })}

                        {(() => {
                          const list = forecastData.forecast;
                          const maxVal = Math.max(...list.map((d: any) => d.actual || d.forecast || 0), 100) * 1.1;
                          const minVal = 0;

                          const points = list.map((d: any, i: number) => {
                            const count = list.length;
                            const w = 420 / (count > 1 ? count - 1 : 1);
                            const x = 50 + i * w;
                            const val = d.actual !== null ? d.actual : d.forecast;
                            const yRatio = (val - minVal) / (maxVal - minVal);
                            const y = 155 - yRatio * 130;
                            return { x, y, actual: d.actual !== null, label: d.date, val };
                          });

                          const actualPoints = points.filter((p: any) => p.actual);
                          const forecastPoints = points.filter((p: any) => !p.actual);
                          
                          const actualPath = actualPoints.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          
                          const lastActual = actualPoints[actualPoints.length - 1];
                          const fcPathStart = lastActual ? `M ${lastActual.x} ${lastActual.y}` : '';
                          const forecastPath = fcPathStart + (fcPathStart ? ' L ' : 'M ') + forecastPoints.map((p: any) => `${p.x} ${p.y}`).join(' L ');

                          return (
                            <g>
                              {actualPoints.length > 0 && (
                                <path d={actualPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                              )}

                              {forecastPoints.length > 0 && (
                                <path d={forecastPath} fill="none" stroke="#00f2ff" strokeWidth="2" strokeDasharray="4,4" strokeLinecap="round" />
                              )}

                              {points.map((p: any, i: number) => (
                                <g key={i}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="3.5"
                                    fill={p.actual ? '#10b981' : '#00f2ff'}
                                    stroke="#050508"
                                    strokeWidth="1"
                                  />
                                  
                                  <text x={p.x} y={p.y - 8} fill="#94a3b8" fontSize="7" textAnchor="middle" fontFamily="monospace">
                                    {p.val >= 1000 ? `${(p.val / 1000).toFixed(0)}k` : p.val}
                                  </text>

                                  <text x={p.x} y="178" fill="#94a3b8" fontSize="7" textAnchor="middle" transform={`rotate(-15, ${p.x}, 178)`}>
                                    {p.label}
                                  </text>
                                </g>
                              ))}
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
