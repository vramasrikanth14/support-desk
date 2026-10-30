import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../api';
import { StatCard, Spinner, ErrorState, EmptyState, inputCls } from '../components/ui';

const STATUS_COLORS = { Open: '#3b82f6', 'In Progress': '#f59e0b', Resolved: '#10b981', Closed: '#94a3b8' };
const PRIORITY_COLORS = { Low: '#94a3b8', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

const PRESETS = [
  { label: 'All time', range: () => ({ from: '', to: '' }) },
  { label: 'Last 7 days', range: () => ({ from: daysAgo(7), to: iso(new Date()) }) },
  { label: 'Last 30 days', range: () => ({ from: daysAgo(30), to: iso(new Date()) }) },
];

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="m-0 mb-4 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api('/tickets/analytics', { params: range, signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => ctrl.abort();
  }, [range.from, range.to, tick]);

  const { data, loading, error } = state;
  const statusData = data?.byStatus.filter((s) => s.count > 0) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Live numbers from your ticket data.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setRange(p.range())} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm">
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="from" className="mb-1 block text-xs font-medium text-slate-500">From</label>
            <input id="from" type="date" className={`${inputCls} py-2`} value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1 block text-xs font-medium text-slate-500">To</label>
            <input id="to" type="date" className={`${inputCls} py-2`} value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
        </div>
      </div>

      {error && !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white"><ErrorState message={error} onRetry={() => setTick((t) => t + 1)} /></div>
      ) : !data ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total tickets" value={data.total} />
            <StatCard label="Open" value={data.open} tone="text-blue-600" />
            <StatCard label="Resolved" value={data.resolved} tone="text-emerald-600" />
            <StatCard label="Critical priority" value={data.critical} tone="text-red-600" />
          </div>

          {data.total === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
              <EmptyState icon="📭" title="No tickets in this period" text="Try a wider date range." />
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ChartCard title="Tickets by status">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                        {statusData.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="m-0 mt-3 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0 text-sm text-slate-600">
                  {data.byStatus.map((s) => (
                    <li key={s.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
                      {s.name} <span className="font-medium text-slate-900">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </ChartCard>

              <ChartCard title="Tickets by priority">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byPriority} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {data.byPriority.map((p) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
