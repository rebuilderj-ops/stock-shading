import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, CalendarDays, Settings, Activity } from 'lucide-react';

const Layout = () => {
  const navItems = [
    { path: '/', name: '모닝 브리핑 홈', icon: <LayoutDashboard size={20} /> },
    { path: '/shadowing', name: '주식쉐도잉 뱅크', icon: <Activity size={20} /> },
    { path: '/encyclopedia', name: '키워드 백과사전', icon: <BookOpen size={20} /> },
    { path: '/calendar', name: '키워드 캘린더', icon: <CalendarDays size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-[#0F172A] text-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col z-10">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-400 text-transparent bg-clip-text">
            StockTheme
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-1 uppercase">Pro Dashboard</p>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
              }
            >
              <div className="transition-transform group-hover:scale-110">
                {item.icon}
              </div>
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50 mt-auto">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors">
            <Settings size={20} />
            <span>설정</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0F172A]/0 to-[#0F172A]/0 pointer-events-none"></div>
        <div className="p-10 relative z-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
