import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit, Tag, X, TrendingUp, Info } from 'lucide-react';
import { INITIAL_KEYWORDS, INITIAL_STOCKS } from '../lib/mockData';

const KeywordEncyclopedia = () => {
  const [keywords, setKeywords] = useState(INITIAL_KEYWORDS);
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 모바일 화면 가로보기 권장 뱃지 상태
  const [isBannerClosed, setIsBannerClosed] = useState(false);

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
    setStocks(stocks.filter(s => s.keyword_id !== id));
  };

  // Filter logic
  const filteredKeywords = keywords.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stocks.some(s => s.keyword_id === k.id && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text">
            키워드 백과사전
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

      {/* Keywords List (Grid Table View) */}
      <div className="space-y-10">
        {filteredKeywords.map(keyword => {
          const keywordStocks = stocks.filter(s => s.keyword_id === keyword.id);
          // Sort to show leaders first
          keywordStocks.sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0));

          return (
            <div key={keyword.id} className="glass-panel rounded-2xl overflow-hidden border border-slate-700">
              {/* Keyword Header */}
              <div className="bg-slate-800/80 p-5 border-b border-slate-700/50 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                      <Tag size={20} className="text-emerald-400" />
                      {keyword.name}
                    </h2>
                    <span className="text-xs font-medium text-slate-400 border border-slate-600 bg-slate-700/50 px-2 py-0.5 rounded-md">
                      {keyword.created_at}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{keyword.description}</p>
                </div>
                
                <div className="flex gap-2">
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

              {/* 데스크톱 전용 테이블 뷰 (태블릿/PC 화면에서만 표시) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-300 text-sm border-b border-slate-700">
                      <th className="p-4 font-semibold w-1/4">종목명 및 재료</th>
                      <th className="p-4 font-semibold w-1/4 text-center">3개월 차트</th>
                      <th className="p-4 font-semibold w-1/4 text-center">1년 차트</th>
                      <th className="p-4 font-semibold w-1/4 text-center">3년 차트</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {keywordStocks.length > 0 ? keywordStocks.map(stock => (
                      <tr key={stock.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 align-top">
                          <div className="flex items-center gap-2 mb-2">
                            {stock.is_leader && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">대장주</span>
                            )}
                            <strong className="text-lg text-slate-100">{stock.name}</strong>
                            <span className="text-sm text-slate-500">{stock.code}</span>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                            {stock.reason}
                          </p>
                        </td>
                        <td className="p-4">
                          {stock.code && stock.code.length === 6 ? (
                            <div className="bg-white rounded-lg p-1 border border-slate-600 h-[100px] flex items-center justify-center overflow-hidden hover:scale-[2.5] hover:z-50 hover:shadow-2xl transition-transform duration-300 origin-center cursor-zoom-in relative">
                              <img 
                                src={`https://ssl.pstatic.net/imgfinance/chart/item/area/month3/${stock.code}.png?sidcode=${Date.now()}`} 
                                alt="3개월봉" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : <span className="text-xs text-slate-600 text-center block">코드없음</span>}
                        </td>
                        <td className="p-4">
                          {stock.code && stock.code.length === 6 ? (
                            <div className="bg-white rounded-lg p-1 border border-slate-600 h-[100px] flex items-center justify-center overflow-hidden hover:scale-[2.5] hover:z-50 hover:shadow-2xl transition-transform duration-300 origin-center cursor-zoom-in relative">
                              <img 
                                src={`https://ssl.pstatic.net/imgfinance/chart/item/area/year/${stock.code}.png?sidcode=${Date.now()}`} 
                                alt="1년봉" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : <span className="text-xs text-slate-600 text-center block">코드없음</span>}
                        </td>
                        <td className="p-4">
                          {stock.code && stock.code.length === 6 ? (
                            <div className="bg-white rounded-lg p-1 border border-slate-600 h-[100px] flex items-center justify-center overflow-hidden hover:scale-[2.5] hover:z-50 hover:shadow-2xl transition-transform duration-300 origin-center cursor-zoom-in relative">
                              <img 
                                src={`https://ssl.pstatic.net/imgfinance/chart/item/area/year3/${stock.code}.png?sidcode=${Date.now()}`} 
                                alt="3년봉" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : <span className="text-xs text-slate-600 text-center block">코드없음</span>}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-500">
                          등록된 종목이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 모바일 및 태블릿 전용 카드형 뷰 (스마트폰 화면에서 가독성을 높임) */}
              <div className="block md:hidden divide-y divide-slate-700/50">
                {keywordStocks.length > 0 ? keywordStocks.map(stock => (
                  <div key={stock.id} className="p-4 space-y-3 hover:bg-slate-800/20 transition-colors">
                    {/* 종목 및 리더 정보 */}
                    <div className="flex items-center gap-2">
                      {stock.is_leader && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">대장주</span>
                      )}
                      <strong className="text-base text-slate-100">{stock.name}</strong>
                      <span className="text-xs text-slate-500 font-mono">{stock.code}</span>
                    </div>

                    {/* 편입 사유/재료 */}
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {stock.reason}
                      </p>
                    </div>

                    {/* 모바일 차트 3종 나란히 그리드 배열 (한 손에 쏙 들어오게 스펙 다운) */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-center text-slate-500 font-semibold">3개월</span>
                        {stock.code && stock.code.length === 6 ? (
                          <div className="bg-white rounded p-0.5 border border-slate-600 h-[65px] flex items-center justify-center overflow-hidden relative">
                            <img 
                              src={`https://ssl.pstatic.net/imgfinance/chart/item/area/month3/${stock.code}.png?sidcode=${Date.now()}`} 
                              alt="3개월" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : <span className="text-[10px] text-slate-600 text-center block leading-[65px]">없음</span>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-center text-slate-500 font-semibold">1년</span>
                        {stock.code && stock.code.length === 6 ? (
                          <div className="bg-white rounded p-0.5 border border-slate-600 h-[65px] flex items-center justify-center overflow-hidden relative">
                            <img 
                              src={`https://ssl.pstatic.net/imgfinance/chart/item/area/year/${stock.code}.png?sidcode=${Date.now()}`} 
                              alt="1년" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : <span className="text-[10px] text-slate-600 text-center block leading-[65px]">없음</span>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-center text-slate-500 font-semibold">3년</span>
                        {stock.code && stock.code.length === 6 ? (
                          <div className="bg-white rounded p-0.5 border border-slate-600 h-[65px] flex items-center justify-center overflow-hidden relative">
                            <img 
                              src={`https://ssl.pstatic.net/imgfinance/chart/item/area/year3/${stock.code}.png?sidcode=${Date.now()}`} 
                              alt="3년" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : <span className="text-[10px] text-slate-600 text-center block leading-[65px]">없음</span>}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    등록된 종목이 없습니다.
                  </div>
                )}
              </div>
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
