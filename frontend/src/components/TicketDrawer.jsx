import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { Spinner, ErrorState, StatusBadge, PriorityBadge, fmtDate, fmtDateTime, inputCls } from './ui';

const TIMELINE_DOT = { created: 'bg-emerald-500', status: 'bg-blue-500', assignee: 'bg-violet-500', updated: 'bg-slate-400' };

function describe(h) {
  switch (h.type) {
    case 'created': return 'Ticket created';
    case 'status': return <>Status changed from <b>{h.from}</b> to <b>{h.to}</b></>;
    case 'assignee': return <>Assignee changed from <b>{h.from}</b> to <b>{h.to}</b></>;
    default: return h.note || 'Ticket updated';
  }
}

// Slide-over with ticket details, status actions, assignment and the activity timeline.
export default function TicketDrawer({ ticketId, version, meta, users, user, onClose, onChanged, onEdit, onDelete }) {
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!ticketId) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api(`/tickets/${ticketId}`, { signal: ctrl.signal })
      .then(setTicket)
      .catch((err) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [ticketId, version, retry]);

  useEffect(() => {
    if (!ticketId) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ticketId, onClose]);

  if (!ticketId) return null;

  const canModify =
    ticket && (isAdmin || ticket.createdBy?._id === user.id || ticket.assignee?._id === user.id);
  const nextStatuses = ticket ? meta?.transitions?.[ticket.status] ?? [] : [];

  const run = async (path, body, okMessage) => {
    setBusy(true);
    try {
      const updated = await api(`/tickets/${ticket._id}${path}`, { method: 'PATCH', body });
      setTicket(updated);
      toast.success(okMessage);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Ticket details">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="m-0 text-base font-semibold text-slate-900">Ticket details</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && !ticket && <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>}
          {error && !ticket && <ErrorState message={error} onRetry={() => setRetry((r) => r + 1)} />}

          {ticket && (
            <div className="space-y-6">
              <div>
                <h3 className="m-0 text-xl font-semibold text-slate-900">{ticket.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{ticket.category}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{ticket.description}</p>
              </div>

              <dl className="m-0 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div>
                  <dt className="text-slate-500">Created by</dt>
                  <dd className="m-0 mt-0.5 font-medium text-slate-900">{ticket.createdBy?.name ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created on</dt>
                  <dd className="m-0 mt-0.5 font-medium text-slate-900">{fmtDate(ticket.createdAt)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="mb-1 text-slate-500">Assignee</dt>
                  <dd className="m-0">
                    {isAdmin ? (
                      <select
                        aria-label="Assignee"
                        className={`${inputCls} py-2`}
                        disabled={busy}
                        value={ticket.assignee?._id ?? ''}
                        onChange={(e) => run('/assignee', { assignee: e.target.value || null }, 'Assignee updated')}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <span className="font-medium text-slate-900">{ticket.assignee?.name ?? 'Unassigned'}</span>
                    )}
                  </dd>
                </div>
              </dl>

              {canModify && (
                <div>
                  <h4 className="m-0 mb-2 text-sm font-semibold text-slate-900">Move to</h4>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((s) => (
                      <button
                        key={s}
                        disabled={busy}
                        onClick={() => run('/status', { status: s }, `Status changed to ${s}`)}
                        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                    {nextStatuses.length === 0 && <p className="m-0 text-sm text-slate-500">No further status changes available.</p>}
                  </div>
                </div>
              )}

              <div>
                <h4 className="m-0 mb-3 text-sm font-semibold text-slate-900">Activity</h4>
                <ol className="m-0 list-none space-y-4 p-0">
                  {[...ticket.history].reverse().map((h, i, arr) => (
                    <li key={`${h.at}-${i}`} className="relative flex gap-3">
                      {i < arr.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}
                      <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white ${TIMELINE_DOT[h.type] || 'bg-slate-400'}`} />
                      <div className="text-sm">
                        <p className="m-0 text-slate-800">{describe(h)}</p>
                        <p className="m-0 mt-0.5 text-xs text-slate-500">{h.by?.name ?? 'System'} · {fmtDateTime(h.at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {ticket && (canModify || isAdmin) && (
          <div className="flex justify-between gap-3 border-t border-slate-200 px-6 py-4">
            {isAdmin ? (
              <button onClick={() => onDelete(ticket)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
            ) : <span />}
            {canModify && (
              <button onClick={() => onEdit(ticket)} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Edit ticket</button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
