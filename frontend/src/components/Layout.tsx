import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/rag',       label: 'AI Assistant', icon: '◈' },
];

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xl font-bold">⬡</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">NPI Manager</p>
              <p className="text-slate-400 text-xs">New Product Introduction</p>
            </div>
          </div>
        </div>

        {/* New Project button */}
        <div className="px-4 py-4">
          <button
            onClick={() => navigate('/projects/new')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600
                       hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span className="text-lg leading-none">+</span> New Project
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-700">
          <p className="text-slate-500 text-xs text-center">NPI Prototype v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
