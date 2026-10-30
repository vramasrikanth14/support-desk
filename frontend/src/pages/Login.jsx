import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

const Svg = ({ children, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Logo = ({ light }) => (
  <div className="flex items-center gap-3">
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${light ? 'bg-white/15 text-white ring-1 ring-white/30' : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-600/25'}`}>
      <Svg className="h-5 w-5">
        <path d="M4 12a8 8 0 0 1 16 0" />
        <rect x="2.5" y="12" width="4" height="6" rx="1.5" />
        <rect x="17.5" y="12" width="4" height="6" rx="1.5" />
        <path d="M20 18v.5a2.5 2.5 0 0 1-2.5 2.5H13" />
      </Svg>
    </span>
    <span className={`text-xl font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>SupportDesk</span>
  </div>
);

// Decorative preview of what the product looks like
function MockTicket({ title, status, statusCls, priority, dot, className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-xl shadow-blue-950/20 ${className}`}>
      <div className="flex items-start justify-between gap-6">
        <p className="m-0 text-sm font-semibold text-slate-900">{title}</p>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusCls}`}>{status}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {priority} priority
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    'w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15';

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative"><Logo light /></div>

        <div className="relative">
          <h2 className="m-0 max-w-md text-4xl font-bold leading-tight tracking-tight">
            Every request, tracked from first message to resolved.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-blue-100">
            Prioritise what matters, assign the right person and see exactly how your team is doing.
          </p>

          <div className="relative mt-10 h-52 max-w-md">
            <MockTicket
              className="absolute left-0 top-0 w-72 -rotate-3"
              title="Cannot log in on mobile"
              status="Open"
              statusCls="bg-blue-50 text-blue-700"
              priority="Critical"
              dot="bg-red-500"
            />
            <MockTicket
              className="absolute left-24 top-20 w-72 rotate-2"
              title="Invoice shows wrong amount"
              status="In Progress"
              statusCls="bg-amber-50 text-amber-700"
              priority="High"
              dot="bg-orange-500"
            />
            <MockTicket
              className="absolute left-8 top-40 w-72 -rotate-1"
              title="Export to CSV fails"
              status="Resolved"
              statusCls="bg-emerald-50 text-emerald-700"
              priority="Medium"
              dot="bg-amber-500"
            />
          </div>
        </div>

        <p className="relative m-0 text-sm text-blue-200">© {new Date().getFullYear()} SupportDesk</p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-slate-50 px-6 py-12 lg:bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo /></div>

          <h1 className="m-0 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to your dashboard.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate={false}>
            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <Svg className="mt-0.5 h-4 w-4 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></Svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>
                </span>
                <input id="email" type="email" required autoFocus autoComplete="email" placeholder="you@company.com" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Svg><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
                </span>
                <input id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" className={`${field} pr-16`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-slate-500 hover:text-slate-800">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Spinner className="h-4 w-4 text-white" />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Need an account? Ask your administrator to add you.
          </p>
        </div>
      </main>
    </div>
  );
}