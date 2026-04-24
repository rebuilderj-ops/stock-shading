import React, { useState, useMemo } from 'react';
import { INITIAL_DAILY_RECORDS, INITIAL_STOCKS, INITIAL_KEYWORDS } from '../lib/mockData';
import { Search, TrendingUp, DollarSign, Calendar, Tag, Activity, ChevronRight, Hash } from 'lucide-react';

const ShadowingDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // 매핑 함수
  const enhancedRecords = useMemo(() => {
    return INITIAL_DAILY_RECORDS.map(record => {
      const stock = INITIAL_STOCKS.find(s => s.id === record.stock_id);
      const keyword = INITIAL_KEYWORDS.find(k => k.id === record.keyword_id);
      return {
        ...record,
        stockName: record.name || stock?.name || "알수없음",
        stockCode: record.code || stock?.code || "",
        isLeader: record.is_leader || stock?.is_leader || false,
        keywordName: record.keywordName || keyword?.name || "개별재료"
      };
    });
  }, []);

  // 날짜 목록 추출 및 내림차순 정렬
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(enhancedRecords.map(r => r.date))];
    return dates.sort((a, b) => new Date(b) - new Date(a));
  }, [enhancedRecords]);

  // 선택된 날짜 (기본값: 최신 날짜)
  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || null);

  // 날짜에 해당하는 종목들 필터링
  const selectedDateRecords = useMemo(() => {
    let records = enhancedRecords.filter(r => r.date === selectedDate);
    
    // 검색어가 있으면 결과 내 검색 적용
    if (searchTerm) {
      records = records.filter(r => 
        r.stockName.includes(searchTerm) ||
        r.keywordName.includes(searchTerm) ||
        r.reason.includes(searchTerm)
      );
    }
    
    // 등락률 기준으로 내림차순 정렬
    return records.sort((a, b) => b.change_rate - a.change_rate);
  }, [enhancedRecords, selectedDate, searchTerm]);

  // 통계 계산 로직 (선택된 날짜 기준)
  const dailyStats = useMemo(() => {
    if(!selectedDateRecords.length) return null;
    let maxVolRecord = selectedDateRecords[0];
    let totalChange = 0;
    
    selectedDateRecords.forEach(r => {
      if (r.volume_krw > maxVolRecord.volume_krw) maxVolRecord = r;
      totalChange += r.change_rate;
    });
    
    return {
      count: selectedDateRecords.length,
      maxVolStock: maxVolRecord,
      avgChange: (totalChange / selectedDateRecords.length).toFixed(1)
    };
  }, [selectedDateRecords]);

  // 말머리 부분 파싱용 정규식
  const parseReason = (reasonStr) => {
    const match = reasonStr.match(/^(\[.*?\])(.*)/);
    if (match) {
      return { category: match[1], text: match[2] };
    }
    return { category: "", text: reasonStr };
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
            주식쉐도잉 대시보드
          </h1>
          <p className="text-slate-400 mt-2">
            매일 업데이트되는 급등/거래대금 집중 종목 (조건: 상승률 6% 이상, 거래대금 300억 이상)
          </p>
        </div>
        
        <div className="relative w-full md:w-64 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="목록 내 종목/테마 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </header>

      {/* Main Layout: Left Date Picker, Right Data Table */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Panel: Date List */}
        <div className="w-full lg:w-[220px] flex-shrink-0">
          <div className="glass-panel rounded-xl border border-slate-700 overflow-hidden sticky top-6">
            <div className="bg-slate-800/80 p-3 border-b border-slate-700/50">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Calendar size={16} className="text-blue-400" />
                영업일 목록
              </h3>
            </div>
            <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
              {uniqueDates.map(dateStr => {
                const isSelected = selectedDate === dateStr;
                const dailyCount = enhancedRecords.filter(r => r.date === dateStr).length;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/20 border border-blue-500/50 shadow-sm' 
                        : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div>
                      <div className={`font-mono text-xs ${isSelected ? 'text-blue-400 font-bold' : ''}`}>
                        {dateStr}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-70">
                        포착 종목: {dailyCount}개
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={14} className="text-blue-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Daily Dashboard Details */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Daily Stats Summary */}
          {dailyStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-panel py-3 px-4 rounded-xl border border-slate-700">
                <p className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1"><Activity size={12}/> 충족 종목수</p>
                <p className="text-lg font-bold text-slate-100">{dailyStats.count} <span className="text-xs font-normal text-slate-500">개</span></p>
              </div>
              <div className="glass-panel py-3 px-4 rounded-xl border border-slate-700 col-span-2 md:col-span-2">
                <p className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1"><DollarSign size={12}/> 당일 최대 거래대금 (1위)</p>
                <div className="flex items-end gap-2 truncate">
                  <p className="text-lg font-bold text-slate-100 truncate">{dailyStats.maxVolStock.stockName}</p>
                  <p className="text-xs text-blue-400 font-medium pb-[3px] truncate">{dailyStats.maxVolStock.volume_krw.toLocaleString()}억</p>
                </div>
              </div>
              <div className="glass-panel py-3 px-4 rounded-xl border border-slate-700">
                <p className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1"><TrendingUp size={12}/> 평균 상승률</p>
                <p className="text-lg font-bold text-red-500">+{dailyStats.avgChange}%</p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="glass-panel rounded-xl overflow-hidden border border-slate-700">
            <div className="bg-slate-800/80 p-3 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono border border-blue-500/30">
                  {selectedDate}
                </span>
                주도주 쉐도잉 리스트
              </h2>
              <span className="text-xs text-slate-500 tracking-tight">수급과 거래량 중심의 한눈에 보기 표</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-xs border-b border-slate-700 select-none">
                    <th className="py-2.5 px-3 font-semibold text-center w-[40px]">No</th>
                    <th className="py-2.5 px-3 font-semibold w-[140px]">종목명</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-[80px]">현재/종가</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-[80px]">등락률</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-[90px]">거래대금</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-[90px]">거래량(주)</th>
                    <th className="py-2.5 px-4 font-semibold w-[120px]">테마/섹터</th>
                    <th className="py-2.5 px-3 font-semibold">AI 상세 모멘텀 (급등사유)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {selectedDateRecords.length > 0 ? selectedDateRecords.map((record, index) => {
                    const { category, text } = parseReason(record.reason || "");
                    const isHighVolume = record.volume_cnt >= 10000000;
                    const formattedVolCnt = record.volume_cnt ? record.volume_cnt.toLocaleString() : "-";
                    
                    return (
                      <tr key={record.id} className={`transition-colors group ${isHighVolume ? 'bg-amber-900/10 hover:bg-amber-900/20' : 'hover:bg-slate-800/60'}`}>
                        <td className="py-2 px-3 text-center text-slate-500 text-xs">{index + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-100 text-[13px] tracking-tight">{record.stockName}</strong>
                              {record.isLeader && (
                                <span className="px-1 py-[1px] rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap leading-none">대장주</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{record.stockCode}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {record.close_price ? (record.close_price).toLocaleString() + "원" : "-"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`font-bold text-[13px] ${record.change_rate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                            {record.change_rate > 0 ? '+' : ''}{record.change_rate}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="font-bold text-slate-200 text-sm tracking-tight">
                            {record.volume_krw.toLocaleString()}<span className="text-[10px] text-slate-500 font-normal ml-0.5">억</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`font-semibold text-[11px] tabular-nums tracking-tight ${isHighVolume ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded shadow-sm' : 'text-slate-400'}`}>
                            {formattedVolCnt}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-800/80 border border-slate-700 text-slate-300 px-2. py-0.5 rounded shadow-sm whitespace-nowrap">
                            {record.keywordName}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-[11px] text-slate-300 leading-tight">
                            {category && (
                              <span className="font-bold text-fuchsia-400 mr-1.5 inline-block">{category}</span>
                            )}
                            <span className="opacity-90 tracking-tight">{text}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 text-sm">
                        선택한 날짜에 필터링된 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShadowingDashboard;
