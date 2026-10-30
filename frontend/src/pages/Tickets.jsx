import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useDebounce, useMeta, useTickets } from '../hooks';
import { useToast } from '../context/ToastContext';
import { StatusBadge, PriorityBadge, EmptyState, ErrorState, Pagination, inputCls, fmtDate } from '../components/ui';
import TicketFormModal from '../components/TicketFormModal';
import TicketDrawer from '../components/TicketDrawer';

const LIMIT = 10;
const INITIAL = { search: '', status: '', priority: '', category: '', assignee: '', sortBy: 'createdAt', order: 'desc', page: 1 };

function SortHeader({ col, label, sort, onSort }) {
  const active = sort.sortBy === col;
  return (
    <th className="px-5 py-3 font-medium" aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 font-medium hover:text-slate-800">
        {label}
        <span className={active ? 'text-blue-600' : 'text-slate-300'}>{active && sort.order === 'asc' ? '↑' : '↓'}</span>
      </button>
    </th>
  );
}

export default function Tickets({ user }) {
  const isAdmin = user.role === 'admin';
  const meta = useMeta();
  const toast = useToast();

  const [filters, setFilters] = useState(INITIAL);
  const [users, setUsers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [drawerVersion, setDrawerVersion] = useState(0);

  const debouncedSearch = useDebounce(filters.search, 400);
  const { data, pagination, loading, error, reload } = useTickets({ ...filters, search: debouncedSearch, limit: LIMIT });

  useEffect(() => { api('/users').then(setUsers).catch(() => {}); }, []);

  // If the current page disappears (e.g. last row deleted), step back to the last valid page.
  useEffect(() => {
    if (pagination && !loading && pagination.totalPages > 0 && filters.page > pagination.totalPages) {
      setFilters((f) => ({ ...f, page: pagination.totalPages }));
    }
  }, [pagination, loading]);

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const toggleSort = (col) =>
    setFilter({ sortBy: col, order: filters.sortBy === col && filters.order === 'asc' ? 'desc' : 'asc' });

  const hasFilters = ['search', 'status', 'priority', 'category', 'assignee'].some((k) => filters[k]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (ticket) => {
  setSelectedId(null); // close the details drawer
  setEditing(ticket);
  setFormOpen(true);
};

  const handleSaved = () => {
    reload();
    setDrawerVersion((v) => v + 1); // refresh the drawer if it is open
  };

  const handleDelete = async (ticket) => {
    if (!window.confirm(`Delete "${ticket.title}"? This cannot be undone.`)) return;
    try {
      await api(`/tickets/${ticket._id}`, { method: 'DELETE' });
      toast.success('Ticket deleted');
      setSelectedId(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const select = 'min-w-[9rem] flex-1';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-slate-900">Support tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Search, filter and manage every request.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30">
          New ticket
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input type="search" aria-label="Search tickets" placeholder="Search title or description" className={`${inputCls} min-w-[12rem] flex-[2]`} value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} />
          <select aria-label="Filter by status" className={`${inputCls} ${select}`} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All statuses</option>
            {(meta?.statuses ?? []).map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Filter by priority" className={`${inputCls} ${select}`} value={filters.priority} onChange={(e) => setFilter({ priority: e.target.value })}>
            <option value="">All priorities</option>
            {(meta?.priorities ?? []).map((p) => <option key={p}>{p}</option>)}
          </select>
          <select aria-label="Filter by category" className={`${inputCls} ${select}`} value={filters.category} onChange={(e) => setFilter({ category: e.target.value })}>
            <option value="">All categories</option>
            {(meta?.categories ?? []).map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Filter by assignee" className={`${inputCls} ${select}`} value={filters.assignee} onChange={(e) => setFilter({ assignee: e.target.value })}>
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => setFilters(INITIAL)} className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">Clear filters</button>
          )}
        </div>

        {/* Table */}
        <div className={`overflow-x-auto transition-opacity ${loading && data.length ? 'opacity-60' : ''}`}>
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <SortHeader col="title" label="Ticket" sort={filters} onSort={toggleSort} />
                <SortHeader col="status" label="Status" sort={filters} onSort={toggleSort} />
                <SortHeader col="priority" label="Priority" sort={filters} onSort={toggleSort} />
                <th className="px-5 py-3 font-medium">Assignee</th>
                <SortHeader col="createdAt" label="Created" sort={filters} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && data.length === 0 && [0, 1, 2, 3].map((i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" /></td></tr>
              ))}

              {data.map((t) => (
                <tr
                  key={t._id}
                  tabIndex={0}
                  onClick={() => setSelectedId(t._id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(t._id)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                >
                  <td className="max-w-sm px-5 py-4">
                    <div className="font-medium text-slate-900">{t.title}</div>
                    <div className="mt-0.5 truncate text-slate-500">{t.description}</div>
                    <span className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.category}</span>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-4"><PriorityBadge priority={t.priority} /></td>
                  <td className="whitespace-nowrap px-5 py-4">{t.assignee?.name ?? <span className="text-slate-400">Unassigned</span>}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data.length === 0 && (
            hasFilters ? (
              <EmptyState title="No tickets match your filters" text="Try a different search or clear the filters." action={<button onClick={() => setFilters(INITIAL)} className="text-sm font-medium text-blue-600 hover:underline">Clear filters</button>} />
            ) : (
              <EmptyState title="No tickets yet" text="Create the first ticket to get started." action={<button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">New ticket</button>} />
            )
          )}
        </div>

        <Pagination pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      <TicketFormModal
        open={formOpen}
        ticket={editing}
        meta={meta}
        users={users}
        isAdmin={isAdmin}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <TicketDrawer
        ticketId={selectedId}
        version={drawerVersion}
        meta={meta}
        users={users}
        user={user}
        onClose={() => setSelectedId(null)}
        onChanged={reload}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
