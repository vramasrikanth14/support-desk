// import React from 'react';
// import { Avatar } from './ui';

// const Icon = ({ children }) => (
//   <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
//     {children}
//   </svg>
// );

// const icons = {
//   dashboard: (
//     <Icon>
//       <rect x="3" y="3" width="7" height="9" rx="1.5" />
//       <rect x="14" y="3" width="7" height="5" rx="1.5" />
//       <rect x="14" y="12" width="7" height="9" rx="1.5" />
//       <rect x="3" y="16" width="7" height="5" rx="1.5" />
//     </Icon>
//   ),
//   tickets: (
//     <Icon>
//       <path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" />
//       <path d="M14 5v14" strokeDasharray="2 3" />
//     </Icon>
//   ),
//   users: (
//     <Icon>
//       <circle cx="9" cy="8" r="3.5" />
//       <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
//       <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
//       <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
//     </Icon>
//   ),
// };

// const menuItems = [
//   { id: 'dashboard', label: 'Dashboard', roles: ['admin', 'user'] },
//   { id: 'tickets', label: 'Tickets', roles: ['admin', 'user'] },
//   { id: 'users', label: 'Manage users', roles: ['admin'] },
// ];

// export default function Sidebar({ currentPage, setPage, user, open, onClose }) {
//   const items = menuItems.filter((i) => i.roles.includes(user.role));

//   return (
//     <>
//       {open && <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={onClose} />}
//       <aside
//         className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-slate-200 bg-white text-slate-800 transition-transform md:static md:translate-x-0 ${
//           open ? 'translate-x-0' : '-translate-x-full'
//         }`}
//       >
//         <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
//           <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-600/25">
//             <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
//               <path d="M4 12a8 8 0 0 1 16 0" />
//               <rect x="2.5" y="12" width="4" height="6" rx="1.5" />
//               <rect x="17.5" y="12" width="4" height="6" rx="1.5" />
//               <path d="M20 18v.5a2.5 2.5 0 0 1-2.5 2.5H13" />
//             </svg>
//           </span>
//           <span className="text-lg font-semibold tracking-tight text-slate-900">SupportDesk</span>
//         </div>

//         <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Main">
//           <p className="mb-2 px-3 text-xs font-medium text-slate-400">Menu</p>
//           {items.map((item) => {
//             const active = currentPage === item.id;
//             return (
//               <button
//                 key={item.id}
//                 onClick={() => { setPage(item.id); onClose(); }}
//                 aria-current={active ? 'page' : undefined}
//                 className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
//                   active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
//                 }`}
//               >
//                 {active && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />}
//                 <span className={active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>{icons[item.id]}</span>
//                 {item.label}
//               </button>
//             );
//           })}
//         </nav>

//         <div className="border-t border-slate-200 p-4">
//           <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
//             <Avatar name={user.name} className="h-9 w-9 text-sm" />
//             <div className="min-w-0">
//               <p className="m-0 truncate text-sm font-medium text-slate-900">{user.name}</p>
//               <p className="m-0 text-xs capitalize text-slate-500">{user.role}</p>
//             </div>
//           </div>
//         </div>
//       </aside>
//     </>
//   );
// }
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar } from './ui';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const icons = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  ),
  tickets: (
    <Icon>
      <path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" />
      <path d="M14 5v14" strokeDasharray="2 3" />
    </Icon>
  ),
  users: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </Icon>
  ),
};

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', roles: ['admin', 'user'] },
  { id: 'tickets', label: 'Tickets', path: '/tickets', roles: ['admin', 'user'] },
  { id: 'users', label: 'Manage users', path: '/users', roles: ['admin'] },
];

export default function Sidebar({ user, open, onClose }) {
  const items = menuItems.filter((i) => i.roles.includes(user.role));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-slate-200 bg-white text-slate-800 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-600/25">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 16 0" />
              <rect x="2.5" y="12" width="4" height="6" rx="1.5" />
              <rect x="17.5" y="12" width="4" height="6" rx="1.5" />
              <path d="M20 18v.5a2.5 2.5 0 0 1-2.5 2.5H13" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">SupportDesk</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Main">
          <p className="mb-2 px-3 text-xs font-medium text-slate-400">Menu</p>
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
                  )}
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>
                    {icons[item.id]}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Avatar name={user.name} className="h-9 w-9 text-sm" />
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="m-0 text-xs capitalize text-slate-500">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}