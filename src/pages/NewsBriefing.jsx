import React, { useState, useEffect } from 'react';
import { Newspaper, Flame, Layers, List, Clock, TrendingUp, AlertCircle, ExternalLink, ShieldCheck, Link2 } from 'lucide-react';

// rubric 6축 라벨
const RUBRIC_LABELS = {
  scope: '파급범위',
  specificity: '구체성',
  durability: '지속성',
  novelty: '신규성',
  chain_depth: '체인깊이',
  source_trust: '신뢰도',
};

const GRADE_STYLE = {
  A: { ring: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400', label: '시장급' },
  B: { ring: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', label: '섹터급' },
  C: { ring: 'border-slate-600/50', bg: 'bg-slate-700/20', text: 'text-slate-300', label: '개별' },
};

// rubric 미니 막대 (1~3)
const RubricBar = ({ label, value }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] text-slate-500 w-12 shrink-0">{label}</span>
    <div className="flex gap-0.5">
      {[1, 2, 3].map(n => (
        <span key={n} className={`w-3 h-1.5 rounded-sm ${n <= (value || 0) ? 'bg-blue-400' : 'bg-slate-700'}`} />
      ))}
    </div>
  </div>
);

const StockChips = ({ stocks }) => {
  if (!stocks || stocks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {stocks.map(s => (
        <span key={s.code} className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800/70 border border-slate-700 rounded-md px-2 py-0.5 text-slate-200">
          {s.name}
          {s.peak_change ? <span className="text-rose-400 font-mono text-[10px]">+{s.peak_change}%</span> : null}
        </span>
      ))}
    </div>
  );
};

// 시장급(A) 대형 카드
const MarketCard = ({ item }) => {
  const g = GRADE_STYLE[item.grade] || GRADE_STYLE.C;
  const pers = item.theme_persistence;
  return (
    <div className={`glass-panel rounded-2xl border ${g.ring} p-5 space-y-3 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${g.bg} ${g.text} border ${g.ring}`}>
          <Flame size={12} /> {g.label} · {item.grade}
        </span>
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
          {item.theme}
        </span>
        {pers && (
          <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5">
            과거 최장 {pers.max_run}일 지속
          </span>
        )}
        {item.has_disclosure && (
          <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">
            <ShieldCheck size={11} /> 공시
          </span>
        )}
      </div>

      <h3 className="text-base font-bold text-slate-100 leading-snug">{item.event_summary}</h3>
      {item.reason && <p className="text-xs text-slate-400 leading-relaxed">{item.reason}</p>}

      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
          <TrendingUp size={12} className="text-rose-400" /> 예상 수혜 종목 (테마 실데이터 기준)
        </div>
        <StockChips stocks={item.mapped_stocks} />
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 pt-2 border-t border-slate-800/60">
        {Object.entries(RUBRIC_LABELS).map(([k, label]) => (
          <RubricBar key={k} label={label} value={item.rubric?.[k]} />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1"><Clock size={11} /> {item.first_seen} · 기사 {item.article_count} · {item.source_count}매체</span>
        {item.urls?.[0] && (
          <a href={item.urls[0]} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
            원문 <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
};

// 섹터급(B) 중간 카드
const SectorCard = ({ item }) => {
  const pers = item.theme_persistence;
  return (
    <div className="glass-panel rounded-xl border border-slate-700/70 p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">{item.theme}</span>
        {pers && <span className="text-[10px] text-cyan-400">과거 최장 {pers.max_run}일</span>}
        {item.has_disclosure && <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><ShieldCheck size={10} />공시</span>}
      </div>
      <p className="text-sm font-medium text-slate-200 leading-snug">{item.event_summary}</p>
      <StockChips stocks={item.mapped_stocks?.slice(0, 4)} />
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
        <span>{item.first_seen} · 기사 {item.article_count}</span>
        {item.urls?.[0] && <a href={item.urls[0]} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5">원문<ExternalLink size={10} /></a>}
      </div>
    </div>
  );
};

// 개별급(C) 리스트 행
const IndividualRow = ({ item }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
      {item.theme === '미분류' ? '개별' : item.theme}
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-300 leading-snug">{item.event_summary}</p>
      <span className="text-[10px] text-slate-500">{item.first_seen} · 기사 {item.article_count}</span>
    </div>
    {item.urls?.[0] && (
      <a href={item.urls[0]} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 mt-0.5 shrink-0">
        <ExternalLink size={13} />
      </a>
    )}
  </div>
);

const NewsBriefing = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/data/daily_news_briefing.json?t=' + Date.now())
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 animate-pulse">오늘의 주요 뉴스를 영향력 순으로 분석 중입니다...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel border border-slate-700/80 rounded-2xl p-8 max-w-lg mx-auto mt-10 text-center space-y-3">
        <AlertCircle size={44} className="text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">뉴스 브리핑 데이터가 아직 없습니다</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          <span className="font-mono text-blue-400">collect_news.py</span> → <span className="font-mono text-blue-400">score_news.py</span> 를 실행하면
          오늘의 주요 뉴스가 영향력 등급으로 정리됩니다.
        </p>
      </div>
    );
  }

  const a = data.tier_a_market || [];
  const b = data.tier_b_sector || [];
  const c = data.tier_c_individual || [];

  return (
    <div className="space-y-8 pb-20 text-slate-200">
      <header className="border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Clock size={12} className="text-blue-400" />
          <span>분석 시각: {data.generated_at}</span>
          <span className="text-slate-600">·</span>
          <span>클러스터 {data.source_cluster_count}건 채점</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-100 via-slate-300 to-slate-500 text-transparent bg-clip-text tracking-tighter flex items-center gap-3">
          <Newspaper className="text-blue-400" size={32} /> 오늘의 주요 뉴스 영향력 분석
        </h1>
        <p className="text-slate-400 text-sm max-w-3xl mt-2 leading-relaxed">
          당일 언론사·공시 뉴스를 이벤트 단위로 묶고, 영향력 rubric 6축으로 채점해 <span className="text-rose-400 font-semibold">시장급(A)</span> ·
          <span className="text-amber-400 font-semibold"> 섹터급(B)</span> · <span className="text-slate-300 font-semibold">개별급(C)</span> 3단계로 정리합니다.
          예상 수혜 종목은 과거 급등 실데이터에서 결정론적으로 매핑됩니다.
        </p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          ※ 본 정보는 과거 유사 재료의 통계적 반응을 정리한 참고 자료이며, 특정 종목 매수·매도 추천이 아닙니다.
        </p>
      </header>

      {/* A: 시장급 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="text-rose-400" size={20} />
          <h2 className="text-lg font-bold text-slate-100">시장급 재료 <span className="text-rose-400">(A)</span></h2>
          <span className="text-xs text-slate-500">{a.length}건 · 상단 고정</span>
        </div>
        {a.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {a.map((it, i) => <MarketCard key={i} item={it} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-500 bg-slate-900/30 border border-slate-800 rounded-xl p-4">오늘은 시장급(A) 재료가 포착되지 않았습니다. (지수 급락·매크로 지배 장세일 수 있음)</p>
        )}
      </section>

      {/* B: 섹터급 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-6">
          <Layers className="text-amber-400" size={20} />
          <h2 className="text-lg font-bold text-slate-100">섹터급 재료 <span className="text-amber-400">(B)</span></h2>
          <span className="text-xs text-slate-500">{b.length}건</span>
        </div>
        {b.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {b.map((it, i) => <SectorCard key={i} item={it} />)}
          </div>
        ) : <p className="text-sm text-slate-500">섹터급 재료 없음</p>}
      </section>

      {/* C: 개별급 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-6">
          <List className="text-slate-400" size={20} />
          <h2 className="text-lg font-bold text-slate-100">개별 종목 이벤트 <span className="text-slate-400">(C)</span></h2>
          <span className="text-xs text-slate-500">{c.length}건 · M&A·단일수주·실적 등</span>
        </div>
        <div className="glass-panel rounded-xl border border-slate-700/70 p-4">
          {c.length > 0 ? c.map((it, i) => <IndividualRow key={i} item={it} />) : <p className="text-sm text-slate-500">개별 이벤트 없음</p>}
        </div>
      </section>

      {data.new_theme_candidates?.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link2 size={13} /> 신규 테마 후보 (기존 어휘로 분류 안 된 미분류 이벤트)
          </div>
          <div className="flex flex-wrap gap-2">
            {data.new_theme_candidates.slice(0, 12).map((t, i) => (
              <span key={i} className="text-[11px] text-slate-400 bg-slate-800/40 border border-slate-800 rounded px-2 py-0.5">{t.slice(0, 30)}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default NewsBriefing;
