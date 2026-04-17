import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Tag, Plus, X, Flame } from 'lucide-react';
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
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-01')); 
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  
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
      if (!volumeByKeyword[r.keyword_id]) volumeByKeyword[r.keyword_id] = 0;
      volumeByKeyword[r.keyword_id] += r.volume_krw;
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
      cells.push(<div key={`prev-${i}`} className="min-h-[170px] p-2 border-b border-r border-slate-800/50 bg-slate-900/30 opacity-50"></div>);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySchedules = schedules.filter(s => s.date === dateStr);
      const top5Sectors = getTop5SectorsForDate(dateStr);
      
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      cells.push(
        <div key={`day-${day}`} className={`min-h-[170px] p-2 border-b border-r border-slate-800/50 transition-colors hover:bg-slate-700/30 relative flex flex-col gap-1 ${isToday ? 'bg-blue-900/10' : 'bg-slate-800/10'}`}>
          <div className="flex justify-between items-start mb-0.5">
            <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' : 'text-slate-400'}`}>
              {day}
            </span>
          </div>
          
          {/* 달력 속: 예정된 스케줄 */}
          <div className="space-y-1 mb-1">
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

          {/* 달력 속: 당일 주도 Top 5 섹터 기록 (고유 색상) */}
          {top5Sectors.length > 0 && (
            <div className="mt-auto flex flex-col gap-[3px]">
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
      cells.push(<div key={`next-${i}`} className="min-h-[170px] p-2 border-b border-r border-slate-800/50 bg-slate-900/30 opacity-50"></div>);
    }
    
    return cells;
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 text-transparent bg-clip-text">
            키워드 캘린더
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

      <div className="glass-panel p-4 md:p-6 rounded-2xl relative overflow-hidden border border-slate-700">
        {/* Calendar Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <CalendarIcon className="text-violet-400" size={28} />
            <h2 className="text-3xl font-bold text-slate-100 tracking-tight">
              {currentYear}년 {currentMonth + 1}월
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition-colors cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date('2026-03-01'))} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-600 transition-colors cursor-pointer">
              26년 3월 이동
            </button>
            <button onClick={handleNextMonth} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition-colors cursor-pointer">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-900 border border-slate-800/50 rounded-xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-800">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="py-3 text-center text-sm font-bold text-slate-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-slate-900/50">
            {renderCells()}
          </div>
        </div>
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
