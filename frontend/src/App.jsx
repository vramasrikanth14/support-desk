import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import ManageUsers from './pages/ManageUsers';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }
  if (!user) return <Login />;

  const current = page === 'users' && user.role !== 'admin' ? 'dashboard' : page;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={current} setPage={setPage} user={user} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} onLogout={logout} onMenu={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {current === 'dashboard' && <Dashboard />}
          {current === 'tickets' && <Tickets user={user} />}
          {current === 'users' && <ManageUsers />}
        </main>
      </div>
    </div>
  );
}
