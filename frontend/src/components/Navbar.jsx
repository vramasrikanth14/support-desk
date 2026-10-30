import React from 'react';

export default function Navbar({ user, onLogout, onMenu }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:justify-end md:px-8">
      <button onClick={onMenu} aria-label="Open menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800">{user.name}</div>
          <div className="text-xs font-medium capitalize text-slate-500">{user.role}</div>
        </div>
        <button onClick={onLogout} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
          Logout
        </button>
      </div>
    </header>
  );
}
