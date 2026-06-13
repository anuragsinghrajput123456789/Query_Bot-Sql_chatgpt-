'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isSignup = mode === 'signup';
  const nextPath = useMemo(() => searchParams.get('next') || '/workspace', [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setError('');

    if (isSignup && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(isSignup ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error || 'Authentication failed.');
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-card-border bg-card-bg/85 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200">
          {isSignup ? <UserRound size={22} /> : <LockKeyhole size={22} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{isSignup ? 'Create your account' : 'Welcome back'}</p>
          <p className="text-xs text-text-muted">
            {isSignup ? 'Sign up to enter the protected SQL workspace.' : 'Login to continue into the protected workspace.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-200">
              Full name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-sky-400/50 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-sky-400/50 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignup ? 'Create a strong password' : 'Enter your password'}
            className="w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-sky-400/50 focus:outline-none"
          />
          {isSignup && (
            <p className="mt-2 text-xs text-text-muted">Use at least 6 characters.</p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span>{isLoading ? 'Please wait...' : isSignup ? 'Create account' : 'Login'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-text-muted">
        {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link
          href={isSignup ? '/login' : '/signup'}
          className="font-semibold text-sky-300 transition-colors hover:text-sky-200"
        >
          {isSignup ? 'Login here' : 'Sign up here'}
        </Link>
      </p>
    </div>
  );
}
