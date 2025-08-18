"use client";

import React from 'react';

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme.mode');
    return (saved === 'dark' || saved === 'light') ? (saved as any) : 'light';
  });

  React.useEffect(() => {
    const html = document.documentElement;
    if (mode === 'dark') html.setAttribute('data-theme', 'dark');
    else html.removeAttribute('data-theme');
    try { localStorage.setItem('theme.mode', mode); } catch {}
  }, [mode]);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
      className={className}
    >
      {mode === 'light' ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 0l1.79-1.8 1.41 1.41-1.8 1.79-1.4-1.4zM12 4V1h-1v3h1zm0 19v-3h-1v3h1zm7-10h3v-1h-3v1zM1 13h3v-1H1v1zm3.35 6.65l1.41 1.41 1.8-1.79-1.42-1.42-1.79 1.8zM18.24 18.24l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>
          <span>Light</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.64 13a1 1 0 00-1.05-.14A8 8 0 1111.14 3.41a1 1 0 00-.14-1.05 1 1 0 00-1.09-.29A10 10 0 1022 14.09a1 1 0 00-.36-1.09z"/></svg>
          <span>Dark</span>
        </span>
      )}
    </button>
  );
}


