import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { Avatar, EmptyState, ErrorState, inputCls } from '../components/ui';

export default function ManageUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const loadUsers = () => {
    setError(null);
    return api('/users')
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      await api('/users', { method: 'POST', body: form });
      toast.success(`${form.name} was added`);
      setForm({ name: '', email: '', password: '' });
      setShowPassword(false);
      loadUsers();
    } catch (err) {
      setFieldErrors(Object.fromEntries((err.errors || []).map((x) => [x.field, x.message])));
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)) : users;
  }, [users, query]);

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const label = 'mb-1.5 block text-sm font-medium text-slate-700';
  const fieldErr = (k) => fieldErrors[k] && <p className="mt-1 text-xs text-red-600">{fieldErrors[k]}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-slate-900">Manage users</h1>
        <p className="mt-1 text-sm text-slate-500">
          {users.length} {users.length === 1 ? 'person has' : 'people have'} access{adminCount > 0 && ` · ${adminCount} ${adminCount === 1 ? 'admin' : 'admins'}`}
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="m-0 mb-4 text-base font-semibold text-slate-900">Add a user</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="u-name" className={label}>Full name</label>
            <input id="u-name" required minLength={2} className={inputCls} placeholder="Priya Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {fieldErr('name')}
          </div>
          <div>
            <label htmlFor="u-email" className={label}>Email</label>
            <input id="u-email" required type="email" className={inputCls} placeholder="priya@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {fieldErr('email')}
          </div>
          <div>
            <label htmlFor="u-pass" className={label}>Temporary password</label>
            <div className="relative">
              <input id="u-pass" required minLength={6} type={showPassword ? 'text' : 'password'} className={`${inputCls} pr-16`} placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 px-3.5 text-sm font-medium text-slate-500 hover:text-slate-800">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErr('password')}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Adding…' : 'Add user'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="m-0 text-base font-semibold text-slate-900">All users</h2>
          <input type="search" aria-label="Search users" placeholder="Search by name or email" className={`${inputCls} sm:max-w-xs`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && [0, 1, 2].map((i) => (
                <tr key={i}><td colSpan={3} className="px-5 py-4"><div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" /></td></tr>
              ))}
              {!loading && visible.map((u) => (
                <tr key={u._id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className="h-9 w-9 text-sm" />
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${u.role === 'admin' ? 'bg-violet-50 text-violet-700 ring-violet-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {error && <ErrorState message={error} onRetry={loadUsers} />}
          {!loading && !error && visible.length === 0 && (
            <EmptyState icon="👥" title={users.length === 0 ? 'No users yet' : 'No users match your search'} text={users.length === 0 ? 'Add your first user with the form above.' : 'Try a different name or email.'} />
          )}
        </div>
      </div>
    </div>
  );
}
