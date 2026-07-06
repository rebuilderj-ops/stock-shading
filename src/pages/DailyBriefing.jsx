import React, { useState, useEffect } from 'react';
import { Target, Zap, Clock, AlertCircle, TrendingUp, TrendingDown, ArrowUpRight, DollarSign, Globe, Award, Copy, Check } from 'lucide-react';

const DailyBriefing = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  // 데이터 로드
  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        // public/data 디렉토리에 빌드된 정적 JSON 파일을 캐시 우회 파라미터와 함께 읽어옵니다.
        const response = await fetch('/data/daily_briefing.json?t=' + Date.now());
        if (response.ok) {
          const json = await response.json();
          setData(json);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("브리핑 데이터 로드 실패:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, []);

  // 종목코드 복사 함수
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // 등락률에 따른 글자 색상/배지 반환 (국내 정서: 상승 빨강/주황, 하락 파랑)
  const getChangeBadge = (changeRate) => {
    if (changeRate === undefined || changeRate === null) return null;
    const rate = parseFloat(changeRate);
    if (rate > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <TrendingUp size={12} />
          +{rate.toFixed(2)}%
        </span>
      );
    } else if (rate < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <TrendingDown size={12} />
          {rate.toFixed(2)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
        0.00%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">오늘의 시황 분석 데이터를 취합하고 있습니다...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel border border-slate-700/80 rounded-2xl p-8 max-w-lg mx-auto mt-10 text-center space-y-4">
        <AlertCircle size={48} className="text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">브리핑 데이터를 불러올 수 없습니다</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          아직 국내외 시황 자동 업데이트 스크립트가 실행되지 않았거나 파일이 생성되지 않았습니다.<br />
          로컬 PC에서 아래 배치 파일들을 차례대로 실행하여 데이터를 먼저 빌드해 주세요.
        </p>
        <div className="bg-slate-900/80 rounded-xl p-4 text-left font-mono text-xs text-slate-300 space-y-2 border border-slate-800">
          <p className="font-bold text-slate-400"># 데이터 취합 명령어 가이드:</p>
          <p>1. 저녁 국내장 취합: <span className="text-blue-400">run_shadowing.bat</span> (9:00 PM)</p>
          <p>2. 아침 글로벌 취합: <span className="text-blue-400">run_us_update.bat</span> (부팅 5분 뒤)</p>
        </div>
      </div>
    );
  }

  const { kr_data, us_data, last_updated_kr, last_updated_us } = data;

  return (
    <div className="space-y-8 pb-20 fade-in text-slate-200">
      
      {/* 상단 타이틀 */}
      <header className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {last_updated_kr && (
            <div className="flex items-center gap-1 bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-800">
              <Clock size={12} className="text-blue-400" />
              <span>국내장 취합: {last_updated_kr}</span>
            </div>
          )}
          {last_updated_us && (
            <div className="flex items-center gap-1 bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-800">
              <Clock size={12} className="text-orange-400" />
              <span>글로벌 취합: {last_updated_us}</span>
            </div>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-100 via-slate-300 to-slate-500 text-transparent bg-clip-text tracking-tighter mt-2">
          데일리 마켓 브리핑
        </h1>
        <p className="text-slate-400 text-sm max-w-3xl mt-1 leading-relaxed">
          대체거래소(NXT)까지 포함한 국내 시간외 거래 분석 데이터와 아침 미국 마감 지수, 6대 선물 시장의 흐름을 인공지능이 융합 분석하여 최적의 데이트레이딩 시나리오를 도출합니다.
        </p>
      </header>

      {/* 1. 아침 미국장 & 선물 매크로 시황 (오전 데이터가 있을 경우에만 렌더링) */}
      {us_data ? (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-400" size={20} />
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-100">글로벌 금융 시장 & 매크로 동향</h2>
          </div>

          {/* 지수 및 선물 요약 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 미국 3대 지수 및 반도체 */}
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">미국 정규장 종가</h3>
              <div className="space-y-3.5">
                {Object.entries(us_data.indices || {}).map(([name, item]) => (
                  <div key={name} className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-300">{name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-200">{item.price?.toLocaleString()}</span>
                      {getChangeBadge(item.change)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 글로벌 6대 선물 */}
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">글로벌 6대 선물 및 환율</h3>
              <div className="space-y-3.5">
                {Object.entries(us_data.futures || {}).map(([name, item]) => {
                  // 보기 쉽게 이름 한글화
                  const labelMap = {
                    "Nasdaq_100_Futures": "나스닥100 선물",
                    "Gold_Futures": "금 선물",
                    "Crude_Oil_Futures": "WTI 원유 선물",
                    "Bitcoin_USD": "비트코인 (BTC)",
                    "USD_JPY": "엔달러 환율",
                    "EUR_USD": "유로달러 환율"
                  };
                  return (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-300">{labelMap[name] || name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-200">{item.price?.toLocaleString()}</span>
                        {getChangeBadge(item.change)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 한국 야간 관련 지표 */}
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">글로벌 리스크 & 한국 투자 심리 지표</h3>
              <div className="space-y-3.5">
                {Object.entries(us_data.macro || {}).map(([name, item]) => {
                  const labelMap = {
                    "USD_KRW": "원달러 환율",
                    "MSCI_South_Korea_ETF(EWY)": "MSCI 한국 ETF (EWY)",
                    "VIX": "VIX 변동성(공포) 지수",
                    "US10Y_Yield": "美 10년물 국채수익률",
                    "Dollar_Index": "달러 인덱스(DXY)"
                  };
                  return (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-300">{labelMap[name] || name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-200">{item.price?.toLocaleString()}</span>
                        {getChangeBadge(item.change)}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50 mt-4 text-[11px] text-slate-400 leading-relaxed">
                * MSCI 한국 ETF(EWY)는 해외 큰손들의 한국 증시 선행 지표 역할을 하며, 환율 하락 및 EWY 상승 시 시초가 외국인 순매수 확률이 높아집니다.
              </div>
            </div>

          </div>

          {/* 미국 대형주 시총 상위 10선 현황 */}
          {us_data.large_caps && Object.keys(us_data.large_caps).length > 0 && (
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">미국 시총 상위 10대 대형주 현황</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                {Object.entries(us_data.large_caps).map(([name, item]) => (
                  <div key={name} className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-300 truncate">{name}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-mono text-sm font-semibold text-slate-200">${item.price?.toLocaleString()}</span>
                      {getChangeBadge(item.change)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 미국 마감 분석 및 아침 매매 시나리오 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 미국장 종합 요약 */}
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                <Globe size={16} />
                글로벌 매켓 요약 리포트
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-medium mt-2 whitespace-pre-line">
                {us_data.us_market_summary}
              </p>
            </div>

            {/* 시초가 대응 전략 */}
            <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl"></div>
              <h3 className="text-sm font-bold text-orange-400 flex items-center gap-1.5">
                <Target size={16} />
                오늘 개장전 매매 시나리오
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-medium mt-2 whitespace-pre-line">
                {us_data.today_strategy}
              </p>
            </div>

          </div>

        </section>
      ) : (
        // 아침 미국장 업데이트 이전 상태 안내
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-3">
          <AlertCircle size={18} className="text-blue-400 flex-shrink-0" />
          <span>아직 오늘 새벽 미국 마감 데이터가 취합되지 않았습니다. (오전 8시 전후 컴퓨터 부팅 후 5분 뒤 자동 업데이트됩니다.)</span>
        </div>
      )}

      {/* 2. 국내 증시 요약 & 시간외 거래 분석 (오후 데이터) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-8">
          <TrendingUp className="text-emerald-400" size={20} />
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-100">
            어제자 국내 증시 & 시간외 거래 분석 ({kr_data.date || '취합 대기중'})
          </h2>
        </div>

        {/* 국내 마켓 테마 정보 및 시간외 포착 종목 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 주도 테마 TOP 3 */}
          <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">정규장 주도 테마</h3>
            <div className="space-y-4">
              {kr_data.top_sectors && kr_data.top_sectors.length > 0 ? (
                kr_data.top_sectors.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                        {item.sector}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium pl-1">
                      {item.reason}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs">수집된 주도 테마 정보가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 시간외 / 장후 공시 포착 종목 */}
          <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">시간외 단일가 및 공시 특징주</h3>
            <div className="space-y-4">
              {kr_data.after_market_stocks && kr_data.after_market_stocks.length > 0 ? (
                kr_data.after_market_stocks.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 bg-slate-900/30 p-3 rounded-xl border border-slate-800/30">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                        {item.name}
                        {item.code && <span className="text-[10px] font-mono text-slate-500">({item.code})</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.price !== undefined && item.price !== null && (
                          <span className="font-mono text-[11px] text-slate-400">{item.price.toLocaleString()}원</span>
                        )}
                        {getChangeBadge(item.change)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      {item.reason}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs">실제 체결이 확인된 시간외 특징주가 없습니다.</p>
              )}
            </div>
          </div>

        </div>

        {/* 국내 마감 요약 리포트 */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
            <ArrowUpRight size={16} />
            국내 마감 종합 리포트
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed font-medium mt-2 whitespace-pre-line">
            {kr_data.market_summary}
          </p>
        </div>

      </section>

    </div>
  );
};

export default DailyBriefing;
