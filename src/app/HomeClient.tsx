'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Message, HistoryItem, DbMetric, BusinessInsights } from '@/types';
import HistorySidebar from '@/components/history/HistorySidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import SqlDisplay from '@/components/sql/SqlDisplay';
import Explanation from '@/components/sql/Explanation';
import DataViewer from '@/components/sql/DataViewer';
import DataVisualizer from '@/components/sql/DataVisualizer';
import UploadModal from '@/components/ui/UploadModal';
import LogoutButton from '@/components/auth/LogoutButton';
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
  ArrowRight,
  Home,
  UserRound,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

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

type SectionKey = 'overview' | 'workspace' | 'history' | 'insights';

interface HomeClientProps {
  user: AuthenticatedUser;
}

export default function HomeClient({ user }: HomeClientProps) {
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
  const overviewRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);
  const insightsRef = useRef<HTMLElement | null>(null);

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

  const totalRows = useMemo(
    () => metrics.reduce((sum, metric) => sum + metric.count, 0),
    [metrics]
  );

  const uploadedTableCount = useMemo(
    () => metrics.filter((metric) => metric.table.startsWith('uploaded_')).length,
    [metrics]
  );

  const latestHistoryLabel = useMemo(() => {
    if (!history[0]?.timestamp) return 'Waiting for first query';

    try {
      return `Last query at ${new Date(history[0].timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return 'Recent activity available';
    }
  }, [history]);

  const scrollToSection = (section: SectionKey) => {
    if (section === 'history' && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSidebarOpen(true);
      return;
    }

    const sectionMap: Record<SectionKey, React.RefObject<HTMLElement | null>> = {
      overview: overviewRef,
      workspace: workspaceRef,
      history: historyRef,
      insights: insightsRef,
    };

    sectionMap[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItems: Array<{ key: SectionKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'workspace', label: 'Workspace' },
    { key: 'history', label: 'History' },
    { key: 'insights', label: 'Insights' },
  ];

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground font-sans">
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />

      <header className="relative z-20 shrink-0 border-b border-card-border bg-background/80 px-3 py-3 backdrop-blur-2xl select-none sm:px-5 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-white/5 text-text-muted transition-all duration-200 hover:border-indigo-400/40 hover:bg-white/8 hover:text-white active:scale-95 lg:hidden"
                aria-label="Open database and history panel"
              >
                <Menu size={18} />
              </button>

              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/20 bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 text-white shadow-lg shadow-indigo-600/20">
                <span className="absolute inset-0 rounded-2xl bg-white/15 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                <Cpu size={22} className="relative animate-soft-spin" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate bg-gradient-to-r from-white via-sky-100 to-emerald-200 bg-clip-text text-base font-extrabold tracking-tight text-transparent sm:text-lg">
                    NF QueryGPT
                  </h1>
                  <span className="hidden items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:flex">
                    <Sparkles size={10} />
                    Live
                  </span>
                </div>
                <p className="truncate text-[11px] font-medium text-text-muted sm:text-xs">
                  Safer AI SQL workspace for English and Hinglish questions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10 md:flex"
              >
                <Home size={14} />
                Home
              </Link>

              <button
                onClick={() => setIsUploadOpen(true)}
                className="hidden items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 shadow-sm shadow-indigo-900/20 transition-all duration-200 hover:border-indigo-300/45 hover:bg-indigo-500/20 active:scale-[0.98] sm:flex"
              >
                <Upload size={14} />
                Upload data
              </button>

              <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300 lg:flex">
                <ShieldCheck size={12} />
                <span>Read-only guard</span>
              </div>

              <div className="hidden items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-[10px] font-semibold text-sky-200 xl:flex">
                <Database size={12} />
                <span>querygpt.db</span>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 lg:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sky-200">
                  <UserRound size={13} />
                </span>
                <span className="max-w-[160px] truncate font-medium">{user.name}</span>
              </div>

              <LogoutButton
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10"
                redirectTo="/"
                compact
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.key)}
                  className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-medium text-text-muted transition-all duration-200 hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto text-[11px] text-text-muted">
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
                {metrics.length} tables
              </span>
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
                {totalRows.toLocaleString()} rows indexed
              </span>
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
                {history.length} saved queries
              </span>
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
                {latestHistoryLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

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
            <div className="mb-3 rounded-2xl border border-card-border bg-card-bg/95 p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
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
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      window.setTimeout(() => scrollToSection(item.key), 120);
                    }}
                    className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-text-muted"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
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

      <main className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4 lg:grid-cols-[300px_minmax(360px,1fr)] xl:grid-cols-[300px_minmax(420px,1fr)_minmax(420px,0.9fr)] xl:overflow-hidden">
        <section
          ref={overviewRef}
          className="grid gap-3 lg:col-span-2 xl:col-span-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]"
        >
          <div className="relative overflow-hidden rounded-[28px] border border-card-border bg-[linear-gradient(135deg,rgba(79,70,229,0.18),rgba(56,189,248,0.10),rgba(16,185,129,0.12))] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
            <div className="absolute inset-0 bg-grid-pattern opacity-40" />
            <div className="absolute -right-14 top-0 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/35 px-3 py-1 text-[11px] font-medium text-sky-100">
                <Sparkles size={12} />
                Home dashboard
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Query your database with a cleaner, guided workspace.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200/85 sm:text-base">
                Ask questions naturally, review guarded SQL, inspect results, and move between history and insights from a single home experience.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => scrollToSection('workspace')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Open workspace
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => scrollToSection('history')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-background/30 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-sky-300/35 hover:bg-white/8"
                >
                  Browse history
                </button>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-all duration-200 hover:border-emerald-300/35 hover:bg-emerald-400/15"
                >
                  <Upload size={15} />
                  Add a dataset
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[24px] border border-card-border bg-card-bg/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200">
                <Database size={18} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Coverage</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{metrics.length}</p>
              <p className="mt-1 text-sm text-text-muted">
                tables ready with {totalRows.toLocaleString()} total rows indexed.
              </p>
            </div>

            <div className="rounded-[24px] border border-card-border bg-card-bg/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-100">
                <Sparkles size={18} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Activity</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{history.length}</p>
              <p className="mt-1 text-sm text-text-muted">
                queries in history, with explanations, charts, and result tables.
              </p>
            </div>

            <div className="rounded-[24px] border border-card-border bg-card-bg/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                <ShieldCheck size={18} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Safety</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{uploadedTableCount}</p>
              <p className="mt-1 text-sm text-text-muted">
                uploaded tables detected. Read-only protection stays active for generated SQL.
              </p>
            </div>
          </div>
        </section>

        <section ref={historyRef} className="hidden min-h-0 lg:block">
          <HistorySidebar
            history={history}
            metrics={metrics}
            activeHistoryId={activeHistoryId}
            onSelectHistory={handleSelectHistory}
            onRefreshMetrics={handleRefresh}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        </section>

        <section ref={workspaceRef} className="min-h-[560px] lg:min-h-0">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </section>

        <section ref={insightsRef} className="min-h-[420px] overflow-y-visible xl:min-h-0 xl:overflow-y-auto">
          {activeSqlResult ? (
            <div className="space-y-4">
              <SqlDisplay
                sql={activeSqlResult.sql}
                executionTimeMs={activeSqlResult.executionTimeMs}
                rowsCount={activeSqlResult.rowsCount}
              />

              <Explanation explanation={activeSqlResult.explanation} />

              {activeSqlResult.error && (
                <div className="flex flex-col gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 font-mono text-xs text-red-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span>Database Execution Error</span>
                  </div>
                  <p className="opacity-90">{activeSqlResult.error}</p>
                </div>
              )}

              {activeSqlResult && !activeSqlResult.error && activeSqlResult.rows && activeSqlResult.rows.length > 0 && (
                <DataVisualizer rows={activeSqlResult.rows} insights={activeSqlResult.insights} />
              )}

              {!activeSqlResult.error && (
                <DataViewer key={activeSqlResult.sql} rows={activeSqlResult.rows} />
              )}
            </div>
          ) : (
            <div className="relative flex h-full min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-[24px] border border-card-border bg-card-bg/60 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-xl select-none">
              <div className="absolute inset-0 bg-grid-pattern opacity-80" />
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200 shadow-inner">
                <Layers size={26} className="animate-float" />
              </div>
              <h3 className="relative text-base font-bold text-foreground">Insights Workspace</h3>
              <p className="relative mt-2 max-w-sm text-sm leading-6 text-text-muted">
                Run a question from the chat or reopen something from history to see SQL, explanations, charts, and table results here.
              </p>
              <div className="relative mt-5 grid w-full max-w-sm grid-cols-3 gap-2 text-[10px] text-text-muted">
                <div className="rounded-lg border border-white/7 bg-white/4 px-2 py-2">SQL</div>
                <div className="rounded-lg border border-white/7 bg-white/4 px-2 py-2">Charts</div>
                <div className="rounded-lg border border-white/7 bg-white/4 px-2 py-2">Results</div>
              </div>
              <button
                onClick={() => scrollToSection('workspace')}
                className="relative mt-6 inline-flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition-all duration-200 hover:border-sky-300/35 hover:bg-sky-400/15"
              >
                Start from the workspace
                <ArrowRight size={14} />
              </button>
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
