import React, { useState, useMemo } from 'react';
import { INITIAL_DAILY_RECORDS, INITIAL_STOCKS, INITIAL_KEYWORDS } from '../lib/mockData';
import { Search, TrendingUp, DollarSign, Calendar, Activity, ChevronRight, X, Brain } from 'lucide-react';

const ShadowingDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 모바일/태블릿 화면에서 날짜 목록이 길게 늘어지는 것을 방지하기 위한 아코디언 접기 상태입니다.
  const [isDateListExpanded, setIsDateListExpanded] = useState(false);

  // 모바일/태블릿용 AI 상세 모멘텀 미니 팝업 상태 (선택된 record 객체 또는 null)
  const [activeReasonRecord, setActiveReasonRecord] = useState(null);

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
        keywordName: record.keywordName || keyword?.name || "특징주"
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
    <div className="space-y-5 pb-20">
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
        
        {/* Left Panel: Date List (모바일에서는 아코디언 접힘 지원) */}
        <div className="w-full lg:w-[220px] flex-shrink-0">
          <div className="glass-panel rounded-xl border border-slate-700 overflow-hidden sticky top-6">
            
            {/* 모바일 아코디언 토글을 지원하는 영업일 목록 헤더 */}
            <div 
              onClick={() => setIsDateListExpanded(!isDateListExpanded)}
              className="bg-slate-800/80 p-3 border-b border-slate-700/50 flex justify-between items-center cursor-pointer select-none"
            >
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Calendar size={16} className="text-blue-400" />
                영업일 선택
              </h3>
              
              {/* 모바일 화면에서만 노출되는 현재 선택된 일자 뱃지 및 토글 텍스트 */}
              <div className="lg:hidden flex items-center gap-2 text-xs text-blue-400 font-bold">
                <span className="bg-slate-900/60 border border-slate-700/40 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                  {selectedDate}
                </span>
                <span className="text-[11px] font-semibold opacity-95">
                  {isDateListExpanded ? "목록 닫기 ▲" : "날짜 변경 ▼"}
                </span>
              </div>
            </div>

            {/* 날짜 아코디언 바디 (모바일에선 isDateListExpanded에 따라 노출, PC에선 항상 노출) */}
            <div className={`overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 transition-all duration-300
              ${isDateListExpanded ? 'max-h-[320px] block' : 'hidden lg:block'} 
              lg:max-h-[700px]`}
            >
              {uniqueDates.map(dateStr => {
                const isSelected = selectedDate === dateStr;
                const dailyCount = enhancedRecords.filter(r => r.date === dateStr).length;
                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setIsDateListExpanded(false); // 선택 후 자동으로 리스트를 접어 공간을 극대화합니다.
                    }}
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
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Daily Dashboard Details */}
        <div className="flex-1 min-w-0 space-y-4">
          
          {/* [피드백 반영] 세로로 길던 카드 4개 대신, 납작하게 가로 1줄로 압축 통합된 당일 요약 통계 바 */}
          {dailyStats && (
            <div className="glass-panel py-2.5 px-4 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs select-none">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-blue-400" />
                <span className="text-slate-400 font-semibold">충족 종목수:</span>
                <strong className="text-slate-100 font-extrabold text-[13px]">{dailyStats.count}개</strong>
              </div>
              
              <div className="flex items-center gap-2 border-slate-800 sm:border-l sm:pl-4">
                <DollarSign size={14} className="text-emerald-400" />
                <span className="text-slate-400 font-semibold">거래대금 1위:</span>
                <strong className="text-slate-100 font-extrabold text-[13px]">{dailyStats.maxVolStock.stockName}</strong>
                <span className="text-blue-400 font-bold font-mono">({dailyStats.maxVolStock.volume_krw.toLocaleString()}억)</span>
              </div>

              <div className="flex items-center gap-2 border-slate-800 sm:border-l sm:pl-4">
                <TrendingUp size={14} className="text-red-400" />
                <span className="text-slate-400 font-semibold">평균 상승률:</span>
                <strong className="text-red-500 font-extrabold text-[13px] font-mono">+{dailyStats.avgChange}%</strong>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="glass-panel rounded-xl overflow-hidden border border-slate-700">
            <div className="bg-slate-800/80 p-3 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono border border-blue-500/30">
                  {selectedDate}
                </span>
                주도주 쉐도잉 리스트
              </h2>
              <span className="text-[11px] text-slate-500 tracking-tight">수급과 거래량 중심의 한눈에 보기 표</span>
            </div>
            
            {/* [피드백 반영] 패딩 폭 축소 및 모바일 가독성 극대화 표 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[21.3rem] md:min-w-[31.25rem]">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-[10px] md:text-xs border-b border-slate-700 select-none">
                    <th className="py-2 px-2.5 font-semibold text-center w-[1.6rem]">No</th>
                    <th className="py-2 px-2 font-semibold w-[7.5rem] md:w-[8.75rem]">종목명</th>
                    <th className="py-2 px-2 font-semibold text-right w-[3.6rem] md:w-[5rem]">종가</th>
                    <th className="py-2 px-2 font-semibold text-right w-[3.8rem] md:w-[4.4rem]">
                      <div className="flex flex-col items-end">
                        <span>등락률</span>
                        <span className="text-[8px] font-medium text-slate-500 block sm:hidden leading-none mt-0.5">(거래대금)</span>
                      </div>
                    </th>
                    <th className="py-2 px-2 font-semibold text-right w-[3.6rem] md:w-[5rem] hidden sm:table-cell">거래대금</th>
                    <th className="py-2 px-2 font-semibold text-right w-[3.6rem] md:w-[5rem] hidden sm:table-cell">거래량</th>
                    <th className="py-2 px-3 font-semibold w-[4.8rem] md:w-[6.25rem]">테마/섹터</th>
                    {/* PC/태블릿 넓은 화면에서만 AI 상세 모멘텀 유지 */}
                    <th className="py-2 px-2.5 font-semibold hidden md:table-cell">AI 상세 모멘텀 (급등사유)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {selectedDateRecords.length > 0 ? selectedDateRecords.map((record, index) => {
                    const { category, text } = parseReason(record.reason || "");
                    const isHighVolume = record.volume_cnt >= 10000000;
                    const formattedVolCnt = record.volume_cnt ? record.volume_cnt.toLocaleString() : "-";
                    
                    return (
                      <tr key={record.id} className={`transition-colors group ${isHighVolume ? 'bg-amber-900/10 hover:bg-amber-900/20' : 'hover:bg-slate-800/40'}`}>
                        {/* 1. 번호 (행 높이 py-1.5로 줄임) */}
                        <td className="py-1.5 px-2.5 text-center text-slate-500 text-[11px]">{index + 1}</td>
                        
                        {/* 2. 종목명 */}
                        <td className="py-1.5 px-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <strong className="text-slate-100 text-[12px] tracking-tight">{record.stockName}</strong>
                              {record.isLeader && (
                                <span className="px-1 py-[0.5px] rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap leading-none">대장</span>
                              )}
                              
                              {/* [피드백 반영] 모바일 전용 AI 사유 미니 팝업 버튼 */}
                              <button 
                                onClick={() => setActiveReasonRecord(record)}
                                className="md:hidden px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 cursor-pointer whitespace-nowrap"
                              >
                                사유
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono leading-none">{record.stockCode}</span>
                          </div>
                        </td>
                        
                        {/* 3. 현재/종가 */}
                        <td className="py-1.5 px-2 text-right">
                          <span className="font-semibold text-[11px] tabular-nums tracking-tight text-slate-300">
                            {record.close_price ? (record.close_price).toLocaleString() + "원" : "-"}
                          </span>
                        </td>
                        
                        {/* 4. 등락률 */}
                        <td className="py-1.5 px-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-black text-[12px] tabular-nums ${record.change_rate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                              {record.change_rate > 0 ? '+' : ''}{record.change_rate}%
                            </span>
                            {/* 모바일 한정으로 등락률 아래에 괄호로 거래대금 표기 */}
                            <span className="text-[9px] font-bold text-slate-400 font-mono block sm:hidden leading-none mt-0.5">
                              ({record.volume_krw.toLocaleString()}억)
                            </span>
                          </div>
                        </td>
                        
                        {/* 5. 거래대금 (모바일 자동 숨김, sm 이상에서 노출) */}
                        <td className="py-1.5 px-2 text-right hidden sm:table-cell">
                          <span className="font-bold text-slate-200 text-[12px] tracking-tight">
                            {record.volume_krw.toLocaleString()}<span className="text-[9px] text-slate-500 font-normal ml-0.5">억</span>
                          </span>
                        </td>
                        
                        {/* 6. 거래량 (모바일은 숨기고 태블릿 이상에서만 노출) */}
                        <td className="py-1.5 px-2 text-right hidden sm:table-cell">
                          <span className={`font-medium text-[10px] tabular-nums tracking-tight ${isHighVolume ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.5 rounded shadow-sm' : 'text-slate-400'}`}>
                            {formattedVolCnt}
                          </span>
                        </td>
                        
                        {/* 7. 테마/섹터 */}
                        <td className="py-1.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-800 border border-slate-700/60 text-slate-300 px-1.5 py-[1px] rounded shadow-sm whitespace-nowrap">
                            {record.keywordName}
                          </span>
                        </td>
                        
                        {/* 8. AI 모멘텀 (모바일에선 숨기고 PC 화면에선 셀 안에 그대로 출력) */}
                        <td className="py-1.5 px-2.5 hidden md:table-cell">
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
                      <td colSpan="8" className="p-8 text-center text-slate-500 text-xs">
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

      {/* [피드백 반영] 모바일 및 태블릿용 AI 상세 모멘텀 미니 팝업 모달 */}
      {activeReasonRecord && (() => {
        const { category, text } = parseReason(activeReasonRecord.reason || "");
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              
              <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <Brain className="text-fuchsia-400 animate-pulse" size={16} />
                  <h3 className="text-sm font-bold text-slate-200">
                    {activeReasonRecord.stockName} 모멘텀 분석
                  </h3>
                  <span className="text-[9px] font-mono text-slate-500">({activeReasonRecord.stockCode})</span>
                </div>
                <button 
                  onClick={() => setActiveReasonRecord(null)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>날짜: <strong className="font-mono text-slate-300">{activeReasonRecord.date}</strong></span>
                  <span className="bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                    {activeReasonRecord.keywordName} 테마
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">상세 급등 사유</span>
                  <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80 shadow-inner">
                    <p className="text-xs leading-relaxed text-slate-200 font-medium">
                      {category && <span className="text-fuchsia-400 font-extrabold block mb-1">{category}</span>}
                      <span className="opacity-95">{text}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-[9px] text-slate-500 block">당일 등락률</span>
                    <strong className={`text-sm font-black ${activeReasonRecord.change_rate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {activeReasonRecord.change_rate > 0 ? '+' : ''}{activeReasonRecord.change_rate}%
                    </strong>
                  </div>
                  <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-[9px] text-slate-500 block">당일 거래대금</span>
                    <strong className="text-sm font-black text-slate-200">
                      {activeReasonRecord.volume_krw.toLocaleString()}<span className="text-[10px] font-normal text-slate-500 ml-0.5">억</span>
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-700 bg-slate-800/80 flex justify-end">
                <button 
                  onClick={() => setActiveReasonRecord(null)}
                  className="px-5 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-slate-100 shadow transition-all cursor-pointer text-xs"
                >
                  확인
                </button>
              </div>

            </div>
          </div>
        );
      })()}
      
    </div>
  );
};

export default ShadowingDashboard;
