'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />
          <section className="relative flex w-full max-w-md flex-col items-center rounded-xl border border-card-border bg-card-bg/85 p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200">
              !
            </div>
            <h1 className="mb-2 text-xl font-bold tracking-tight text-white">Something went wrong</h1>
            <p className="mb-6 text-sm leading-6 text-text-muted">
              The app hit an unexpected error. Reset the page to try loading the workspace again.
            </p>
            <button
              onClick={reset}
              className="w-full rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-950/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              Reset app
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
