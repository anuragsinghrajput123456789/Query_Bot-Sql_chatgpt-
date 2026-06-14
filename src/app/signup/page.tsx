'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cpu, ShieldCheck, User, Lock, Sparkles, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();

      if (data.success) {
        router.push('/console');
      } else {
        setError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground font-sans px-4">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-60" />
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-accent-secondary/10 blur-3xl" />

      {/* Header Back Link */}
      <div className="relative z-10 mb-8 select-none">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-gradient-to-tr from-accent-secondary via-accent to-emerald-400 text-white shadow-lg shadow-accent/10 transition-transform group-hover:scale-105">
            <Cpu size={20} className="animate-icon-spin" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-accent bg-clip-text text-transparent">
              NF QueryGPT
            </h1>
            <p className="text-[10px] font-medium text-text-muted">Return to Home</p>
          </div>
        </Link>
      </div>

      {/* Glassmorphic Sign Up Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-card-border bg-card-bg/60 p-8 shadow-2xl backdrop-blur-xl animate-fade-in">
        <div className="mb-6 text-center select-none">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
            <UserPlus size={22} className="animate-icon-float" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Create your account</h2>
          <p className="mt-1.5 text-xs text-text-muted">Start asking your database anything in seconds</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center text-xs font-semibold text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <User size={15} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 transition-all duration-200 focus:border-accent focus:bg-white/8 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 transition-all duration-200 focus:border-accent focus:bg-white/8 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Select Account Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  role === 'user'
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-white/5 bg-white/2 text-text-muted hover:bg-white/4 hover:text-white'
                }`}
              >
                <ShieldCheck size={14} className={role === 'user' ? 'text-accent' : 'text-text-muted'} />
                <span>Standard User</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  role === 'admin'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/5'
                    : 'border-white/5 bg-white/2 text-text-muted hover:bg-white/4 hover:text-white'
                }`}
              >
                <Sparkles size={14} className={role === 'admin' ? 'text-emerald-400' : 'text-text-muted'} />
                <span>Admin Privileges</span>
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-text-muted leading-relaxed">
              {role === 'user'
                ? 'Standard users are strictly restricted to read-only queries (SELECT only) with a security filter guard.'
                : 'Admin role allows read and write execution (CREATE, INSERT, ALTER tables) and global query log access.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-secondary to-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-secondary/20 hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Sign up</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-muted select-none">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
