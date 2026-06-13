'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { Message, HistoryItem, DbMetric, BusinessInsights } from '@/types';
import HistorySidebar from '@/components/history/HistorySidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import SqlDisplay from '@/components/sql/SqlDisplay';
import Explanation from '@/components/sql/Explanation';
import DataViewer from '@/components/sql/DataViewer';
import DataVisualizer from '@/components/sql/DataVisualizer';
import UploadModal from '@/components/ui/UploadModal';
import {
  Database,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Cpu,
  Menu,
  X,
  Upload,
  Sparkles,
  PanelRightOpen,
} from 'lucide-react';

let idCounter = 0;
function generateUniqueId(): string {
  idCounter += 1;
  return `msg_${Date.now()}_${idCounter}`;
}

interface BotQueryResult {
  type: 'sql' | 'clarification' | 'error' | 'database_error';
  sql?: string | null;
  explanation?: string | null;
  options?: string[] | null;
  rows?: Record<string, unknown>[] | null;
  executionTimeMs?: number;
  rowsCount?: number;
  errorMessage?: string | null;
  insights?: BusinessInsights | null;
}

export default function HomeClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [metrics, setMetrics] = useState<DbMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Track currently active SQL query details in the right-hand panel
  const [activeSqlResult, setActiveSqlResult] = useState<{
    sql: string;
    explanation: string;
    rows: Record<string, unknown>[];
    executionTimeMs?: number;
    rowsCount?: number;
    error?: string;
    insights?: BusinessInsights | null;
  } | null>(null);

  const [isAiConfigured, setIsAiConfigured] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error('Failed to load history list:', e);
    }
  };

  const fetchSchemaMetrics = async () => {
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics || []);
        setIsAiConfigured(data.isAiConfigured !== false);
      }
    } catch (e) {
      console.error('Failed to load schema metrics:', e);
    }
  };

  // Initial load: fetch history and metrics
  useEffect(() => {
    fetchHistory();
    fetchSchemaMetrics();
  }, []);

  // Re-run a question from history or from direct clicks
  const handleSelectHistory = async (item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setIsMobileSidebarOpen(false);
    
    // Append the question to our chat
    const userMsgId = generateUniqueId();
    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: item.question,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    // Append a placeholder message for loading state
    const botMsgId = generateUniqueId();
    const placeholderBotMsg: Message = {
      id: botMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholderBotMsg]);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: item.question }),
      });
      const result = await res.json();

      if (result.success) {
        updateBotMessage(botMsgId, result);
      } else {
        updateBotMessageWithError(botMsgId, result.error || 'Server error.');
      }
    } catch (e) {
      updateBotMessageWithError(botMsgId, (e as Error).message);
    } finally {
      setIsLoading(false);
      fetchHistory();
      fetchSchemaMetrics();
    }
  };

  // Submit new natural language query
  const handleSendMessage = async (text: string) => {
    setActiveHistoryId(null);
    const userMsgId = generateUniqueId();
    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    const botMsgId = generateUniqueId();
    const placeholderBotMsg: Message = {
      id: botMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholderBotMsg]);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const result = await res.json();

      if (result.success) {
        updateBotMessage(botMsgId, result);
      } else {
        updateBotMessageWithError(botMsgId, result.error || 'Server error.');
      }
    } catch (e) {
      updateBotMessageWithError(botMsgId, (e as Error).message);
    } finally {
      setIsLoading(false);
      fetchHistory();
      fetchSchemaMetrics();
    }
  };

  const updateBotMessage = (botMsgId: string, result: BotQueryResult) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === botMsgId) {
          let content = '';
          if (result.type === 'sql') {
            content = result.explanation || '';
            setActiveSqlResult({
              sql: result.sql || '',
              explanation: result.explanation || '',
              rows: result.rows || [],
              executionTimeMs: result.executionTimeMs,
              rowsCount: result.rowsCount,
              insights: result.insights,
            });
          } else if (result.type === 'clarification') {
            content = 'Please select one of the queries below to run:';
          } else if (result.type === 'database_error') {
            content = `SQLite threw an error during execution:\n${result.errorMessage}`;
            setActiveSqlResult({
              sql: result.sql || '',
              explanation: result.explanation || '',
              rows: [],
              error: result.errorMessage || undefined,
              insights: null,
            });
          } else if (result.type === 'error') {
            content = result.errorMessage || '';
          }

          return {
            ...msg,
            content,
            type: result.type,
            sql: result.sql,
            explanation: result.explanation,
            options: result.options,
            rows: result.rows,
            executionTimeMs: result.executionTimeMs,
            rowsCount: result.rowsCount,
            insights: result.insights,
          };
        }
        return msg;
      })
    );
  };

  const updateBotMessageWithError = (botMsgId: string, errorText: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === botMsgId) {
          return {
            ...msg,
            content: `Failed to query: ${errorText}`,
            type: 'error',
          };
        }
        return msg;
      })
    );
  };

  const handleRefresh = () => {
    fetchHistory();
    fetchSchemaMetrics();
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground font-sans">
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />

      {/* Navbar Banner */}
      <header className="relative z-20 shrink-0 border-b border-card-border bg-background/75 px-3 py-3 backdrop-blur-2xl sm:px-5 lg:px-6 select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-white/5 text-text-muted transition-all duration-200 hover:border-indigo-400/40 hover:bg-white/8 hover:text-white active:scale-95 lg:hidden"
              aria-label="Open database and history panel"
            >
              <Menu size={18} />
            </button>

            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 text-white shadow-lg shadow-indigo-600/20">
              <span className="absolute inset-0 rounded-xl bg-white/15 opacity-0 transition-opacity duration-300 hover:opacity-100" />
              <Cpu size={22} className="relative animate-soft-spin" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-emerald-200 bg-clip-text text-transparent sm:text-lg">
                  NF QueryGPT
                </h1>
                <span className="hidden items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:flex">
                  <Sparkles size={10} />
                  Live
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-text-muted sm:text-xs">Hinglish & English AI database assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 shadow-sm shadow-indigo-900/20 transition-all duration-200 hover:border-indigo-300/45 hover:bg-indigo-500/20 active:scale-[0.98] sm:flex"
            >
              <Upload size={14} />
              Upload data
            </button>

            {/* Read Only protection pill badge */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300 md:flex">
              <ShieldCheck size={12} />
              <span>Read-only guard</span>
            </div>

            {/* SQLite DB stats connection status badge */}
            <div className="hidden items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-[10px] font-semibold text-sky-200 xl:flex">
              <Database size={12} />
              <span>querygpt.db</span>
            </div>
          </div>
        </div>
      </header>

      {/* API Key Missing Alert Bar */}
      {!isAiConfigured && (
        <div className="relative z-20 flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 select-none">
          <AlertTriangle size={14} className="shrink-0 animate-bounce" />
          <span className="text-center">
            <strong>Missing Configuration:</strong> <code>GEMINI_API_KEY</code> environment variable is not defined. Please define it in your <code>.env.local</code> file and restart the development server.
          </span>
        </div>
      )}

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close panel overlay"
          />
          <aside className="animate-slide-in-left absolute left-0 top-0 h-full w-[min(88vw,360px)] p-3">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-card-border bg-card-bg/95 px-3 py-2 shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <PanelRightOpen size={15} className="text-sky-300" />
                Database panel
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-white/7 hover:text-white"
                aria-label="Close database panel"
              >
                <X size={16} />
              </button>
            </div>
            <HistorySidebar
              history={history}
              metrics={metrics}
              activeHistoryId={activeHistoryId}
              onSelectHistory={handleSelectHistory}
              onRefreshMetrics={handleRefresh}
              onOpenUpload={() => {
                setIsMobileSidebarOpen(false);
                setIsUploadOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      {/* Main Workspace Layout Grid */}
      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4 lg:grid-cols-[300px_minmax(360px,1fr)] xl:grid-cols-[300px_minmax(420px,1fr)_minmax(420px,0.9fr)] xl:overflow-hidden">
        {/* Left Column: History & Metadata Metrics */}
        <section className="hidden min-h-0 lg:block">
          <HistorySidebar
            history={history}
            metrics={metrics}
            activeHistoryId={activeHistoryId}
            onSelectHistory={handleSelectHistory}
            onRefreshMetrics={handleRefresh}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        </section>

        {/* Middle Column: Chat Window Console */}
        <section className="min-h-[560px] lg:min-h-0">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </section>

        {/* Right Column: SQL Visualizer & Paginated Data Viewer */}
        <section className="min-h-[420px] overflow-y-visible xl:min-h-0 xl:overflow-y-auto">
          {activeSqlResult ? (
            <div className="space-y-4">
              {/* SQL Syntax Highlighting Box */}
              <SqlDisplay
                sql={activeSqlResult.sql}
                executionTimeMs={activeSqlResult.executionTimeMs}
                rowsCount={activeSqlResult.rowsCount}
              />

              {/* Natural Language Query Explanation */}
              <Explanation explanation={activeSqlResult.explanation} />

              {/* Execution Errors */}
              {activeSqlResult.error && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-xs flex flex-col gap-2 font-mono">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span>Database Execution Error</span>
                  </div>
                  <p className="opacity-90">{activeSqlResult.error}</p>
                </div>
              )}

              {/* Dynamic Visualizations & AI Insights summary */}
              {activeSqlResult && !activeSqlResult.error && activeSqlResult.rows && activeSqlResult.rows.length > 0 && (
                <DataVisualizer rows={activeSqlResult.rows} insights={activeSqlResult.insights} />
              )}

              {/* Output Result Table Card */}
              {!activeSqlResult.error && (
                <DataViewer key={activeSqlResult.sql} rows={activeSqlResult.rows} />
              )}
            </div>
          ) : (
            // Workspace Empty State
            <div className="relative flex min-h-[420px] h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-card-border bg-card-bg/55 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-xl select-none">
              <div className="absolute inset-0 bg-grid-pattern opacity-80" />
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200 shadow-inner">
                <Layers size={26} className="animate-float" />
              </div>
              <h3 className="relative text-base font-bold text-foreground">SQL Workspace</h3>
              <p className="relative mt-2 max-w-sm text-sm leading-6 text-text-muted">
                Submit a query in the chat console or select a log from history to generate SQL, explanations, and explore the SQLite tables here.
              </p>
              <div className="relative mt-5 grid w-full max-w-sm grid-cols-3 gap-2 text-[10px] text-text-muted">
                <div className="rounded-lg border border-white/7 bg-white/4 px-2 py-2">SQL</div>
                <div className="rounded-lg border border-white/7 bg-white/4 px-2 py-2">Charts</div>
                <div className="rounded-lg border border-white/7 bg-white/4 px-2 py-2">Export</div>
              </div>
            </div>
          )}
        </section>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleRefresh}
      />
    </div>
  );
}
