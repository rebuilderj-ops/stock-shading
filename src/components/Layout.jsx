import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, CalendarDays, Settings, Activity, Menu, X, Sun, Moon, Info } from 'lucide-react';

const Layout = () => {
  // 모바일 사이드바 열림/닫힘 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 설정 모달 열림/닫힘 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // 테마 상태 (dark 또는 light)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // 테마 변경 효과 적용
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const navItems = [
    { path: '/', name: '모닝 브리핑 홈', icon: <LayoutDashboard size={20} /> },
    { path: '/shadowing', name: '주식쉐도잉 뱅크', icon: <Activity size={20} /> },
    { path: '/encyclopedia', name: '키워드 백과사전', icon: <BookOpen size={20} /> },
    { path: '/calendar', name: '키워드 캘린더', icon: <CalendarDays size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-[#0F172A] text-slate-50 overflow-hidden relative">
      
      {/* 모바일용 상단 헤더바 (MD 미만 가로화면 대응) */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800/80 absolute top-0 left-0 right-0 z-30 shadow-md">
        <h1 className="text-xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-400 text-transparent bg-clip-text">
          StockTheme
        </h1>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* 모바일 사이드바 뒷배경 어두운 레이어 (모바일에서 사이드바가 켜졌을 때 터치하면 닫히게 함) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar (모바일에서는 좌측 슬라이딩, 데스크톱에서는 고정) */}
      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel border-r border-slate-800/60 flex flex-col z-50 transition-transform duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:w-64 md:flex`}
      >
        <div className="p-6 flex justify-between items-center border-b border-slate-800/40 md:border-b-0">
          <div>
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-400 text-transparent bg-clip-text">
              StockTheme
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide mt-1 uppercase">Pro Dashboard</p>
          </div>
          {/* 모바일 닫기 버튼 */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              // [중요] 모바일에서는 메뉴 터치 클릭 시 사이드바가 자동으로 슥 접히게 합니다.
              onClick={() => setIsSidebarOpen(false)}
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

        {/* 설정 버튼 (클릭 시 세련된 테마 전환 모달 활성화) */}
        <div className="p-4 border-t border-slate-800/50 mt-auto">
          <button 
            onClick={() => {
              setIsSettingsOpen(true);
              setIsSidebarOpen(false); // 설정 누르면 모바일 사이드바도 접어줍니다
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Settings size={20} />
            <span>설정 (테마 스위치)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto pt-[72px] md:pt-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0F172A]/0 to-[#0F172A]/0 pointer-events-none"></div>
        
        <div className="p-5 md:p-10 relative z-10 max-w-7xl mx-auto space-y-6">
          <Outlet />
        </div>
      </main>

      {/* [설정 모달 팝업] 다크 모드 / 라이트 모드 조절 똑딱이 스위치가 탑재되어 있습니다. */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-700">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-blue-400" />
                시스템 환경 설정
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* 테마 스케치 토글 스위치 */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">화면 테마 설정</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* 다크모드 선택 단추 */}
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow' 
                        : 'bg-slate-900/30 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Moon size={16} />
                    <span>다크 모드</span>
                  </button>

                  {/* 라이트모드 선택 단추 */}
                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow' 
                        : 'bg-slate-900/30 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Sun size={16} />
                    <span>라이트 모드</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  * 선택하신 모드는 로컬 저장소에 고정 보관되어 페이지를 새로고침해도 똑같이 유지됩니다.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-700 bg-slate-800 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-slate-100 shadow transition-all cursor-pointer text-xs"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;
