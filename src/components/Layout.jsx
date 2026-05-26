import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, CalendarDays, Settings, Activity, Menu, X, Sun, Moon, Minus, Plus } from 'lucide-react';

const Layout = () => {
  // 모바일 사이드바 열림/닫힘 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 설정 모달 열림/닫힘 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // 테마 상태 (dark 또는 light)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  // 화면 배율 크기 상태 (80% ~ 120% 사이, 기본값 100%)
  const [scale, setScale] = useState(() => {
    const saved = parseInt(localStorage.getItem('ui-scale'));
    if (isNaN(saved)) return 100;
    return Math.min(Math.max(saved, 80), 120);
  });

  // 테마 변경 효과 적용
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // [중요] 화면 배율(scale) 변경 효과 적용
  // 루트(HTML 최상단)의 글씨 크기 배율을 변경하여 전체 UI 마진/폰트가 비율에 맞춰 확대/축소됩니다.
  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    localStorage.setItem('ui-scale', scale);
  }, [scale]);

  const navItems = [
    { path: '/', name: '모닝 브리핑 홈', icon: <LayoutDashboard size={20} /> },
    { path: '/shadowing', name: '주식쉐도잉 뱅크', icon: <Activity size={20} /> },
    { path: '/encyclopedia', name: '키워드 백과사전', icon: <BookOpen size={20} /> },
    { path: '/calendar', name: '키워드 캘린더', icon: <CalendarDays size={20} /> },
  ];

  // 화면 배율 증가 함수 (최대 120%)
  const handleZoomIn = () => {
    if (scale < 120) {
      setScale(scale + 10);
    }
  };

  // 화면 배율 감소 함수 (최대 80%)
  const handleZoomOut = () => {
    if (scale > 80) {
      setScale(scale - 10);
    }
  };

  // 배율 상태에 따른 한글 꼬리말 설명
  const getScaleLabel = (currentScale) => {
    if (currentScale === 100) return "100% (기본값)";
    if (currentScale < 100) return `${currentScale}% (작게 보기)`;
    if (currentScale >= 120) return `${currentScale}% (눈이 편안함/최대)`;
    return `${currentScale}%`;
  };

  return (
    <div className="flex h-screen bg-[#0F172A] text-slate-50 overflow-hidden relative">
      
      {/* 모바일용 상단 헤더바 */}
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

      {/* 모바일 사이드바 뒷배경 어두운 레이어 */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar */}
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

        {/* 설정 버튼 */}
        <div className="p-4 border-t border-slate-800/50 mt-auto">
          <button 
            onClick={() => {
              setIsSettingsOpen(true);
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Settings size={20} />
            <span>설정 (크기/테마)</span>
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

      {/* [설정 모달 팝업] */}
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
              {/* 1. 테마 설정 단추 */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">화면 테마 설정</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow' 
                        : 'bg-slate-900/30 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Moon size={15} />
                    <span>다크 모드</span>
                  </button>

                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow' 
                        : 'bg-slate-900/30 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Sun size={15} />
                    <span>라이트 모드</span>
                  </button>
                </div>
              </div>

              {/* 2. [신규 피드백 반영] 전체 화면 크기 (돋보기 배율) 설정 단추 */}
              <div className="space-y-2.5 border-t border-slate-700/60 pt-4">
                <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">화면 크기 설정 (80% ~ 120%)</label>
                
                <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                  {/* 축소 버튼 */}
                  <button 
                    onClick={handleZoomOut}
                    disabled={scale <= 80}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      scale <= 80 
                        ? 'text-slate-600 border-slate-800/80 bg-slate-950/20 cursor-not-allowed' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Minus size={15} />
                  </button>

                  {/* 배율 텍스트 상태 */}
                  <span className="text-xs font-bold text-slate-200 tracking-tight select-none">
                    {getScaleLabel(scale)}
                  </span>

                  {/* 확대 버튼 */}
                  <button 
                    onClick={handleZoomIn}
                    disabled={scale >= 120}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      scale >= 120 
                        ? 'text-slate-600 border-slate-800/80 bg-slate-950/20 cursor-not-allowed' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-500 leading-relaxed pl-1">
                  * 돋보기 기능처럼 글씨와 모든 컴포넌트의 배율이 눈이 편안한 황금 비율로 유기적 변신합니다.
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
