// src/lib/mockData.js
// FORCE RELOAD FOR VITE JSON CACHE
import realHistoryData from "../data/shadowing_real_history.json";

export const INITIAL_KEYWORDS = [
  { id: 1, name: "반도체", description: "HBM, 온디바이스, CXL, 유리기판 등 반도체 장비 및 부품 기술", color: "blue", created_at: "2026-01-01" },
  { id: 2, name: "바이오", description: "비만치료제, 항암제, FDA 신약 임상 및 K-바이오 헬스케어", color: "pink", created_at: "2026-01-01" },
  { id: 3, name: "로봇", description: "협동 로봇, 지능형 AI 휴머노이드, 제조 자동화 솔루션", color: "lime", created_at: "2026-01-01" },
  { id: 4, name: "AI", description: "생성형 AI, 거대언어모델(LLM), 인공지능 소프트웨어 및 서비스", color: "violet", created_at: "2026-01-01" },
  { id: 5, name: "원전", description: "차세대 소형모듈원전(SMR) 및 글로벌 원전 수주 모멘텀", color: "yellow", created_at: "2026-01-01" },
  { id: 6, name: "뷰티", description: "인디 브랜드 수출 급증 중심의 화장품 및 미용 에스테틱", color: "rose", created_at: "2026-01-01" },
  { id: 7, name: "전력설비", description: "AI 데이터센터 급증에 따른 초고압 변압기, 전선 인프라 호황", color: "orange", created_at: "2026-01-01" },
  { id: 8, name: "조선", description: "글로벌 친환경 선박 교체 주기에 따른 고부가가치 조선업 슈퍼사이클", color: "sky", created_at: "2026-01-01" },
  { id: 9, name: "우주항공", description: "우주항공청 개청 및 민간 주도 우주 개발, 위성 통신", color: "cyan", created_at: "2026-01-01" },
  { id: 10, name: "2차전지", description: "전고체 배터리, 핵심 리튬 광물, 양극재·음극재 배터리 소재", color: "emerald", created_at: "2026-01-01" },
  { id: 11, name: "방산", description: "지정학적 리스크 지속에 따른 자주포, 전차, 유도무기 수출 대박", color: "red", created_at: "2026-01-01" },
  { id: 12, name: "건설", description: "주택 및 인프라 시공, 재건축, 글로벌 해외 건설 수주 프로젝트", color: "amber", created_at: "2026-01-01" },
  { id: 13, name: "게임", description: "PC/모바일 신작 기대감, MMORPG 글로벌 흥행 모멘텀", color: "indigo", created_at: "2026-01-01" },
  { id: 14, name: "통신", description: "차세대 5G/6G 초고속 네트워크 장비 및 무선통신망 구축", color: "teal", created_at: "2026-01-01" },
  { id: 15, name: "드론", description: "도심항공교통(UAM), 군사용 드론 및 무인기 방공망 시스템", color: "purple", created_at: "2026-01-01" },
  { id: 16, name: "자동차", description: "자율주행, 전기차(EV), 현대차/기아 밸류체인 및 차량 부품", color: "slate", created_at: "2026-01-01" },
  { id: 17, name: "금융", description: "기업 밸류업 프로그램, 저PBR 지주사, 은행 및 증권", color: "stone", created_at: "2026-01-01" },
  { id: 18, name: "신재생에너지", description: "태양광, 풍력 발전, 수소 경제 등 탄소 중립 친환경 에너지", color: "green", created_at: "2026-01-01" },
  { id: 19, name: "양자암호", description: "양자컴퓨팅, 양자통신, 핵심 사이버 보안 및 차세대 암호 기술", color: "fuchsia", created_at: "2026-01-01" },
  { id: 20, name: "엔터", description: "K-POP, 드라마/영화, 글로벌 인기 웹툰 등 콘텐츠 미디어", color: "rose", created_at: "2026-01-01" },
  { id: 21, name: "식음료", description: "라면, 과자, 만두 등 글로벌 전역의 K-푸드 수출 폭풍 성장", color: "amber", created_at: "2026-01-01" },
  { id: 22, name: "철강", description: "철강재, 구리, 알루미늄 및 핵심 희토류 원자재 공급망", color: "zinc", created_at: "2026-01-01" },
  { id: 23, name: "화학", description: "기초 화학 소재, 석유화학 정유 제품 및 첨단 플라스틱 소재", color: "cyan", created_at: "2026-01-01" },
  { id: 24, name: "해운", description: "글로벌 컨테이너 운임 상승 및 해상 물류, 상선 해운업", color: "blue", created_at: "2026-01-01" },
  { id: 25, name: "IT", description: "시스템통합(SI), 클라우드 인프라, 빅데이터 및 핀테크 소프트웨어", color: "violet", created_at: "2026-01-01" },
  { id: 26, name: "디스플레이", description: "OLED 고도화, 차세대 마이크로LED 및 디스플레이 장비 부품", color: "indigo", created_at: "2026-01-01" },
  { id: 27, name: "기계", description: "글로벌 인프라 재건용 굴착기, 대형 건설기계 및 특수 기계", color: "orange", created_at: "2026-01-01" },
  { id: 28, name: "메타버스", description: "VR, AR, XR 가상 현실 기기 및 메타버스 플랫폼 기술", color: "purple", created_at: "2026-01-01" },
  { id: 29, name: "유통", description: "편의점, 대형 유통, 백화점 및 온라인 커머스 소비 유통 채널", color: "amber", created_at: "2026-01-01" },
  { id: 30, name: "패션", description: "브랜드 의류, 신발, 패션 잡화 수출 및 내수 브랜드 성장", color: "pink", created_at: "2026-01-01" },
  { id: 31, name: "기타", description: "기타 개별 호재 및 30대 거시 테마 외 분류 테마", color: "gray", created_at: "2026-01-01" },
  { id: 32, name: "인테리어", description: "리모델링, 가구 및 친환경 인테리어 자재 관련주", color: "amber", created_at: "2026-01-01" }
];

export const INITIAL_STOCKS = [
  { id: 1, keyword_id: 17, name: "KB금융", code: "105560", reason: "역대급 배당 및 자사주 소각", is_leader: true },
  { id: 2, keyword_id: 17, name: "삼성물산", code: "028260", reason: "지주사 밸류업 수혜", is_leader: false },
  { id: 3, keyword_id: 10, name: "이수스페셜티케미컬", code: "457190", reason: "황화리튬 양산 이슈", is_leader: true },
  { id: 4, keyword_id: 10, name: "한농화성", code: "011500", reason: "고분자 전해질 개발 성공", is_leader: false },
  { id: 5, keyword_id: 1, name: "SK하이닉스", code: "000660", reason: "HBM 독점적 공급 지위 수혜", is_leader: true },
  { id: 6, keyword_id: 1, name: "한미반도체", code: "042700", reason: "TC본더 독점. 엔비디아 젠슨황 수혜", is_leader: true },
  { id: 7, keyword_id: 9, name: "AP위성", code: "211270", reason: "위성 통신 단말 개발", is_leader: true },
  { id: 8, keyword_id: 9, name: "켄코아에어로스페이스", code: "274090", reason: "미국 스페이스X 부품 조달", is_leader: false },
  { id: 9, keyword_id: 7, name: "HD현대일렉트릭", code: "267260", reason: "북미 초고압 변압기 수주 잭팟", is_leader: true },
  { id: 10, keyword_id: 7, name: "LS ELECTRIC", code: "010120", reason: "신규 변압기 공장 증설 모멘텀", is_leader: false },
  { id: 11, keyword_id: 1, name: "필옵틱스", code: "161580", reason: "유리기판 TGV 장비 양산 돌입", is_leader: true },
  { id: 12, keyword_id: 1, name: "켐트로닉스", code: "089010", reason: "유리기판 식각 공정 수혜", is_leader: false },
  { id: 13, keyword_id: 2, name: "펩트론", code: "087010", reason: "1개월 지속형 스마트데포 기술수출 가시화", is_leader: true },
  { id: 14, keyword_id: 2, name: "삼천당제약", code: "000250", reason: "경구용 비만치료제 개발 모멘텀", is_leader: false },
  { id: 15, keyword_id: 3, name: "레인보우로보틱스", code: "277810", reason: "삼성전자 조기 인수설 부각", is_leader: true },
  { id: 16, keyword_id: 3, name: "두산로보틱스", code: "454910", reason: "유럽 로봇 점유율 확대 및 실적 개선", is_leader: false },
  { id: 17, keyword_id: 5, name: "우진엔텍", code: "457550", reason: "원전 해체 및 SMR 국책과제 독점적 수혜", is_leader: true },
  { id: 18, keyword_id: 5, name: "두산에너빌리티", code: "034020", reason: "글로벌 원전 핵심 부품 수주", is_leader: false },
  { id: 19, keyword_id: 1, name: "네오셈", code: "253590", reason: "CXL 검사장비 2.0 세계 최초 개발", is_leader: true },
  { id: 20, keyword_id: 1, name: "엑시콘", code: "092870", reason: "CXL 2.0 테스터 상용화 임박", is_leader: false },
  // 신규 방산/조선/화장품
  { id: 21, keyword_id: 11, name: "한화에어로스페이스", code: "012450", reason: "폴란드 및 루마니아 대규모 자주포 파생 수주 대박", is_leader: true },
  { id: 22, keyword_id: 11, name: "LIG넥스원", code: "079550", reason: "고스트로보틱스 인수 및 중동 천궁 수출", is_leader: false },
  { id: 23, keyword_id: 11, name: "현대로템", code: "064350", reason: "K2 전차 폴란드 수주 대란", is_leader: false },
  { id: 24, keyword_id: 8, name: "HD한국조선해양", code: "009540", reason: "친환경 선박 교체 싸이클에 따른 어닝 서프라이즈", is_leader: true },
  { id: 25, keyword_id: 8, name: "한화오션", code: "042660", reason: "특수선 위주 선별 수주 랠리 탑승", is_leader: false },
  { id: 26, keyword_id: 6, name: "실리콘투", code: "257720", reason: "미국 K-뷰티 침투율 확대 최대 마진 달성", is_leader: true },
  { id: 27, keyword_id: 6, name: "브이티", code: "018290", reason: "리들샷 일본 대흥행 및 미국 진출 모멘텀", is_leader: false },
  { id: 28, keyword_id: 26, keyword_ids: [26, 1], name: "디바이스", code: "187870", reason: "디스플레이 및 반도체 장비 전문", is_leader: false }
];

export const INITIAL_SCHEDULES = [
  { id: 1, date: "2026-02-26", title: "기업 밸류업 1차 가이드라인 발표", keyword_id: 17 },
  { id: 2, date: "2026-03-06", title: "인터배터리 2026 (삼성SDI 전고체)", keyword_id: 10 },
  { id: 3, date: "2026-03-18", title: "엔비디아 GTC 2026 개발자 행사", keyword_id: 1 },
  { id: 4, date: "2026-04-10", title: "제22대 총선 본투표", keyword_id: 17 },
  { id: 5, date: "2026-04-18", title: "글로벌 차세대 패키징 컨퍼런스", keyword_id: 1 },
  { id: 6, date: "2026-05-27", title: "우주항공청 개청 행사", keyword_id: 9 }
];

// Helper to reliably deterministic seeded random 
function pseudoRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateQuarterData() {
  const records = [];
  let recordId = 1;
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-04-16');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 주말 제외 영업일만
    
    const dateStr = d.toISOString().split('T')[0];
    const month = d.getMonth() + 1;
    const seedBase = d.getTime();
    
    // 영업일 하루에 10 ~ 18종목 터짐
    const numStocksToday = Math.floor(pseudoRandom(seedBase) * 8) + 10;
    const todayStocks = new Set();
    
    for (let i = 0; i < numStocksToday; i++) {
      let themeScore = pseudoRandom(seedBase + i);
      let targetKeywordId = 1;
      
      // 월별 주도 테마 가중치
      if (month === 1) { // 1월: 반도체, 금융, 방산, 조선
        if(themeScore < 0.25) targetKeywordId = 1;
        else if(themeScore < 0.45) targetKeywordId = 17;
        else if(themeScore < 0.65) targetKeywordId = 11;
        else if(themeScore < 0.8) targetKeywordId = 8;
        else targetKeywordId = Math.floor(themeScore * 30) + 1; 
      } else if (month === 2) { // 2월: 2차전지, 금융, 로봇, 방산
        if(themeScore < 0.3) targetKeywordId = 10;
        else if(themeScore < 0.5) targetKeywordId = 17;
        else if(themeScore < 0.65) targetKeywordId = 3;
        else if(themeScore < 0.8) targetKeywordId = 11;
        else targetKeywordId = Math.floor(themeScore * 30) + 1;
      } else if (month === 3) { // 3월: 반도체, 우주항공, 뷰티
        if(themeScore < 0.3) targetKeywordId = 1;
        else if(themeScore < 0.5) targetKeywordId = 9;
        else if(themeScore < 0.7) targetKeywordId = 6;
        else targetKeywordId = Math.floor(themeScore * 30) + 1;
      } else { // 4월: 원전, 바이오, 전력설비, 뷰티
        if(themeScore < 0.2) targetKeywordId = 5;
        else if(themeScore < 0.4) targetKeywordId = 2;
        else if(themeScore < 0.6) targetKeywordId = 7;
        else if(themeScore < 0.8) targetKeywordId = 6;
        else targetKeywordId = Math.floor(themeScore * 30) + 1;
      }
      if (targetKeywordId > 31) targetKeywordId = 1;

      const stocksInKeyword = INITIAL_STOCKS.filter(s => s.keyword_id === targetKeywordId);
      if (stocksInKeyword.length === 0) continue;
      
      const selectedStock = stocksInKeyword[Math.floor(pseudoRandom(seedBase + i + 100) * stocksInKeyword.length)];
      if(todayStocks.has(selectedStock.id)) continue;
      todayStocks.add(selectedStock.id); 
      
      let changeRate = (pseudoRandom(seedBase + i * 2) * 23.9) + 6.0;
      let volumeKrw = Math.floor((pseudoRandom(seedBase + i * 3) * 6700) + 300);
      let estimatedPrice = (pseudoRandom(seedBase + i * 4) * 95000) + 5000;

      if (selectedStock.is_leader) {
        volumeKrw += 2000;
        if (changeRate > 20) volumeKrw += 4000; 
      }
      
      let volumeCnt = Math.floor((volumeKrw * 100000000) / estimatedPrice);
      if (changeRate < 6.0 && volumeCnt < 10000000) {
          volumeCnt = Math.floor((pseudoRandom(seedBase + i * 12) * 30000000) + 12000000); 
          volumeKrw = Math.floor(volumeCnt * estimatedPrice / 100000000);
      }
      
      const themeName = INITIAL_KEYWORDS.find(k=>k.id===targetKeywordId)?.name || '관련 테마';
      const reasonTemplates = [
        `[수급/테마편승] ${themeName} 관련주 강세 속 외국인 대량 매수세 유입`,
        `[실적/어닝서프라이즈] ${themeName} 시장 개화에 따른 폭발적인 영업이익률 개선 전망`,
        `[정책수혜] 정부의 ${themeName} 대규모 투자 육성 정책 발표 기대감`,
        `[대규모수주] 글로벌 빅테크와 ${themeName} 핵심 부품 및 인프라 공급 계약 체결 임박설`,
        `[신규사업진출] 신사업으로 ${themeName} 시장 본격 진출 선언에 매수세 몰려`,
        `[독점/단독보도] ${themeName} 핵심 밸류체인 진입 성공 단독 보도`,
        `[경영권분쟁/행동주의] ${themeName} 호황기 진입 속 최대주주 지분 경쟁 격화`,
        `[자사주취득/소각] ${themeName} 기대감 및 대규모 주주환원 정책 전격 발표`,
        `[임상통과/신약기대] ${themeName} 글로벌 파이프라인 조기 상용화 모멘텀 지속`,
        `[지분투자/M&A] 글로벌 기업으로부터 ${themeName} 경쟁력 입증받아 지분투자 유치`
      ];
      const selectedReason = reasonTemplates[Math.floor(pseudoRandom(seedBase + i * 5) * reasonTemplates.length)];

      records.push({
        id: recordId++,
        date: dateStr,
        stock_id: selectedStock.id,
        change_rate: parseFloat(changeRate.toFixed(2)),
        volume_krw: volumeKrw,
        volume_cnt: volumeCnt,
        keyword_id: targetKeywordId,
        reason: selectedReason
      });
    }

    // 추가 포획: 상한가 및 1000만주 이상 예외 종목들을 추가적으로 발생시킴
    const extraEdgeCases = Math.floor(pseudoRandom(seedBase + 999) * 5) + 3;
    for (let j = 0; j < extraEdgeCases; j++) {
      let targetKeywordId = Math.floor(pseudoRandom(seedBase + 1000 + j) * 30) + 1;
      const stocksInKeyword = INITIAL_STOCKS.filter(s => s.keyword_id === targetKeywordId);
      if (stocksInKeyword.length === 0) continue; 
      const selectedStock = stocksInKeyword[Math.floor(pseudoRandom(seedBase + 2000 + j) * stocksInKeyword.length)];
      if(todayStocks.has(selectedStock.id)) continue;
      todayStocks.add(selectedStock.id); 

      let changeRate, volumeKrw, estimatedPrice, volumeCnt;

      if (j % 2 === 0) {
        changeRate = 29.8 + (pseudoRandom(seedBase + 4000 + j) * 0.2); 
        volumeKrw = Math.floor((pseudoRandom(seedBase + 5000 + j) * 200) + 50);
        estimatedPrice = (pseudoRandom(seedBase + 6000 + j) * 50000) + 5000;
        volumeCnt = Math.floor((volumeKrw * 100000000) / estimatedPrice);
      } else {
        changeRate = (pseudoRandom(seedBase + 4000 + j) * 5.0) + 0.5;
        estimatedPrice = (pseudoRandom(seedBase + 5000 + j) * 800) + 500;
        volumeKrw = Math.floor((pseudoRandom(seedBase + 6000 + j) * 150) + 100); 
        volumeCnt = Math.floor((pseudoRandom(seedBase + 7000 + j) * 30000000) + 12000000); 
        volumeKrw = Math.floor(volumeCnt * estimatedPrice / 100000000);
      }

      const themeName = INITIAL_KEYWORDS.find(k=>k.id===targetKeywordId)?.name || '관련 테마';
      const reasonTemplates = [
        `[품절주/스팩] 유통주식수 한계 속 ${themeName} 관련 호재 부각으로 매수세 몰려`,
        `[수급/테마편승] ${themeName} 소형주 테마 순환매 양상 속 거래량 폭발`,
        `[단독보도] ${themeName} 관련주로 뒤늦게 시장에 알려지며 투심 급격히 악화(매집)`,
        `[지분투자/M&A] ${themeName} 시너지 위한 소규모 지분 투자 루머 부각`
      ];
      const selectedReason = reasonTemplates[Math.floor(pseudoRandom(seedBase + 8000 + j) * reasonTemplates.length)];

      records.push({
        id: recordId++,
        date: dateStr,
        stock_id: selectedStock.id,
        change_rate: parseFloat(changeRate.toFixed(2)),
        volume_krw: volumeKrw,
        volume_cnt: volumeCnt,
        keyword_id: targetKeywordId,
        reason: selectedReason
      });
    }
  }
  return records;
}

// 실데이터 매핑 로직
const finalDailyRecords = [];
const mockQuarterData = generateQuarterData();

if (realHistoryData && realHistoryData.length > 0) {
  let maxKwId = Math.max(...INITIAL_KEYWORDS.map(k=>k.id));
  let maxStId = Math.max(...INITIAL_STOCKS.map(k=>k.id));

  const realDates = new Set(realHistoryData.map(r => r.date));
  
  const filteredMock = mockQuarterData.filter(m => !realDates.has(m.date));
  finalDailyRecords.push(...filteredMock);

  realHistoryData.forEach((item, idx) => {
    let kw = INITIAL_KEYWORDS.find(k => k.name === item.keywordName);
    if (!kw) {
      maxKwId++;
      kw = {
        id: maxKwId,
        name: item.keywordName || "미분류",
        description: "AI 자동 분석 시스템에 의해 생성된 테마",
        color: ["amber","emerald","blue","violet","orange","cyan","pink","lime","yellow","indigo","red","sky","rose"][maxKwId % 13],
        created_at: item.date
      };
      INITIAL_KEYWORDS.push(kw);
    }

    let stock = INITIAL_STOCKS.find(s => s.code === item.code);
    if (!stock) {
      maxStId++;
      stock = {
        id: maxStId,
        keyword_id: kw.id,
        name: item.name,
        code: item.code,
        reason: item.reason,
        is_leader: false
      };
      INITIAL_STOCKS.push(stock);
    }

    finalDailyRecords.push({
      id: 900000 + idx,
      date: item.date,
      stock_id: stock.id,
      change_rate: item.change_rate,
      volume_krw: item.volume_krw,
      volume_cnt: item.volume_cnt,
      keyword_id: kw.id,
      reason: item.reason,
      name: item.name,
      code: item.code,
      keywordName: item.keywordName,
      close_price: item.close_price
    });
  });
} else {
  finalDailyRecords.push(...mockQuarterData);
}

export const INITIAL_DAILY_RECORDS = finalDailyRecords;

