import Link from 'next/link';
import { ArrowRight, Database, LockKeyhole, MessageSquareText, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { AuthenticatedUser } from '@/types';
import PublicNavbar from '@/components/marketing/PublicNavbar';

interface LandingPageProps {
  user: AuthenticatedUser | null;
}

const featureCards = [
  {
    title: 'Natural language SQL',
    description: 'Ask in English or Hinglish and turn business questions into guarded SQLite queries.',
    icon: MessageSquareText,
  },
  {
    title: 'Protected workspace',
    description: 'Keep the analysis console behind login so only authenticated users can access query tools and uploaded datasets.',
    icon: LockKeyhole,
  },
  {
    title: 'Fast exploration',
    description: 'Review schema stats, query history, SQL explanations, charts, and results in one focused view.',
    icon: Database,
  },
];

const workflowCards = [
  { title: 'Sign up', description: 'Create your account and get redirected into the protected app.' },
  { title: 'Ask questions', description: 'Run AI-assisted SQL against the SQLite dataset inside the workspace.' },
  { title: 'Inspect results', description: 'Review explanations, visual summaries, history, and uploaded tables.' },
];

export default function LandingPage({ user }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />

      <PublicNavbar user={user} />

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.85fr)] lg:px-8 lg:pt-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-100">
              <ShieldCheck size={14} />
              Protected AI data workspace
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              A real home page, auth flow, and SQL workspace in one app.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              NF QueryGPT now starts with a public landing page and navbar, then moves authenticated users into a protected database workspace for natural-language querying, uploads, and history.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={user ? '/workspace' : '/signup'}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
              >
                {user ? 'Open Workspace' : 'Create Account'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={user ? '/workspace' : '/login'}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:border-sky-300/35 hover:bg-white/10"
              >
                {user ? 'Continue Analysis' : 'Login'}
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-card-border bg-card-bg/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Access</p>
                <p className="mt-2 text-2xl font-bold text-white">Secure</p>
                <p className="mt-2 text-sm text-text-muted">Login-protected pages and API routes.</p>
              </div>
              <div className="rounded-[24px] border border-card-border bg-card-bg/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Queries</p>
                <p className="mt-2 text-2xl font-bold text-white">Natural</p>
                <p className="mt-2 text-sm text-text-muted">Ask business questions instead of writing SQL manually.</p>
              </div>
              <div className="rounded-[24px] border border-card-border bg-card-bg/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Uploads</p>
                <p className="mt-2 text-2xl font-bold text-white">Flexible</p>
                <p className="mt-2 text-sm text-text-muted">Bring in CSV or Excel data and query it from the same app.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-card-border bg-card-bg/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">What the new flow looks like</p>
                <p className="text-xs text-text-muted">Public home, account access, protected workspace</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                  <ShieldCheck size={12} />
                  Home + Navbar
                </div>
                <p className="text-sm text-slate-200">Public entry point with navigation, clear CTAs, and product framing.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[11px] font-semibold text-indigo-100">
                  <LockKeyhole size={12} />
                  Login + Signup
                </div>
                <p className="text-sm text-slate-200">Credential-based authentication with secure session cookies.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[11px] font-semibold text-sky-100">
                  <UploadCloud size={12} />
                  Protected Workspace
                </div>
                <p className="text-sm text-slate-200">Authenticated access to querying, history, schema, and uploads.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Features</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Built for safer analytics workflows</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-[24px] border border-card-border bg-card-bg/75 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-200">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="security" className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-[28px] border border-card-border bg-card-bg/75 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              <ShieldCheck size={22} />
            </div>
            <h2 className="text-2xl font-bold text-white">Authentication and protected API access</h2>
            <p className="mt-3 text-sm leading-7 text-text-muted">
              The new auth layer protects the workspace page and the query, schema, history, and upload endpoints. Users now access database tooling only after logging in.
            </p>
          </div>
          <div id="workflow" className="rounded-[28px] border border-card-border bg-card-bg/75 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-200">Workflow</p>
            <div className="mt-5 space-y-4">
              {workflowCards.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
