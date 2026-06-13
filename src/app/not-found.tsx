import React from 'react';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 text-slate-100 antialiased selection:bg-sky-500/30 font-sans">
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />

      <div className="relative flex w-full max-w-md flex-col items-center rounded-xl border border-card-border bg-card-bg/85 p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
          ?
        </div>
        
        <h2 className="mb-2 text-xl font-bold tracking-tight text-white">
          Page Not Found
        </h2>
        
        <p className="mb-6 text-sm leading-6 text-text-muted">
          The requested page could not be found. Please return to the homepage to explore the AI database assistant.
        </p>

        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg shadow-indigo-950/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          <span>Return Home</span>
        </a>
      </div>
    </div>
  );
}
