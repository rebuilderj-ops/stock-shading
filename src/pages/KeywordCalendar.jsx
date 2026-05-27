import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Tag, Plus, X, Flame, Info } from 'lucide-react';
import { INITIAL_KEYWORDS, INITIAL_SCHEDULES, INITIAL_DAILY_RECORDS } from '../lib/mockData';

// Tailwind CSS purged class helper
const COLOR_MAP = {
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  violet: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  lime: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  yellow: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  indigo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  sky: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  rose: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  slate: "bg-slate-500/20 text-slate-400 border-slate-500/30"
};

const KeywordCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  
  // 모바일 화면 가로보기 권장 뱃지 상태
  const [isBannerClosed, setIsBannerClosed] = useState(false);

  // 터치 및 클릭 반응형 상세 판넬을 위한 선택된 날짜 상태입니다. 기본값은 오늘 날짜입니다.
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // [신규] 최근 5영업일 동안의 날짜들을 가동하여 5일간 자금 쏠림의 거시적 이동 트렌드를 추출합니다.
  const last5Dates = useMemo(() => {
    const dates = [...new Set(INITIAL_DAILY_RECORDS.map(r => r.date))];
    dates.sort((a, b) => new Date(b) - new Date(a));
    // 최근 5개 영업일만 오름차순(시간 흐름 순: 월 -> 화 -> 수 -> 목 -> 금)으로 역순 슬라이싱 정렬합니다.
    return dates.slice(0, 5).reverse();
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ date: '', title: '', keyword_id: '' });

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const handleAddSchedule = () => {
    if (!newSchedule.title || !newSchedule.date || !newSchedule.keyword_id) return;
    setSchedules([...schedules, {
      id: Date.now(),
      date: newSchedule.date,
      title: newSchedule.title,
      keyword_id: parseInt(newSchedule.keyword_id)
    }]);
    setIsModalOpen(false);
    setNewSchedule({ date: '', title: '', keyword_id: '' });
  };

  const getTop5SectorsForDate = (dateStr) => {
    const dailyRecords = INITIAL_DAILY_RECORDS.filter(r => r.date === dateStr);
    if (!dailyRecords.length) return [];

    const volumeByKeyword = {};
    dailyRecords.forEach(r => {
      const stock = INITIAL_STOCKS.find(s => s.id === r.stock_id);
      const keywordIds = stock?.keyword_ids || (r.keyword_id ? [r.keyword_id] : (stock?.keyword_id ? [stock.keyword_id] : []));
      
      keywordIds.forEach(kwId => {
        if (!volumeByKeyword[kwId]) volumeByKeyword[kwId] = 0;
        volumeByKeyword[kwId] += r.volume_krw;
      });
    });

    const sortedKeywords = Object.entries(volumeByKeyword)
      .map(([k_id, vol]) => ({ keyword_id: parseInt(k_id), vol }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 5);

    return sortedKeywords.map((item, idx) => {
      const kw = INITIAL_KEYWORDS.find(k => k.id === item.keyword_id);
      return {
        rank: idx + 1,
        name: kw?.name || "기타",
        colorClass: kw && kw.color ? COLOR_MAP[kw.color] : "bg-slate-700 text-slate-300 border-slate-600",
        vol: item.vol
      };
    });
  };

  const renderCells = () => {
    const cells = [];
    // Previous month blanks
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`prev-${i}`} className="min-h-[60px] md:min-h-[170px] p-2 border-b border-r border-slate-800/50 bg-slate-900/30 opacity-50"></div>);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySchedules = schedules.filter(s => s.date === dateStr);
      const top5Sectors = getTop5SectorsForDate(dateStr);
      
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const isSelected = selectedDate === dateStr;

      cells.push(
        <div key={`day-${day}`} 
             onClick={() => setSelectedDate(dateStr)}
             className={`min-h-[60px] md:min-h-[170px] p-1.5 md:p-2 border-b border-r border-slate-800/50 transition-all hover:bg-slate-700/30 relative flex flex-col gap-1 cursor-pointer ${
               isToday ? 'bg-blue-900/15 ring-1 ring-inset ring-blue-500/30' : 
               isSelected ? 'bg-slate-700/40 ring-1 ring-inset ring-violet-500/50' : 'bg-slate-800/10'
             }`}>
          <div className="flex justify-between items-start mb-0.5">
            <span className={`text-xs md:text-sm font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${
              isToday ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' : 
              isSelected ? 'bg-violet-500 text-white shadow-sm' : 'text-slate-400'
            }`}>
              {day}
            </span>
          </div>
          
          {/* 달력 속: 예정된 스케줄 (PC 화면에서만 다 보이고 모바일에선 컴팩트 도트로 축소) */}
          <div className="hidden md:block space-y-1 mb-1">
            {daySchedules.map(sch => {
              const kw = INITIAL_KEYWORDS.find(k => k.id === sch.keyword_id);
              const colorCls = kw && kw.color && COLOR_MAP[kw.color] ? COLOR_MAP[kw.color] : "bg-slate-700 text-slate-300";
              return (
                <div key={sch.id} className={`border rounded p-1 text-[10px] leading-tight font-medium shadow-sm flex items-center gap-1 ${colorCls}`}>
                  <CalendarIcon size={10} className="opacity-70" />
                  <span className="truncate flex-1">{sch.title}</span>
                </div>
              );
            })}
          </div>

          {/* 모바일 전용 초소형 알림 도트 표시기 (비좁은 격자를 깔끔하게 지켜줍니다) */}
          <div className="md:hidden flex gap-1 mt-auto">
            {daySchedules.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" title="등록된 일정 있음"></span>
            )}
            {top5Sectors.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="당일 주도 섹터 있음"></span>
            )}
          </div>
 
          {/* 달력 속: 당일 주도 Top 5 섹터 기록 (PC 화면에서만 고유 테마별 박스로 큼직하게 노출) */}
          {top5Sectors.length > 0 && (
            <div className="hidden md:flex mt-auto flex-col gap-[3px]">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mb-0.5 opacity-80 decoration-slate-600 underline underline-offset-2">
                <Flame size={12} className="text-orange-500" /> 주도 섹터
              </div>
              {top5Sectors.map((sector) => (
                <div key={sector.rank} 
                     className={`flex items-center text-[10px] border rounded-md px-1.5 py-[3px] font-semibold tracking-tight shadow-sm ${sector.colorClass}`} 
                     title={`총 거래대금: ${sector.vol.toLocaleString()}억`}>
                  <span className="w-3 text-center mr-1 opacity-60">
                    {sector.rank}
                  </span>
                  <span className="truncate">{sector.name}</span>
                </div>
              ))}
            </div>
          )}
          
        </div>
      );
    }

    // Next month blanks
    const remainingCells = (Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7) - (firstDayOfMonth + daysInMonth);
    for (let i = 0; i < remainingCells; i++) {
      cells.push(<div key={`next-${i}`} className="min-h-[60px] md:min-h-[170px] p-2 border-b border-r border-slate-800/50 bg-slate-900/30 opacity-50"></div>);
    }
    
    return cells;
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 text-transparent bg-clip-text">
            테마 캘린더
          </h1>
          <p className="text-slate-400 mt-2">일정 체크 및 매일 시장을 주도한 Top 5 섹터 흐름을 파악하세요.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-violet-600/20 whitespace-nowrap cursor-pointer"
        >
          <Plus size={18} /> 일정 등록
        </button>
      </header>

      {/* 모바일 가로보기 순화 권장 배너 */}
      {!isBannerClosed && (
        <div className="md:hidden glass-panel border border-blue-500/20 rounded-xl p-3 bg-blue-900/10 flex items-start gap-2.5 shadow animate-pulse">
          <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              💡 거래대금이 포함된 테마의 추이를 한눈에 확인하고 싶으신 분들은 스마트폰을 가로 모드로 눕혀서 보시는 것을 권장해 드립니다.
            </p>
          </div>
          <button 
            onClick={() => setIsBannerClosed(true)}
            className="text-slate-500 hover:text-slate-200 cursor-pointer p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* [신규] 최근 5영업일 동안의 자금 대이동 트렌드 한눈에 보기 트래커 */}
      <section className="glass-panel border border-slate-700/80 rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="text-orange-500 animate-pulse" size={20} />
          <h2 className="text-sm md:text-base font-bold text-slate-100">
            🔥 최근 5영업일 시장 주도 섹터 흐름 (거시 추세 분석)
          </h2>
        </div>

        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar">
          <div className="flex gap-3.5 min-w-[800px] md:min-w-0 md:grid md:grid-cols-5">
            {last5Dates.map(dateStr => {
              const top5 = getTop5SectorsForDate(dateStr);
              const dateObj = new Date(dateStr);
              const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${['일','월','화','수','목','금','토'][dateObj.getDay()]})`;
              
              return (
                <div 
                  key={dateStr} 
                  className={`flex-1 min-w-[145px] md:min-w-0 bg-slate-900/60 border rounded-xl p-3 flex flex-col gap-2 hover:border-slate-600 transition-colors shadow-inner
                    ${selectedDate === dateStr ? 'border-violet-500/50 bg-slate-900/90' : 'border-slate-800'}`}
                >
                  <div className="border-b border-slate-800 pb-1.5 flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-400 font-mono">{formattedDate}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === dateStr ? 'bg-violet-400 animate-ping' : 'bg-slate-700'}`}></span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    {top5.map((sector) => (
                      <div key={sector.rank} className={`flex items-center justify-between text-[10px] border rounded px-1.5 py-1 font-bold ${sector.colorClass}`} title={`거래대금 ${sector.vol.toLocaleString()}억`}>
                        <span className="truncate flex-1 max-w-[80px]">{sector.name}</span>
                        <span className="opacity-75 font-mono text-[9px] font-normal">{sector.vol}억</span>
                      </div>
                    ))}
                    {top5.length === 0 && (
                      <span className="text-[10px] text-slate-600 italic py-4 text-center">휴일 또는 데이터 없음</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="glass-panel p-4 md:p-6 rounded-2xl relative overflow-hidden border border-slate-700">
        {/* Calendar Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <CalendarIcon className="text-violet-400" size={28} />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              {currentYear}년 {currentMonth + 1}월
            </h2>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={handlePrevMonth} className="p-1.5 md:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition-colors cursor-pointer">
              <ChevronLeft size={16} md:size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2.5 py-1.5 md:px-4 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs md:text-sm font-medium rounded-lg border border-slate-600 transition-colors cursor-pointer">
              이번 달
            </button>
            <button onClick={handleNextMonth} className="p-1.5 md:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition-colors cursor-pointer">
              <ChevronRight size={16} md:size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-900 border border-slate-800/50 rounded-xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-800">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="py-2.5 md:py-3 text-center text-xs md:text-sm font-bold text-slate-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-slate-900/50">
            {renderCells()}
          </div>
        </div>

        {/* 모바일 및 태블릿 전용 하단 터치식 상세 판넬 (모바일 최적화 UX 핵심) */}
        {(() => {
          const selDateObj = new Date(selectedDate);
          const selDaySchedules = schedules.filter(s => s.date === selectedDate);
          const selTop5Sectors = getTop5SectorsForDate(selectedDate);
          
          // 한국형 날짜 요일 포맷
          const dayName = ['일','월','화','수','목','금','토'][selDateObj.getDay()];
          const formattedDate = `${selDateObj.getMonth() + 1}월 ${selDateObj.getDate()}일 (${dayName})`;

          return (
            <div className="md:hidden mt-6 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="border-b border-slate-800 pb-2.5 flex justify-between items-center">
                <h3 className="text-sm font-black text-violet-400 flex items-center gap-1.5">
                  <CalendarIcon size={14} />
                  {formattedDate} 상세 흐름
                </h3>
                <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded border border-slate-800">
                  날짜를 터치하면 변경됩니다
                </span>
              </div>

              {/* 해당 날짜 일정 */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">일정 및 브리핑</span>
                {selDaySchedules.length > 0 ? (
                  <div className="space-y-1.5">
                    {selDaySchedules.map(sch => {
                      const kw = INITIAL_KEYWORDS.find(k => k.id === sch.keyword_id);
                      const colorCls = kw && kw.color && COLOR_MAP[kw.color] ? COLOR_MAP[kw.color] : "bg-slate-700 text-slate-300";
                      return (
                        <div key={sch.id} className={`border rounded-lg p-2.5 text-xs font-semibold flex items-center gap-2 ${colorCls}`}>
                          <CalendarIcon size={12} className="opacity-80" />
                          <span>{sch.title}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 italic pl-1">이날 등록된 일정이 없습니다.</p>
                )}
              </div>

              {/* 당일 거래대금 기반 5대 주도섹터 */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 block tracking-wider uppercase">
                  <Flame size={13} className="text-orange-500" /> 오늘의 5대 주도 섹터
                </span>
                {selTop5Sectors.length > 0 ? (
                  <div className="space-y-1.5">
                    {selTop5Sectors.map((sector) => (
                      <div key={sector.rank} className={`flex items-center justify-between text-xs border rounded-lg p-2.5 font-bold ${sector.colorClass}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-950/70 text-[10px] text-slate-300">
                            {sector.rank}
                          </span>
                          <span className="text-slate-100">{sector.name}</span>
                        </div>
                        <span className="text-[10px] opacity-90 bg-slate-950/50 px-2 py-0.5 rounded font-mono">
                          {sector.vol.toLocaleString()}억
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 italic pl-1">수집된 주도 섹터 데이터가 없는 날(주말/휴일)입니다.</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Add Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-slate-100">새 캘린더 일정 추가</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">일정 제목</label>
                <input 
                  type="text" 
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">날짜</label>
                <input 
                  type="date" 
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-violet-500"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">관련 테마 (백과사전 키워드 연동)</label>
                <select 
                  value={newSchedule.keyword_id}
                  onChange={(e) => setNewSchedule({...newSchedule, keyword_id: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-violet-500"
                >
                  <option value="">키워드 선택...</option>
                  {INITIAL_KEYWORDS.map(kw => (
                    <option key={kw.id} value={kw.id}>{kw.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer">취소</button>
              <button onClick={handleAddSchedule} className="px-6 py-2 rounded-lg font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 transition-all cursor-pointer">등록하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordCalendar;
