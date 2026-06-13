'use client';

import React from 'react';
import { HistoryItem, DbMetric } from '@/types';
import { History, Database, Clock, ListCollapse, CheckCircle, RefreshCw, Upload } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  metrics: DbMetric[];
  activeHistoryId: number | null;
  onSelectHistory: (item: HistoryItem) => void;
  onRefreshMetrics: () => void;
  onOpenUpload: () => void;
}

export default function HistorySidebar({
  history,
  metrics,
  activeHistoryId,
  onSelectHistory,
  onRefreshMetrics,
  onOpenUpload,
}: HistorySidebarProps) {
  
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/90 shadow-2xl shadow-black/20 backdrop-blur-xl select-none">
      {/* DB Metrics Section */}
      <div className="shrink-0 border-b border-border-muted bg-white/3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-200">
              <Database size={15} />
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-foreground">Database Schema</span>
              <span className="block text-[10px] text-text-muted">Tables available for querying</span>
            </div>
          </div>
          <button 
            onClick={onRefreshMetrics}
            title="Refresh statistics"
            className="rounded-lg border border-white/7 bg-white/5 p-2 text-text-muted transition-all duration-200 hover:rotate-45 hover:border-sky-400/30 hover:bg-sky-400/8 hover:text-sky-200 cursor-pointer active:scale-95"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Database statistics metrics list */}
        <div className="grid grid-cols-2 gap-2">
          {metrics.length === 0 ? (
            <div className="col-span-2 text-center py-2 text-[10px] text-text-muted">
              Loading db metrics...
            </div>
          ) : (
            metrics.map((m) => {
              const isUploaded = m.table.startsWith('uploaded_');
              const displayName = isUploaded 
                ? m.table.replace(/^uploaded_/, '') 
                : m.table;

              return (
                <div 
                  key={m.table}
                  className={`flex flex-col rounded-lg border px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 ${
                    isUploaded 
                      ? 'border-sky-400/35 bg-sky-500/8 shadow-sm shadow-sky-950/20' 
                      : 'border-border-muted bg-background/70 hover:border-white/12 hover:bg-white/4'
                  }`}
                  title={m.table}
                >
                  <span className="text-[10px] text-text-muted capitalize font-medium truncate flex items-center gap-1 select-none">
                    {isUploaded && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300"></span>}
                    {displayName.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center justify-between mt-0.5 select-none">
                    <span className="text-[11px] font-semibold text-foreground font-mono">{m.count} rows</span>
                    {isUploaded && (
                      <span className="origin-right scale-90 rounded border border-sky-500/20 bg-sky-500/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-200">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Upload Custom Data Button */}
        <button
          onClick={onOpenUpload}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-xs font-semibold text-sky-100 shadow-sm shadow-sky-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/40 hover:bg-sky-500/18 hover:text-white cursor-pointer active:scale-[0.98]"
        >
          <Upload size={12} />
          <span>Upload CSV / Excel</span>
        </button>
      </div>

      {/* Query History Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex shrink-0 items-center gap-2 border-b border-border-muted bg-white/2 px-4 py-3">
          <History size={16} className="text-sky-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Query History</span>
          <span className="ml-auto rounded-full border border-white/7 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
            {history.length}
          </span>
        </div>

        {/* History Item list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center text-xs text-text-muted">
              <ListCollapse size={20} className="opacity-40" />
              <span>No history logs</span>
              <span className="text-[10px] opacity-75">Run a query to see it here.</span>
            </div>
          ) : (
            history.map((item) => {
              const isActive = activeHistoryId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  className={`flex w-full flex-col gap-1 rounded-xl border p-2.5 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] ${
                    isActive
                      ? 'border-sky-400/40 bg-sky-500/10 shadow-sm shadow-sky-950/20'
                      : 'border-transparent bg-transparent hover:border-white/7 hover:bg-white/4'
                  }`}
                >
                  {/* User query */}
                  <span className="text-xs font-medium text-foreground line-clamp-1 block leading-normal">
                    &quot;{item.question}&quot;
                  </span>

                  {/* SQL Preview snippet */}
                  <span className="text-[10px] text-text-muted font-mono truncate w-full block">
                    {item.sql_query}
                  </span>

                  {/* Execution Metrics */}
                  <div className="flex items-center gap-2 mt-1.5 text-[9px] text-text-muted font-mono">
                    <span className="flex items-center gap-0.5">
                      <Clock size={10} className="text-sky-300/70" />
                      {item.execution_time_ms}ms
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/10"></span>
                    <span className="flex items-center gap-0.5">
                      <CheckCircle size={10} className="text-emerald-500/70" />
                      {item.rows_returned} rows
                    </span>
                    <span className="ml-auto text-[9px] opacity-60">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
