'use client';

import React, { useState } from 'react';
import { HistoryItem, DbMetric } from '@/types';
import { History, Database, Clock, ListCollapse, CheckCircle, RefreshCw, Upload, Edit2, Trash2, Check, X } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  metrics: DbMetric[];
  activeHistoryId: number | null;
  onSelectHistory: (item: HistoryItem) => void;
  onRefreshMetrics: () => void;
  onOpenUpload: () => void;
  userRole?: 'user' | 'admin';
  currentUserId?: number;
  onRefreshHistory: () => void;
}

export default function HistorySidebar({
  history,
  metrics,
  activeHistoryId,
  onSelectHistory,
  onRefreshMetrics,
  onOpenUpload,
  userRole,
  currentUserId,
  onRefreshHistory,
}: HistorySidebarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isSavingId, setIsSavingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'starred'>('all');

  const toggleFavorite = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshMetrics();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const startEditing = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.question);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (e: React.MouseEvent | React.FormEvent, id: number) => {
    e.stopPropagation();
    if (!editValue.trim()) return;
    setIsSavingId(id);
    try {
      const res = await fetch('/api/history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, question: editValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshHistory();
        setEditingId(null);
      } else {
        alert(data.error || 'Failed to update description.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving description.');
    } finally {
      setIsSavingId(null);
    }
  };

  const deleteItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this query log?')) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onRefreshHistory();
      } else {
        alert(data.error || 'Failed to delete item.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting item.');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/80 shadow-2xl shadow-black/20 backdrop-blur-xl select-none">
      {/* DB Metrics Section */}
      <div className="shrink-0 border-b border-border-muted bg-white/2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <Database size={15} className="animate-icon-float" />
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-foreground">Database Schema</span>
              <span className="block text-[10px] text-text-muted">Tables available for querying</span>
            </div>
          </div>
          <button 
            onClick={handleRefreshClick}
            title="Refresh statistics"
            className="group rounded-lg border border-white/5 bg-white/4 p-2 text-text-muted transition-all duration-200 hover:border-accent/40 hover:bg-accent/5 hover:text-accent cursor-pointer active:scale-95"
          >
            <RefreshCw size={12} className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
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
                      ? 'border-accent/35 bg-accent/5 shadow-sm shadow-accent/10' 
                      : 'border-border-muted bg-background/50 hover:border-white/10 hover:bg-white/4'
                  }`}
                  title={m.table}
                >
                  <span className="text-[10px] text-text-muted capitalize font-medium truncate flex items-center gap-1 select-none">
                    {isUploaded && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"></span>}
                    {displayName.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center justify-between mt-0.5 select-none">
                    <span className="text-[11px] font-semibold text-foreground font-mono">{m.count} rows</span>
                    {isUploaded && (
                      <span className="origin-right scale-90 rounded border border-accent/20 bg-accent/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent">
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
          className="group mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2.5 text-xs font-semibold text-accent shadow-sm shadow-accent/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/20 hover:text-white cursor-pointer active:scale-[0.98]"
        >
          <Upload size={12} className="icon-hover-scale" />
          <span>Upload CSV / Excel</span>
        </button>
      </div>

      {/* Query History Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex shrink-0 items-center gap-2 border-b border-border-muted bg-white/1 px-4 py-3">
          <History size={16} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Query History</span>
        </div>

        {/* Search and Starred filter tabs */}
        <div className="shrink-0 p-2 border-b border-border-muted bg-white/[0.02] flex flex-col gap-1.5 select-none">
          <input
            type="text"
            placeholder="Search questions or SQL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/4 px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:border-accent focus:bg-white/8 focus:outline-none"
          />
          <div className="flex gap-1 p-0.5 rounded-lg bg-card-bg border border-white/5">
            <button
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                filterTab === 'all'
                  ? 'bg-accent/15 text-accent border border-accent/25'
                  : 'text-text-muted hover:text-white border border-transparent'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilterTab('starred')}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                filterTab === 'starred'
                  ? 'bg-accent/15 text-accent border border-accent/25'
                  : 'text-text-muted hover:text-white border border-transparent'
              }`}
            >
              ★ Starred
            </button>
          </div>
        </div>

        {/* History Item list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {(() => {
            const filteredHistory = history.filter((item) => {
              const matchesSearch =
                item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sql_query.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesTab = filterTab === 'all' || !!item.is_favorite;
              return matchesSearch && matchesTab;
            });

            if (filteredHistory.length === 0) {
              return (
                <div className="flex flex-col items-center gap-1 py-8 text-center text-xs text-text-muted">
                  <ListCollapse size={20} className="opacity-40" />
                  <span>No history logs found</span>
                </div>
              );
            }

            return filteredHistory.map((item) => {
              const isActive = activeHistoryId === item.id;
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative flex w-full flex-col gap-1 rounded-xl border p-2.5 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-accent/40 bg-accent/5 shadow-sm shadow-accent/10'
                      : 'border-transparent bg-transparent hover:border-white/5 hover:bg-white/3'
                  }`}
                >
                  {isEditing ? (
                    <form 
                      onSubmit={(e) => saveEdit(e, item.id)}
                      className="flex items-center gap-1.5 w-full mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 rounded border border-accent bg-background/80 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isSavingId === item.id}
                        className="rounded p-1 text-accent hover:bg-accent/10 active:scale-90 cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded p-1 text-text-muted hover:bg-white/5 active:scale-90 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <div 
                      onClick={() => onSelectHistory(item)}
                      className="w-full h-full cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* User query */}
                        <span className="text-xs font-medium text-foreground line-clamp-1 block leading-normal group-hover:text-white transition-colors flex-1 pr-16">
                          &quot;{item.question}&quot;
                        </span>

                        {/* Star Favorite Rating */}
                        <button
                          onClick={(e) => toggleFavorite(e, item.id)}
                          className={`absolute right-12 top-2 rounded p-1 transition-colors cursor-pointer active:scale-95 ${
                            item.is_favorite 
                              ? 'text-amber-400 opacity-100' 
                              : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-amber-300'
                          }`}
                          title={item.is_favorite ? 'Unstar query' : 'Star query'}
                        >
                          <span className="text-xs leading-none font-bold">{item.is_favorite ? '★' : '☆'}</span>
                        </button>

                        {/* Edit and Delete Actions */}
                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-card-bg/95 rounded-md border border-white/5 p-0.5 backdrop-blur">
                          <button
                            onClick={(e) => startEditing(e, item)}
                            className="rounded p-1 text-text-muted hover:text-accent hover:bg-accent/10 active:scale-90 transition-colors cursor-pointer"
                            title="Rename query"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => deleteItem(e, item.id)}
                            disabled={isDeletingId === item.id}
                            className="rounded p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-colors cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* SQL Preview snippet */}
                      <span className="text-[10px] text-text-muted font-mono truncate w-full block">
                        {item.sql_query}
                      </span>

                      {/* Execution Metrics */}
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-text-muted font-mono">
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} className="text-accent/60" />
                          {item.execution_time_ms}ms
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/10"></span>
                        <span className="flex items-center gap-0.5">
                          <CheckCircle size={10} className="text-accent-green/60" />
                          {item.rows_returned} rows
                        </span>

                        {/* Admin view: show creator badge */}
                        {userRole === 'admin' && item.username && (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-white/10"></span>
                            <span className="rounded bg-white/5 border border-white/5 px-1 py-0.5 text-[8px] font-semibold text-accent max-w-[60px] truncate">
                              @{item.username}
                            </span>
                          </>
                        )}

                        <span className="ml-auto text-[9px] opacity-60">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
