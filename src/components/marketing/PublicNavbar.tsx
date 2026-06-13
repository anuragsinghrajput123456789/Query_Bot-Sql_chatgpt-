import Link from 'next/link';
import { Cpu, Sparkles } from 'lucide-react';
import { AuthenticatedUser } from '@/types';
import LogoutButton from '@/components/auth/LogoutButton';

interface PublicNavbarProps {
  user: AuthenticatedUser | null;
}

export default function PublicNavbar({ user }: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-card-border bg-background/75 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/20 bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 text-white shadow-lg shadow-indigo-600/20">
            <Cpu size={21} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate bg-gradient-to-r from-white via-sky-100 to-emerald-200 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
                NF QueryGPT
              </span>
              <span className="hidden items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:flex">
                <Sparkles size={10} />
                Secure
              </span>
            </div>
            <p className="truncate text-[11px] text-text-muted">AI SQL workspace with login and protected access</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/#features" className="rounded-full px-3 py-2 text-sm text-text-muted transition-colors hover:text-white">
            Features
          </Link>
          <Link href="/#security" className="rounded-full px-3 py-2 text-sm text-text-muted transition-colors hover:text-white">
            Security
          </Link>
          <Link href="/#workflow" className="rounded-full px-3 py-2 text-sm text-text-muted transition-colors hover:text-white">
            Workflow
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/workspace"
                className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition-all duration-200 hover:border-sky-300/35 hover:bg-sky-400/15"
              >
                Open Workspace
              </Link>
              <LogoutButton
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10"
                redirectTo="/"
                compact
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition-transform duration-200 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
