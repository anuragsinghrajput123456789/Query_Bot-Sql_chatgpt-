'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cpu, ChevronRight } from 'lucide-react';

interface HeaderNavbarProps {
  user: {
    id: number;
    username: string;
    role: 'user' | 'admin';
  } | null;
}

export default function HeaderNavbar({ user }: HeaderNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // Refresh the current route to fetch new session state from server
        router.refresh();
      }
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  return (
    <header className="relative z-20 shrink-0 border-b border-card-border bg-background/30 bg-opacity-30 px-6 py-4 backdrop-blur-xl select-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-gradient-to-tr from-accent-secondary via-accent to-emerald-400 text-white shadow-lg shadow-accent/10 transition-transform group-hover:scale-105">
            <Cpu size={20} className="animate-icon-spin" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-accent bg-clip-text text-transparent">
              NF QueryGPT
            </h1>
            <p className="text-[10px] font-medium text-text-muted">AI Data Assistant Console</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6 ml-8 mr-auto select-none">
          <Link href="/console" className="text-xs font-bold text-text-muted hover:text-white transition-colors">
            Chat Console
          </Link>
          <Link href="/analytics" className="text-xs font-bold text-text-muted hover:text-white transition-colors">
            Analytics
          </Link>
          <Link href="/schema" className="text-xs font-bold text-text-muted hover:text-white transition-colors">
            DB Schema
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] font-semibold text-accent md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            v1.2 Live
          </span>

          {user ? (
            <>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-foreground select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-text-muted">Hello,</span>
                <span className="font-bold text-white max-w-[90px] truncate">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="group flex items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-white/4 px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-white hover:border-red-500/30 hover:bg-red-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
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

          <Link
            href="/console"
            className="group flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-accent-secondary to-accent text-white shadow-md shadow-accent-secondary/20 hover:brightness-110 active:scale-95 transition-all duration-200"
          >
            <span>Launch Terminal</span>
            <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
