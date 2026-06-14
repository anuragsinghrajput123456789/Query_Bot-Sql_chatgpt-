'use client';

import React from 'react';

export const dynamic = 'force-dynamic';


export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#050508', color: '#F6F7FB', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: '#00f2ff' }}>
            System Error Occurred
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#8e9cae', maxWidth: '400px', margin: '0 0 1.5rem 0', lineHeight: 1.6 }}>
            The application encountered a critical crash. Please try resetting the workspace below.
          </p>
          <button 
            onClick={() => reset()}
            style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #6366f1, #00f2ff)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
          >
            Reset Workspace
          </button>
        </div>
      </body>
    </html>
  );
}
