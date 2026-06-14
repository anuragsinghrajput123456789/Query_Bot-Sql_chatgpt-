import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/auth/session';
import HeaderNavbar from './HeaderNavbar';
import { 
  Database, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Upload, 
  ArrowRight, 
  Cpu, 
  Terminal,
  ChevronRight,
  Layers,
  Activity,
  Play
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  let user = null;
  if (sessionCookie) {
    const payload = decryptSession(sessionCookie.value);
    if (payload) {
      user = {
        id: payload.userId,
        username: payload.username,
        role: payload.role,
      };
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050508] text-foreground font-sans">
      {/* Dynamic atmospheric background blobs */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-accent/10 blur-[140px] animate-pulse duration-[10000ms]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-accent-secondary/10 blur-[140px] animate-pulse duration-[12000ms]" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.25]" />

      {/* Premium Header Navbar */}
      <HeaderNavbar user={user} />

      {/* Hero Content Section */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 py-16 md:py-28 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center">
          
          {/* Animated Hero Badge */}
          <div className="animate-fade-in mb-6 flex items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent shadow-lg shadow-accent/5 select-none hover:border-accent/45 transition-colors">
            <Sparkles size={12} className="animate-pulse text-accent-secondary" />
            <span>Conversational Matrimonial Analytics Platform</span>
          </div>
          
          {/* Main Title Heading */}
          <div className="text-center max-w-4xl select-none animate-fade-in">
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.1] mb-6">
              Query Your Database in <br />
              <span className="bg-gradient-to-r from-accent via-accent-secondary to-purple-400 bg-clip-text text-transparent drop-shadow-md">
                Plain English & Hinglish
              </span>
            </h2>
            
            <p className="mx-auto text-sm leading-relaxed text-text-muted sm:text-base md:text-lg max-w-3xl mb-10">
              Stop writing complex SQL joins. Instantly analyze registered profiles, search subscribers, track payment transactions, and project revenues conversationally. Ingest raw spreadsheets or inspect SQLite schemas securely.
            </p>
          </div>

          {/* Interactive Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in mb-20 select-none">
            <Link
              href="/console"
              className="group relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-secondary to-accent px-8 py-4 text-xs font-bold text-white shadow-xl shadow-accent-secondary/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            >
              <Terminal size={14} className="group-hover:rotate-12 transition-transform" />
              <span>Launch Conversational Console</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/analytics"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 hover:border-white/20 px-8 py-4 text-xs font-bold text-foreground transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Activity size={14} className="text-accent" />
              <span>Executive Analytics Board</span>
            </Link>
          </div>

          {/* Premium Animated Feature Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 w-full mb-20">
            
            {/* Feature Card 1 */}
            <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-accent-green/30 hover:shadow-[0_8px_30px_rgb(16,185,129,0.05)] select-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-green to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-green/20 bg-accent-green/10 text-accent-green mb-5 shadow-inner transition-transform group-hover:scale-110">
                <Upload size={18} className="icon-hover-scale" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-accent-green transition-colors">Conversational Ingest</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Ingest CSVs, Excel files, or spreadsheets instantly. The platform structures files into SQLite tables for immediate querying.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-[0_8px_30px_rgb(0,242,255,0.05)] select-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent mb-5 shadow-inner transition-transform group-hover:scale-110">
                <Sparkles size={18} className="icon-hover-scale" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-accent transition-colors">Hinglish & Hindi Support</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Ask in standard English or mixed Hinglish. Chat naturally like <code className="text-accent bg-accent/5 px-1 py-0.5 rounded font-mono text-[10px]">premium female users count</code> or <code className="text-accent bg-accent/5 px-1 py-0.5 rounded font-mono text-[10px]">Srinagar ke active users</code>.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-accent-secondary/30 hover:shadow-[0_8px_30px_rgb(99,102,241,0.05)] select-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-secondary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-secondary/20 bg-accent-secondary/10 text-accent-secondary mb-5 shadow-inner transition-transform group-hover:scale-110">
                <TrendingUp size={18} className="icon-hover-scale" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-accent-secondary transition-colors">Interactive Dashboards</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Instantly plots comparisons as Bar, Line, Pie, Area, Heatmap, or KPI metrics. Auto-selects recommendations using Gemini.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/20 hover:shadow-[0_8px_30px_rgb(168,85,247,0.05)] select-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 mb-5 shadow-inner transition-transform group-hover:scale-110">
                <ShieldCheck size={18} className="icon-hover-scale" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-purple-400 transition-colors">Read-Only Security Shield</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Advanced SQL safety guard inspects and blocks all data-modifying queries (DELETE, ALTER, UPDATE) keeping database operations 100% safe.
              </p>
            </div>

          </div>

          {/* Quick interactive Console HUD Preview */}
          <div className="w-full max-w-5xl rounded-2xl border border-white/5 bg-card-bg/25 p-2.5 backdrop-blur-md select-none shadow-2xl relative animate-fade-in group hover:border-white/10 transition-colors">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/2 rounded-t-xl text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Terminal size={11} className="text-accent animate-pulse" />
                <span>Conversational Console Preview</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-accent-green" />
            </div>
            
            <div className="p-5 bg-background/30 rounded-b-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="border border-white/5 bg-white/2 p-4 rounded-xl flex flex-col gap-2 hover:bg-white/4 transition-colors">
                <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">Connected Schema</span>
                <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <Database size={12} className="text-accent" /> querygpt.db
                </span>
                <span className="text-[9px] text-accent font-mono font-bold bg-accent/10 border border-accent/20 px-2 py-0.5 rounded w-max">
                  12 System Tables
                </span>
              </div>

              <div className="border border-white/5 bg-white/2 p-4 rounded-xl flex flex-col gap-2 hover:bg-white/4 transition-colors">
                <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">Sample Query Input</span>
                <span className="text-xs font-medium text-white italic">
                  &quot;Show active users count by city&quot;
                </span>
                <span className="text-[9px] text-accent-green font-mono font-bold bg-accent-green-bg border border-accent-green/20 px-2 py-0.5 rounded w-max">
                  SQL SELECT Generated
                </span>
              </div>

              <div className="border border-white/5 bg-white/2 p-4 rounded-xl flex flex-col gap-2 hover:bg-white/4 transition-colors">
                <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">Workspace Panels</span>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded bg-accent-secondary/15 border border-accent-secondary/25 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent-secondary">Query</span>
                  <span className="rounded bg-accent/15 border border-accent/25 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent">Visuals</span>
                  <span className="rounded bg-accent-green/15 border border-accent-green/25 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent-green">Raw Data</span>
                </div>
                <span className="text-[9px] text-text-muted leading-relaxed">Toggle workspaces dynamically.</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Banner */}
      <footer className="relative z-20 shrink-0 border-t border-card-border bg-background/20 py-8 text-center text-[10px] text-text-muted select-none">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 NF QueryGPT. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Built for premium database analytics. <ShieldCheck size={12} className="text-accent-green animate-pulse" /> Guarded by Read-only protection.
          </span>
        </div>
      </footer>
    </div>
  );
}
