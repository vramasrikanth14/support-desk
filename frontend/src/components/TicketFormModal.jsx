import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { Modal, Spinner, inputCls } from './ui';

const EMPTY = { title: '', description: '', category: 'General', priority: 'Medium', assignee: '' };

// ticket === null  -> create     ticket === {...} -> edit
export default function TicketFormModal({ open, ticket, meta, users, isAdmin, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setError('');
    setFieldErrors({});
    setForm(
      ticket
        ? { title: ticket.title, description: ticket.description, category: ticket.category, priority: ticket.priority, assignee: '' }
        : EMPTY
    );
  }, [open, ticket]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    const { assignee, ...fields } = form;
    try {
      const saved = ticket
        ? await api(`/tickets/${ticket._id}`, { method: 'PATCH', body: fields })
        : await api('/tickets', { method: 'POST', body: { ...fields, ...(isAdmin && assignee ? { assignee } : {}) } });
      toast.success(ticket ? 'Ticket updated' : 'Ticket created');
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.errors || []).map((x) => [x.field, x.message])));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const fieldErr = (k) => fieldErrors[k] && <p className="mt-1 text-xs text-red-600">{fieldErrors[k]}</p>;
  const label = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <Modal open={open} title={ticket ? 'Edit ticket' : 'New ticket'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <div>
          <label htmlFor="f-title" className={label}>Title</label>
          <input id="f-title" required minLength={3} maxLength={120} className={inputCls} placeholder="e.g. Can't download my payslip" value={form.title} onChange={set('title')} />
          {fieldErr('title')}
        </div>
        <div>
          <label htmlFor="f-desc" className={label}>Description</label>
          <textarea id="f-desc" required minLength={5} maxLength={2000} rows={4} className={`${inputCls} resize-y`} placeholder="What happened, and what did you expect?" value={form.description} onChange={set('description')} />
          {fieldErr('description')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="f-cat" className={label}>Category</label>
            <select id="f-cat" className={inputCls} value={form.category} onChange={set('category')}>
              {(meta?.categories ?? [form.category]).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-pri" className={label}>Priority</label>
            <select id="f-pri" className={inputCls} value={form.priority} onChange={set('priority')}>
              {(meta?.priorities ?? [form.priority]).map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {isAdmin && !ticket && (
          <div>
            <label htmlFor="f-asg" className={label}>Assignee</label>
            <select id="f-asg" className={inputCls} value={form.assignee} onChange={set('assignee')}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
            {busy && <Spinner className="h-4 w-4 text-white" />}
            {ticket ? 'Save changes' : 'Create ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
