import React, { useMemo, useState } from 'react';
import { INITIAL_STOCKS, INITIAL_KEYWORDS, INITIAL_DAILY_RECORDS } from '../lib/mockData';
import { generateDailyRecommendations } from '../lib/recommendationEngine';
import { Target, Zap, Clock, Calendar as CalendarIcon, Flame, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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

const LandingPage = () => {
  // 모닝 브리핑용 추천 종목 10단계 스코어링 엔진 작동
  const recommendations = useMemo(() => {
    // 가장 최근 영업일 기준 (모의 데이터 기준 2026-04-16 이 가장 최신)
    const hotPick = generateDailyRecommendations(INITIAL_DAILY_RECORDS, INITIAL_STOCKS, INITIAL_KEYWORDS);
    
    return hotPick.map(rec => {
      const match = rec.reason.match(/^(\[.*?\])(.*)/);
      const category = match ? match[1] : "";
      const text = match ? match[2] : rec.reason;

      return {
        ...rec,
        colorClass: rec.color ? COLOR_MAP[rec.color] : "bg-slate-700 text-slate-300 border-slate-600",
        category,
        text
      };
    });
  }, []);

  // 미니 캘린더용 (최근 1달)
  const recentDays = useMemo(() => {
    const dates = [...new Set(INITIAL_DAILY_RECORDS.map(r => r.date))];
    dates.sort((a, b) => new Date(a) - new Date(b));
    return dates.slice(-15); // 최근 영업일 15일만
  }, []);

  const getTop3SectorsForDate = (dateStr) => {
    const dailyRecords = INITIAL_DAILY_RECORDS.filter(r => r.date === dateStr);
    const volumeByKeyword = {};
    
    dailyRecords.forEach(r => {
      if (!volumeByKeyword[r.keyword_id]) volumeByKeyword[r.keyword_id] = 0;
      volumeByKeyword[r.keyword_id] += r.volume_krw;
    });

    const sortedKeywords = Object.entries(volumeByKeyword)
      .map(([k_id, vol]) => ({ keyword_id: parseInt(k_id), vol }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 3); 

    return sortedKeywords.map((item, idx) => {
      const kw = INITIAL_KEYWORDS.find(k => k.id === item.keyword_id);
      return {
        rank: idx + 1,
        name: kw?.name || "기타",
        colorClass: kw && kw.color ? COLOR_MAP[kw.color] : "bg-slate-800 text-slate-300",
        vol: item.vol
      };
    });
  };

  const checklistNames = {
    c1: "테마 지속 1~5일 내 신선도",
    c2: "전일 거래대금 1000억 이상 돌파",
    c3: "단독/수주/임상 등 강력한 모멘텀",
    c4: "테마 선도 대장주 프리미엄",
    c5: "직전 거래일 상승률 15% 이상 돌파",
    c6: "동일 테마 종목 다수 동반 상승",
    c7: "최근 3일 연속 등반 없는 눌림목",
    c8: "분기 누적 거래액 상위 메가 트렌드",
    c9: "하루 거래량 500만 주 이상 폭발",
    c10: "AI 통계적 승률 80% 이상 조건"
  };

  return (
    <div className="space-y-8 pb-20 fade-in">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-blue-400 font-semibold tracking-wide">
          <Clock size={16} />
          <span>오전 07:00 스코어링 갱신완료</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-100 to-slate-400 text-transparent bg-clip-text tracking-tighter">
          모닝 트레이딩 브리핑
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mt-2 leading-relaxed">
          어제 자 쉐도잉 데이터를 10단계 알고리즘으로 채점하여 가장 폭발력이 높은 <strong className="text-slate-200">Top 3 관심종목</strong>을 선정했습니다.
        </p>
      </header>

      {/* Top 3 추천 종목 (알고리즘 기반) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => (
          <div key={rec.id} className="glass-panel border border-slate-700/80 rounded-2xl p-6 relative flex flex-col group hover:border-blue-500/50 transition-all duration-300">
            
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-3xl flex items-start justify-end p-3 ${
              index === 0 ? 'bg-gradient-to-bl from-orange-500/20' : 
              index === 1 ? 'bg-gradient-to-bl from-slate-400/20' : 
              'bg-gradient-to-bl from-amber-700/20'
            }`}>
              <span className={`font-black text-2xl ${
                index === 0 ? 'text-orange-400' : index === 1 ? 'text-slate-300' : 'text-amber-600'
              }`}>#{index + 1}</span>
            </div>

            <div className="mb-4">
              <span className={`inline-flex items-center font-bold px-2.5 py-1 rounded-md text-[11px] border shadow-sm ${rec.colorClass}`}>
                {rec.keywordName}
              </span>
            </div>
            
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{rec.stockName}</h2>
              <span className="text-sm font-mono text-slate-500">{rec.stockCode}</span>
            </div>
            
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 mb-4 shadow-inner">
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                {rec.category && <span className="text-fuchsia-400 mr-1.5 font-bold">{rec.category}</span>}
                <span className="opacity-90 tracking-tight">{rec.text}</span>
              </p>
            </div>

            {/* 11-Point Checklist UI */}
            <div className="mb-6 flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">11-Point Checklist</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded shadow ${
                  rec.totalScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  Score: {rec.totalScore}/110
                </span>
              </div>
              
              <div className="space-y-1.5 bg-slate-900/30 rounded-lg p-2.5 border border-slate-800/50">
                {Object.keys(rec.checks).map(checkKey => {
                  const passed = rec.checks[checkKey];
                  return (
                    <div key={checkKey} className={`flex items-center gap-2 text-[11px] ${passed ? 'text-emerald-400/90' : 'text-slate-600'}`}>
                      {passed ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={13} className="text-slate-700 flex-shrink-0" />}
                      <span className={`${passed ? 'font-medium' : 'line-through opacity-60'} tracking-tight`}>
                        {checklistNames[checkKey]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
              <div>
                <p className="text-xs text-slate-500 mb-1">현재/종가 (Close)</p>
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[15px]">
                  <Target size={16} />
                  {rec.close_price?.toLocaleString() || "-"}원
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">AI 승률</p>
                <div className="flex items-center gap-1 text-slate-100 font-black text-xl">
                  <Zap size={18} className="text-yellow-400" />
                  {rec.winRate}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 미니 캘린더 */}
      <section className="glass-panel border border-slate-700/80 rounded-2xl p-6 overflow-hidden relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flame className="text-orange-500" size={24} />
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">최근 3주간의 테마 대이동 (미니 캘린더)</h2>
          </div>
          <Link to="/calendar" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
            전체 캘린더 보기 <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {recentDays.map((dateStr, idx) => {
            const top3 = getTop3SectorsForDate(dateStr);
            const dateObj = new Date(dateStr);
            const isLatest = idx === recentDays.length - 1;

            return (
              <div key={dateStr} className={`bg-slate-900/50 border rounded-xl p-3 flex flex-col gap-2 transition-colors hover:bg-slate-800/80 ${isLatest ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-700/50'}`}>
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                  <span className={`text-[13px] font-bold ${isLatest ? 'text-blue-400' : 'text-slate-400'}`}>
                    {dateObj.getMonth() + 1}/{dateObj.getDate()} ({['일','월','화','수','목','금','토'][dateObj.getDay()]})
                  </span>
                  {isLatest && <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Latest</span>}
                </div>
                
                <div className="flex flex-col gap-1.5 mt-1">
                  {top3.map(sector => (
                    <div key={sector.rank} className={`flex items-center text-[10px] sm:text-xs font-semibold px-2 py-1 rounded border shadow-sm ${sector.colorClass}`}>
                      <span className="w-4 text-center opacity-60 mr-1">{sector.rank}</span>
                      <span className="truncate">{sector.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
