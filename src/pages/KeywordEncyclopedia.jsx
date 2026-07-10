import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit, Tag, X, Info, ChevronDown, ChevronRight, Crown, Award, Link2, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { INITIAL_KEYWORDS, INITIAL_STOCKS } from '../lib/mockData';
import { THEME_VALUE_CHAINS } from '../data/theme_value_chains';

const CHART_TYPES = [
  { key: 'month3', label: '3개월 차트' },
  { key: 'year', label: '1년 차트' },
  { key: 'year3', label: '3년 차트' },
];

// 종목 코드로 네이버 증권 영역 차트 이미지를 만드는 헬퍼
const chartUrl = (code, key) => `https://ssl.pstatic.net/imgfinance/chart/item/area/${key}/${code}.png?sidcode=${Date.now()}`;

// 테마 하나에 대해 대장주/2등주/밸류체인 그룹/기타 종목을 계산합니다.
function buildThemeGroups(keyword, keywordStocks) {
  const curation = THEME_VALUE_CHAINS[keyword.name];
  const byCode = new Map(keywordStocks.map(s => [s.code, s]));

  let leader = (curation?.leaderCode && byCode.get(curation.leaderCode)) || null;
  let second = (curation?.secondCode && byCode.get(curation.secondCode)) || null;

  // 큐레이션 데이터가 없는(자동 생성된) 테마는 기존 is_leader 플래그로만 대장주를 표시합니다.
  if (!leader) {
    leader = keywordStocks.find(s => s.is_leader) || null;
  }

  const chainGroups = (curation?.chains || [])
    .map(c => ({ title: c.title, stocks: c.codes.map(code => byCode.get(code)).filter(Boolean) }))
    .filter(g => g.stocks.length > 0);

  const chainedCodes = new Set(chainGroups.flatMap(g => g.stocks.map(s => s.code)));
  const pinnedCodes = new Set([leader?.code, second?.code].filter(Boolean));
  const others = keywordStocks.filter(s => !pinnedCodes.has(s.code) && !chainedCodes.has(s.code));

  return { leader, second, chainGroups, others };
}

const KeywordEncyclopedia = () => {
  const [keywords, setKeywords] = useState(INITIAL_KEYWORDS);
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [searchTerm, setSearchTerm] = useState('');

  // 모바일 화면 가로보기 권장 뱃지 상태
  const [isBannerClosed, setIsBannerClosed] = useState(false);

  // 테마별 접기/펼치기(노션 토글) 상태 - 기본은 전부 접힌 상태
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // 테마 내부 "기타 관련주" 접기/펼치기 상태 (기본 접힘)
  const [expandedOthers, setExpandedOthers] = useState(() => new Set());

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ name: '', description: '' });
  const [newStocks, setNewStocks] = useState([{ name: '', code: '', reason: '', is_leader: false }]);

  const handleAddStockField = () => {
    setNewStocks([...newStocks, { name: '', code: '', reason: '', is_leader: false }]);
  };

  const handleRemoveStockField = (index) => {
    setNewStocks(newStocks.filter((_, i) => i !== index));
  };

  const handleStockChange = (index, field, value) => {
    const updated = [...newStocks];
    updated[index][field] = value;
    setNewStocks(updated);
  };

  const handleSaveKeyword = () => {
    if (!newKeyword.name.trim()) return;

    const newKeywordObj = {
      id: Date.now(),
      name: newKeyword.name,
      description: newKeyword.description,
      created_at: new Date().toISOString().split('T')[0]
    };

    const mappedStocks = newStocks.filter(s => s.name.trim()).map((s, idx) => ({
      id: Date.now() + idx + 1,
      keyword_id: newKeywordObj.id,
      name: s.name,
      code: s.code,
      reason: s.reason,
      is_leader: s.is_leader
    }));

    setKeywords([newKeywordObj, ...keywords]);
    setStocks([...stocks, ...mappedStocks]);
    setIsFormModalOpen(false);

    // Reset Form
    setNewKeyword({ name: '', description: '' });
    setNewStocks([{ name: '', code: '', reason: '', is_leader: false }]);
  };

  const handleDeleteKeyword = (id) => {
    setKeywords(keywords.filter(k => k.id !== id));
    setStocks(stocks.filter(s => {
      const ids = s.keyword_ids || [s.keyword_id];
      return !ids.includes(id);
    }));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleOthers = (id) => {
    setExpandedOthers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filter logic
  const filteredKeywords = keywords.filter(k =>
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stocks.some(s => {
      const ids = s.keyword_ids || [s.keyword_id];
      return ids.includes(k.id) && s.name.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const isSearching = searchTerm.trim() !== '';

  const expandAll = () => setExpandedIds(new Set(filteredKeywords.map(k => k.id)));
  const collapseAll = () => setExpandedIds(new Set());

  // 종목 하나를 렌더링하는 데스크톱 테이블 행
  const renderDesktopRow = (stock, badgeLabel) => (
    <tr key={stock.id} className="hover:bg-slate-800/30 transition-colors">
      <td className="p-4 align-middle">
        <div className="flex items-center gap-2 flex-wrap">
          {badgeLabel === 'leader' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crown size={11} /> 대장주
            </span>
          )}
          {badgeLabel === 'second' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-400/20 text-slate-300 border border-slate-400/30">
              <Award size={11} /> 2등주
            </span>
          )}
          <strong className="text-lg text-slate-100">{stock.name}</strong>
          <span className="text-sm text-slate-500">{stock.code}</span>
        </div>
      </td>
      {CHART_TYPES.map(({ key, label }) => (
        <td className="p-4" key={key}>
          {stock.code && stock.code.length === 6 ? (
            <div className="bg-white rounded-lg p-1 border border-slate-600 h-[100px] flex items-center justify-center overflow-hidden hover:scale-[2.5] hover:z-50 hover:shadow-2xl transition-transform duration-300 origin-center cursor-zoom-in relative">
              <img src={chartUrl(stock.code, key)} alt={label} className="w-full h-full object-cover" />
            </div>
          ) : <span className="text-xs text-slate-600 text-center block">코드없음</span>}
        </td>
      ))}
    </tr>
  );

  // 종목 하나를 렌더링하는 모바일 카드
  const renderMobileCard = (stock, badgeLabel) => (
    <div key={stock.id} className="p-4 space-y-3 hover:bg-slate-800/20 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        {badgeLabel === 'leader' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Crown size={10} /> 대장주
          </span>
        )}
        {badgeLabel === 'second' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-slate-400/20 text-slate-300 border border-slate-400/30">
            <Award size={10} /> 2등주
          </span>
        )}
        <strong className="text-base text-slate-100">{stock.name}</strong>
        <span className="text-xs text-slate-500 font-mono">{stock.code}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        {CHART_TYPES.map(({ key, label }) => (
          <div className="flex flex-col gap-1" key={key}>
            <span className="text-[10px] text-center text-slate-500 font-semibold">{label.replace(' 차트', '')}</span>
            {stock.code && stock.code.length === 6 ? (
              <div className="bg-white rounded p-0.5 border border-slate-600 h-[65px] flex items-center justify-center overflow-hidden relative">
                <img src={chartUrl(stock.code, key)} alt={label} className="w-full h-full object-cover" />
              </div>
            ) : <span className="text-[10px] text-slate-600 text-center block leading-[65px]">없음</span>}
          </div>
        ))}
      </div>
    </div>
  );

  // 하나의 종목 그룹(밸류체인 묶음 또는 기타)을 데스크톱 표 + 모바일 카드로 렌더링
  const renderStockGroup = (groupStocks, { title, icon, leaderCode, secondCode } = {}) => {
    const badgeFor = (stock) => stock.code === leaderCode ? 'leader' : stock.code === secondCode ? 'second' : null;

    return (
      <div>
        {title && (
          <div className="flex items-center gap-2 px-4 md:px-5 py-2 bg-slate-900/40 border-y border-slate-800/60">
            {icon}
            <span className="text-xs font-bold text-slate-300 tracking-wide">{title}</span>
            <span className="text-[10px] text-slate-500">{groupStocks.length}개 종목</span>
          </div>
        )}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-300 text-sm border-b border-slate-700">
                <th className="p-4 font-semibold w-1/4">종목명</th>
                {CHART_TYPES.map(({ key, label }) => (
                  <th className="p-4 font-semibold w-1/4 text-center" key={key}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {groupStocks.map(stock => renderDesktopRow(stock, badgeFor(stock)))}
            </tbody>
          </table>
        </div>
        <div className="block md:hidden divide-y divide-slate-700/50">
          {groupStocks.map(stock => renderMobileCard(stock, badgeFor(stock)))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text">
            테마별 종목 추이
          </h1>
          <p className="text-slate-400 mt-2">같은 섹터 종목들의 차트 흐름을 한눈에 비교하여 테마의 움직임을 파악하세요.</p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="테마명, 종목명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
          >
            <Plus size={18} /> 새 키워드
          </button>
        </div>
      </header>

      {/* 모바일 가로보기 순화 권장 배너 */}
      {!isBannerClosed && (
        <div className="md:hidden glass-panel border border-blue-500/20 rounded-xl p-3 bg-blue-900/10 flex items-start gap-2.5 shadow animate-pulse">
          <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              💡 차트를 넓고 시원하게 비교하고 싶으신 분들은 스마트폰을 가로 모드로 눕혀서 보시는 것을 권장해 드립니다.
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

      {/* 전체 펼치기/접기 컨트롤 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">테마 이름을 클릭하면 펼치거나 접을 수 있습니다.</span>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronsUpDown size={14} /> 전체 펼치기
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronsDownUp size={14} /> 전체 접기
          </button>
        </div>
      </div>

      {/* Keywords List (Accordion) */}
      <div className="space-y-4">
        {filteredKeywords.map(keyword => {
          const keywordStocks = stocks.filter(s => {
            const ids = s.keyword_ids || [s.keyword_id];
            return ids.includes(keyword.id);
          });

          const { leader, second, chainGroups, others } = buildThemeGroups(keyword, keywordStocks);
          const isOpen = isSearching || expandedIds.has(keyword.id);
          const othersOpen = expandedOthers.has(keyword.id) || others.length <= 12;

          return (
            <div key={keyword.id} className="glass-panel rounded-2xl overflow-hidden border border-slate-700">
              {/* Keyword Header (클릭 시 토글) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(keyword.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(keyword.id); } }}
                className="w-full bg-slate-800/80 p-5 border-b border-slate-700/50 flex justify-between items-start text-left cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <div className="flex gap-3 items-start min-w-0">
                  <div className="mt-1 text-slate-400 flex-shrink-0">
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Tag size={20} className="text-emerald-400" />
                        {keyword.name}
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/60 border border-slate-700 rounded-full px-2.5 py-0.5">
                        {keywordStocks.length}개 종목
                      </span>
                      {chainGroups.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
                          <Link2 size={11} /> 밸류체인 {chainGroups.length}개 그룹
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{keyword.description}</p>
                    {!isOpen && (leader || second) && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        {leader && <span className="text-amber-400 font-semibold">대장주 {leader.name}</span>}
                        {leader && second && <span className="mx-1">·</span>}
                        {second && <span className="text-slate-300 font-semibold">2등주 {second.name}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteKeyword(keyword.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {isOpen && (
                keywordStocks.length > 0 ? (
                  <div>
                    {/* 대장주 / 2등주 고정 하이라이트 영역 */}
                    {(leader || second) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700/50 bg-gradient-to-br from-amber-500/[0.04] to-transparent border-b border-slate-700/50">
                        {leader && renderStockGroup([leader], { leaderCode: leader.code })}
                        {second && renderStockGroup([second], { secondCode: second.code })}
                      </div>
                    )}

                    {/* 밸류체인 그룹 */}
                    {chainGroups.map((group, idx) => (
                      <div key={idx}>
                        {renderStockGroup(group.stocks, {
                          title: group.title,
                          icon: <Link2 size={13} className="text-cyan-400" />,
                          leaderCode: leader?.code,
                          secondCode: second?.code
                        })}
                      </div>
                    ))}

                    {/* 기타 관련주 (분류되지 않은 나머지 종목, 자체 토글) */}
                    {others.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleOthers(keyword.id)}
                          className="w-full flex items-center gap-2 px-4 md:px-5 py-2.5 bg-slate-900/40 border-y border-slate-800/60 hover:bg-slate-900/70 transition-colors cursor-pointer"
                        >
                          {othersOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                          <span className="text-xs font-bold text-slate-300 tracking-wide">
                            {chainGroups.length > 0 ? '기타 관련주' : '전체 종목'}
                          </span>
                          <span className="text-[10px] text-slate-500">{others.length}개 종목</span>
                        </button>
                        {othersOpen && renderStockGroup(others, { leaderCode: leader?.code, secondCode: second?.code })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    등록된 종목이 없습니다.
                  </div>
                )
              )}
            </div>
          );
        })}
        {filteredKeywords.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-700/50 border-dashed">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* Adding Keyword Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-slate-100">새 테마(키워드) 추가</h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">키워드명</label>
                  <input
                    type="text"
                    placeholder="예: HBM, 전고체 배터리"
                    value={newKeyword.name}
                    onChange={(e) => setNewKeyword({...newKeyword, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">테마 설명</label>
                  <textarea
                    placeholder="해당 테마에 대한 간략한 설명이나 최근 슈팅 이유를 적어주세요."
                    value={newKeyword.description}
                    onChange={(e) => setNewKeyword({...newKeyword, description: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 h-24 resize-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-slate-200">관련 종목 등록</label>
                  <button
                    onClick={handleAddStockField}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-1 rounded-md cursor-pointer"
                  >
                    <Plus size={14} /> 종목 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {newStocks.map((stock, index) => (
                    <div key={index} className="flex gap-2 items-start bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex gap-2">
                          <input
                            type="text" placeholder="종목명 (예: 삼성전자)"
                            value={stock.name} onChange={(e) => handleStockChange(index, 'name', e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 w-1/2"
                          />
                          <input
                            type="text" placeholder="종목코드 6자리 (예: 005930)"
                            value={stock.code} onChange={(e) => handleStockChange(index, 'code', e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 w-1/2 font-mono"
                          />
                        </div>
                        <input
                          type="text" placeholder="편입 사유 / 재료"
                          value={stock.reason} onChange={(e) => handleStockChange(index, 'reason', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 w-full"
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-400 mt-1 cursor-pointer w-max">
                          <input
                            type="checkbox"
                            checked={stock.is_leader}
                            onChange={(e) => handleStockChange(index, 'is_leader', e.target.checked)}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                          />
                          대장주로 등록
                        </label>
                      </div>

                      {newStocks.length > 1 && (
                        <button
                          onClick={() => handleRemoveStockField(index)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">* 종목코드(6자리)를 입력해야 차트 조회가 가능합니다.</p>
              </div>

            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-800/80 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleSaveKeyword}
                className="px-6 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KeywordEncyclopedia;
