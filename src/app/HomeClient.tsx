'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  TrendingUp,
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

interface HomeClientProps {
  user: {
    id: number;
    username: string;
    role: 'user' | 'admin';
  } | null;
}

export default function HomeClient({ user }: HomeClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [metrics, setMetrics] = useState<DbMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Track workspace tab selection: 'query' (SQL & explanation), 'visuals' (charts & insights), 'data' (raw table)
  const [activeTab, setActiveTab] = useState<'query' | 'visuals' | 'data'>('query');

  // Track desktop layout panel toggles (Show/Hide panels dynamically)
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showVisuals, setShowVisuals] = useState(true);

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

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        router.push('/login');
      }
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

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

  // Removed dashboard/decision helpers as they are migrated to the dedicated Analytics page

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
            
            // Auto-open workspace when a query runs successfully
            setShowVisuals(true);

            // Switch tabs: default to visuals if dynamic charts are recommended, else code
            if (result.insights && result.insights.recommendedChart && result.insights.recommendedChart !== 'none' && result.rows && result.rows.length > 0) {
              setActiveTab('visuals');
            } else {
              setActiveTab('query');
            }
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
            setShowVisuals(true);
            setActiveTab('query');
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

  // Calculate dynamic CSS grid columns depending on panel states
  const getGridStyle = () => {
    let cols = [];
    if (showSidebar) cols.push('300px');
    
    let activePanels = 0;
    if (showChat) activePanels++;
    if (showVisuals) activePanels++;
    
    if (activePanels === 2) {
      cols.push('minmax(400px, 1.1fr)');
      cols.push('minmax(400px, 0.9fr)');
    } else if (activePanels === 1) {
      cols.push('1fr');
    }
    
    return cols.join(' ') || '1fr';
  };

  const renderEmptyState = () => (
    <div className="relative flex min-h-[420px] h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-card-border bg-card-bg/55 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-xl select-none">
      <div className="absolute inset-0 bg-grid-pattern opacity-80" />
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/5 blur-3xl" />
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent shadow-inner">
        <Layers size={26} className="animate-icon-float" />
      </div>
      <h3 className="relative text-base font-bold text-foreground">SQL Workspace</h3>
      <p className="relative mt-2 max-w-sm text-sm leading-6 text-text-muted">
        Submit a query in the chat console or select a log from history to generate SQL, explanations, and explore the SQLite tables here.
      </p>
      <div className="relative mt-5 grid w-full max-w-sm grid-cols-3 gap-2 text-[10px] text-text-muted">
        <div className="rounded-lg border border-white/5 bg-white/3 px-2 py-2">SQL</div>
        <div className="rounded-lg border border-white/5 bg-white/3 px-2 py-2">Charts</div>
        <div className="rounded-lg border border-white/5 bg-white/3 px-2 py-2">Export</div>
      </div>
    </div>
  );

  // Removed renderDecisionBoard and renderDashboard as they are migrated to the dedicated Analytics page

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground font-sans">
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />

      {/* Navbar Banner */}
      <header className="relative z-20 shrink-0 border-b border-card-border bg-background/50 px-3 py-3 backdrop-blur-2xl sm:px-5 lg:px-6 select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="group flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-white/5 text-text-muted transition-all duration-200 hover:border-accent hover:bg-white/8 hover:text-white active:scale-95 lg:hidden"
              aria-label="Open database and history panel"
            >
              <Menu size={18} className="icon-hover-scale" />
            </button>

            <Link href="/" className="flex items-center gap-3 group shrink-0 min-w-0 select-none">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-gradient-to-tr from-accent-secondary via-accent to-emerald-400 text-white shadow-lg shadow-accent/10 transition-transform group-hover:scale-[1.03]">
                <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                <Cpu size={22} className="relative animate-icon-spin" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-accent bg-clip-text text-transparent sm:text-lg">
                    NF QueryGPT
                  </h1>
                  <span className="hidden items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:flex">
                    <Sparkles size={10} className="animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="truncate text-[11px] font-medium text-text-muted sm:text-xs">Hinglish & English AI database assistant</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-5 ml-6 select-none border-l border-white/10 pl-6">
              <Link href="/console" className="text-xs font-bold text-accent transition-colors">
                Chat Console
              </Link>
              <Link href="/analytics" className="text-xs font-bold text-text-muted hover:text-white transition-colors">
                Analytics
              </Link>
              <Link href="/schema" className="text-xs font-bold text-text-muted hover:text-white transition-colors">
                DB Schema
              </Link>
            </div>
          </div>

          {/* Panel Layout Control Buttons (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-1 p-0.5 rounded-lg bg-card-bg border border-card-border backdrop-blur-xl">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                showSidebar 
                  ? 'bg-accent/15 text-accent border border-accent/25' 
                  : 'text-text-muted hover:text-white border border-transparent'
              }`}
              title="Toggle Schema & Stats Sidebar"
            >
              <Database size={11} />
              <span>Sidebar</span>
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                showChat 
                  ? 'bg-accent/15 text-accent border border-accent/25' 
                  : 'text-text-muted hover:text-white border border-transparent'
              }`}
              title="Toggle AI Chat Terminal"
            >
              <Cpu size={11} />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setShowVisuals(!showVisuals)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                showVisuals 
                  ? 'bg-accent/15 text-accent border border-accent/25' 
                  : 'text-text-muted hover:text-white border border-transparent'
              }`}
              title="Toggle Workspace Tabs (SQL & Data)"
            >
              <Layers size={11} />
              <span>Workspace</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="group hidden items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent shadow-sm shadow-accent/5 transition-all duration-200 hover:border-accent/50 hover:bg-accent/20 hover:text-white active:scale-[0.98] sm:flex cursor-pointer"
            >
              <Upload size={14} className="icon-hover-scale" />
              Upload data
            </button>

            {/* Read Only protection pill badge or Admin full access */}
            {user && user.role === 'admin' ? (
              <div className="hidden items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-bold text-purple-300 md:flex shadow-sm shadow-purple-500/5 select-none animate-pulse">
                <Sparkles size={12} className="text-purple-400" />
                <span>Admin Full Access</span>
              </div>
            ) : (
              <div className="hidden items-center gap-1.5 rounded-full border border-accent-green/20 bg-accent-green-bg px-3 py-1.5 text-[10px] font-semibold text-accent-green md:flex select-none">
                <ShieldCheck size={12} className="animate-pulse" />
                <span>Read-only guard</span>
              </div>
            )}

            {user ? (
              <>
                {/* User details badge */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-foreground select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-text-muted">Hello,</span>
                  <span className="font-bold text-white max-w-[90px] truncate">{user.username}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="group flex items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-white/4 px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-white hover:border-red-500/30 hover:bg-red-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                {/* Guest Mode Pill */}
                <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-accent-secondary/20 bg-accent-secondary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-secondary select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-secondary animate-pulse" />
                  <span>Guest Mode</span>
                </div>

                {/* Login and Sign Up buttons */}
                <Link
                  href="/login"
                  className="group flex items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-white/4 px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-white hover:border-accent/30 hover:bg-accent/10 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span>Login</span>
                </Link>
                <Link
                  href="/signup"
                  className="group flex items-center justify-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent shadow-sm shadow-accent/5 transition-all duration-200 hover:border-accent/50 hover:bg-accent/20 hover:text-white active:scale-95 cursor-pointer"
                >
                  <span>Sign Up</span>
                </Link>
              </>
            )}
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
            <div className="mb-3 flex items-center justify-between rounded-xl border border-card-border bg-card-bg/95 px-3 py-2 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <PanelRightOpen size={15} className="text-accent" />
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
              userRole={user?.role}
              currentUserId={user?.id}
              onRefreshHistory={fetchHistory}
              onOpenUpload={() => {
                setIsMobileSidebarOpen(false);
                setIsUploadOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      {/* Main Workspace Layout Grid */}
      <main 
        className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4 lg:overflow-hidden"
        style={{
          gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth >= 1024 ? getGridStyle() : undefined
        }}
      >
        {/* Left Column: History & Metadata Metrics */}
        {showSidebar && (
          <section className="hidden min-h-0 lg:block h-full">
            <HistorySidebar
              history={history}
              metrics={metrics}
              activeHistoryId={activeHistoryId}
              onSelectHistory={handleSelectHistory}
              onRefreshMetrics={handleRefresh}
              userRole={user?.role}
              currentUserId={user?.id}
              onRefreshHistory={fetchHistory}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </section>
        )}

        {/* Middle Column: Chat Window Console */}
        {showChat && (
          <section className="min-h-[560px] lg:min-h-0 h-full flex flex-col">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
            />
          </section>
        )}

        {/* Right Column: SQL Visualizer & Paginated Data Viewer in Tabbed Workspace */}
        {showVisuals && (
          <section className="min-h-[420px] lg:min-h-0 flex flex-col h-full">
            <div className="flex flex-col gap-4 h-full min-h-0">
              
              {/* Sleek Navigation Tabs */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="flex p-1 rounded-xl bg-card-bg/90 border border-card-border backdrop-blur-xl select-none flex-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('query')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      activeTab === 'query'
                        ? 'bg-accent/10 text-white border border-accent/20 shadow-md shadow-accent/5'
                        : 'text-text-muted hover:text-white border border-transparent'
                    }`}
                  >
                    <Cpu size={13} className={activeTab === 'query' ? 'text-accent animate-pulse' : 'text-text-muted'} />
                    <span>Query & Code</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('visuals')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      activeTab === 'visuals'
                        ? 'bg-accent/10 text-white border border-accent/20 shadow-md shadow-accent/5'
                        : 'text-text-muted hover:text-white border border-transparent'
                    }`}
                  >
                    <Sparkles size={13} className={activeTab === 'visuals' ? 'text-accent animate-pulse' : 'text-text-muted'} />
                    <span>Visuals & Insights</span>
                    {activeSqlResult?.insights && activeSqlResult?.rows && activeSqlResult?.rows.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      activeTab === 'data'
                        ? 'bg-accent/10 text-white border border-accent/20 shadow-md shadow-accent/5'
                        : 'text-text-muted hover:text-white border border-transparent'
                    }`}
                  >
                    <Database size={13} className={activeTab === 'data' ? 'text-accent' : 'text-text-muted'} />
                    <span>Raw Data</span>
                    {activeSqlResult?.rows && activeSqlResult?.rows.length > 0 && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-text-muted ml-1">
                        {activeSqlResult.rows.length}
                      </span>
                    )}
                  </button>

                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 min-h-0 overflow-y-auto animate-fade-in space-y-4">
                
                {/* QUERY / CODE TAB */}
                {activeTab === 'query' && (
                  activeSqlResult ? (
                    <div className="space-y-4">
                      {activeSqlResult.error && (
                        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-xs flex flex-col gap-2 font-mono shrink-0">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle size={14} className="text-red-400" />
                            <span>Database Execution Error</span>
                          </div>
                          <p className="opacity-90">{activeSqlResult.error}</p>
                        </div>
                      )}
                      <SqlDisplay
                        sql={activeSqlResult.sql}
                        executionTimeMs={activeSqlResult.executionTimeMs}
                        rowsCount={activeSqlResult.rowsCount}
                      />
                      <Explanation explanation={activeSqlResult.explanation} />
                    </div>
                  ) : (
                    renderEmptyState()
                  )
                )}

                {/* VISUALS TAB */}
                {activeTab === 'visuals' && (
                  activeSqlResult ? (
                    <DataVisualizer rows={activeSqlResult.rows} insights={activeSqlResult.insights} />
                  ) : (
                    renderEmptyState()
                  )
                )}

                {/* DATA TAB */}
                {activeTab === 'data' && (
                  activeSqlResult ? (
                    <DataViewer key={activeSqlResult.sql} rows={activeSqlResult.rows} />
                  ) : (
                    renderEmptyState()
                  )
                )}

                {/* Decision and Dashboard tabs migrated to separate page */}

              </div>
            </div>
          </section>
        )}

        {/* Fallback Workspace UI when all panels are closed */}
        {!showSidebar && !showChat && !showVisuals && (
          <section className="col-span-full flex flex-col items-center justify-center text-center p-12 select-none min-h-[420px] rounded-xl border border-card-border bg-card-bg/55 backdrop-blur-xl shadow-2xl">
            <Layers size={36} className="text-accent animate-icon-pulse mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Workspace Minimized</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              All workspace panels are hidden. Use the layout toolbar in the navbar above to toggle panels and continue your database interaction.
            </p>
          </section>
        )}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleRefresh}
      />
    </div>
  );
}
