// src/lib/mockData.js
import realHistoryData from "../data/shadowing_real_history.json";
export const INITIAL_KEYWORDS = [
  { id: 1, name: "기업 밸류업 프로그램", description: "정부 코리아 디스카운트 해소 테마. 저PBR, 은행, 지주사 중심.", color: "amber", created_at: "2026-01-10" },
  { id: 2, name: "전고체 배터리", description: "화재 위험 없고 주행거리가 긴 차세대 배터리 상용화 기술 확보.", color: "emerald", created_at: "2026-02-15" },
  { id: 3, name: "HBM (AI 반도체)", description: "엔비디아 발 고대역폭메모리 수요 증가 지속. 장비 및 부품주 수혜.", color: "blue", created_at: "2026-01-05" },
  { id: 4, name: "우주항공", description: "우주항공청 개청 및 스페이스X 발사 등 상업 우주 개발 모멘텀.", color: "violet", created_at: "2026-03-01" },
  { id: 5, name: "전력설비 / 변압기", description: "AI 데이터센터 폭증으로 일어난 글로벌 전력 인프라 대수퍼사이클.", color: "orange", created_at: "2026-01-20" },
  { id: 6, name: "유리기판", description: "차세대 반도체 패키징 시장을 열 글래스코어 기판 상용화 기대감.", color: "cyan", created_at: "2026-03-10" },
  { id: 7, name: "비만치료제 (GLP-1)", description: "노보노디스크, 일라이릴리 중심 비만 신약 임상 및 기술수출 모멘텀.", color: "pink", created_at: "2026-02-20" },
  { id: 8, name: "로봇 / 지능형 AI", description: "삼성, 현대차의 대규모 로봇 투자 및 AI 휴머노이드 모멘텀.", color: "lime", created_at: "2026-01-12" },
  { id: 9, name: "원전 (SMR)", description: "미국 및 체코 등 글로벌 SMR 원전 수출 수주 확대 기대.", color: "yellow", created_at: "2026-04-01" },
  { id: 10, name: "CXL 반도체", description: "메모리 병목현상을 해결할 인터페이스. 인텔 및 삼성전자 핵심 주도.", color: "indigo", created_at: "2026-03-22" },
  { id: 11, name: "K-방산 (수출)", description: "유럽 및 중동 지정학적 리스크 지속. 폴란드 등 대규모 방산 수출.", color: "red", created_at: "2026-01-18" },
  { id: 12, name: "K-조선 (슈퍼사이클)", description: "미중 해운 분쟁 및 글로벌 친환경 선박 교체 주기에 따른 조선업 호황.", color: "sky", created_at: "2026-01-08" },
  { id: 13, name: "화장품 (K-뷰티)", description: "미국 및 일본을 중심으로 돌아선 중소형 인디 뷰티 브랜드들의 수출 폭발.", color: "rose", created_at: "2026-03-05" }
];

export const INITIAL_STOCKS = [
  { id: 1, keyword_id: 1, name: "KB금융", code: "105560", reason: "역대급 배당 및 자사주 소각", is_leader: true },
  { id: 2, keyword_id: 1, name: "삼성물산", code: "028260", reason: "지주사 밸류업 수혜", is_leader: false },
  { id: 3, keyword_id: 2, name: "이수스페셜티케미컬", code: "457190", reason: "황화리튬 양산 이슈", is_leader: true },
  { id: 4, keyword_id: 2, name: "한농화성", code: "011500", reason: "고분자 전해질 개발 성공", is_leader: false },
  { id: 5, keyword_id: 3, name: "SK하이닉스", code: "000660", reason: "HBM 독점적 공급 지위 수혜", is_leader: true },
  { id: 6, keyword_id: 3, name: "한미반도체", code: "042700", reason: "TC본더 독점. 엔비디아 젠슨황 수혜", is_leader: true },
  { id: 7, keyword_id: 4, name: "AP위성", code: "211270", reason: "위성 통신 단말 개발", is_leader: true },
  { id: 8, keyword_id: 4, name: "켄코아에어로스페이스", code: "274090", reason: "미국 스페이스X 부품 조달", is_leader: false },
  { id: 9, keyword_id: 5, name: "HD현대일렉트릭", code: "267260", reason: "북미 초고압 변압기 수주 잭팟", is_leader: true },
  { id: 10, keyword_id: 5, name: "LS ELECTRIC", code: "010120", reason: "신규 변압기 공장 증설 모멘텀", is_leader: false },
  { id: 11, keyword_id: 6, name: "필옵틱스", code: "161580", reason: "유리기판 TGV 장비 양산 돌입", is_leader: true },
  { id: 12, keyword_id: 6, name: "켐트로닉스", code: "089010", reason: "유리기판 식각 공정 수혜", is_leader: false },
  { id: 13, keyword_id: 7, name: "펩트론", code: "087010", reason: "1개월 지속형 스마트데포 기술수출 가시화", is_leader: true },
  { id: 14, keyword_id: 7, name: "삼천당제약", code: "000250", reason: "경구용 비만치료제 개발 모멘텀", is_leader: false },
  { id: 15, keyword_id: 8, name: "레인보우로보틱스", code: "277810", reason: "삼성전자 조기 인수설 부각", is_leader: true },
  { id: 16, keyword_id: 8, name: "두산로보틱스", code: "454910", reason: "유럽 로봇 점유율 확대 및 실적 개선", is_leader: false },
  { id: 17, keyword_id: 9, name: "우진엔텍", code: "457550", reason: "원전 해체 및 SMR 국책과제 독점적 수혜", is_leader: true },
  { id: 18, keyword_id: 9, name: "두산에너빌리티", code: "034020", reason: "글로벌 원전 핵심 부품 수주", is_leader: false },
  { id: 19, keyword_id: 10, name: "네오셈", code: "253590", reason: "CXL 검사장비 2.0 세계 최초 개발", is_leader: true },
  { id: 20, keyword_id: 10, name: "엑시콘", code: "092870", reason: "CXL 2.0 테스터 상용화 임박", is_leader: false },
  // 신규 방산/조선/화장품
  { id: 21, keyword_id: 11, name: "한화에어로스페이스", code: "012450", reason: "폴란드 및 루마니아 대규모 자주포 파생 수주 대박", is_leader: true },
  { id: 22, keyword_id: 11, name: "LIG넥스원", code: "079550", reason: "고스트로보틱스 인수 및 중동 천궁 수출", is_leader: false },
  { id: 23, keyword_id: 11, name: "현대로템", code: "064350", reason: "K2 전차 폴란드 수주 대란", is_leader: false },
  { id: 24, keyword_id: 12, name: "HD한국조선해양", code: "009540", reason: "친환경 선박 교체 싸이클에 따른 어닝 서프라이즈", is_leader: true },
  { id: 25, keyword_id: 12, name: "한화오션", code: "042660", reason: "특수선 위주 선별 수주 랠리 탑승", is_leader: false },
  { id: 26, keyword_id: 13, name: "실리콘투", code: "257720", reason: "미국 K-뷰티 침투율 확대 최대 마진 달성", is_leader: true },
  { id: 27, keyword_id: 13, name: "브이티", code: "018290", reason: "리들샷 일본 대흥행 및 미국 진출 모멘텀", is_leader: false }
];

export const INITIAL_SCHEDULES = [
  { id: 1, date: "2026-02-26", title: "기업 밸류업 1차 가이드라인 발표", keyword_id: 1 },
  { id: 2, date: "2026-03-06", title: "인터배터리 2026 (삼성SDI 전고체)", keyword_id: 2 },
  { id: 3, date: "2026-03-18", title: "엔비디아 GTC 2026 개발자 행사", keyword_id: 3 },
  { id: 4, date: "2026-04-10", title: "제22대 총선 본투표", keyword_id: 1 },
  { id: 5, date: "2026-04-18", title: "글로벌 차세대 패키징 컨퍼런스", keyword_id: 6 },
  { id: 6, date: "2026-05-27", title: "우주항공청 개청 행사", keyword_id: 4 }
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

  // Themes weighting per month to make the data feel 'real'
  // 1: ValueUp, 2: SolidBat, 3: HBM, 4: Space, 5: Power, 6: Glass, 7: Obesity, 8: Robot, 9: SMR, 10: CXL, 11: 방산, 12: 조선, 13: 뷰티
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 주말 제외 영업일만
    
    const dateStr = d.toISOString().split('T')[0];
    const month = d.getMonth() + 1;
    const seedBase = d.getTime();
    
    // 영업일 하루에 10 ~ 18종목 터짐 (종목이 늘어나서 갯수 더 증가)
    const numStocksToday = Math.floor(pseudoRandom(seedBase) * 8) + 10;
    const todayStocks = new Set();
    
    for (let i = 0; i < numStocksToday; i++) {
      let themeScore = pseudoRandom(seedBase + i);
      let targetKeywordId = 1;
      
      // 월별 주도 테마 가중치 좀 더 디테일하게
      if (month === 1) { // 1월: HBM, 밸류업, 방산주 호조, 조선 수주
        if(themeScore < 0.25) targetKeywordId = 3;
        else if(themeScore < 0.45) targetKeywordId = 1;
        else if(themeScore < 0.65) targetKeywordId = 11; // 방산
        else if(themeScore < 0.8) targetKeywordId = 12; // 조선
        else targetKeywordId = Math.floor(themeScore * 13) + 1; 
      } else if (month === 2) { // 2월: 밸류업, 전고체, 로봇, 방산
        if(themeScore < 0.3) targetKeywordId = 2;
        else if(themeScore < 0.5) targetKeywordId = 1;
        else if(themeScore < 0.65) targetKeywordId = 8;
        else if(themeScore < 0.8) targetKeywordId = 11;
        else targetKeywordId = Math.floor(themeScore * 13) + 1;
      } else if (month === 3) { // 3월: 유리기판, CXL, 우주항공, K뷰티 부상
        if(themeScore < 0.2) targetKeywordId = 6;
        else if(themeScore < 0.4) targetKeywordId = 10;
        else if(themeScore < 0.55) targetKeywordId = 4;
        else if(themeScore < 0.7) targetKeywordId = 13; // 뷰티
        else targetKeywordId = Math.floor(themeScore * 13) + 1;
      } else { // 4월: SMR, 비만, 전력설비 리레이팅, 뷰티 대박
        if(themeScore < 0.2) targetKeywordId = 9;
        else if(themeScore < 0.4) targetKeywordId = 7;
        else if(themeScore < 0.6) targetKeywordId = 5;
        else if(themeScore < 0.8) targetKeywordId = 13; // 뷰티
        else targetKeywordId = Math.floor(themeScore * 13) + 1;
      }
      if (targetKeywordId > 13) targetKeywordId = 1;

      const stocksInKeyword = INITIAL_STOCKS.filter(s => s.keyword_id === targetKeywordId);
      if (stocksInKeyword.length === 0) continue; // 방어 로직
      
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
      // 동전주 폭발 케이스인 경우 무조건 1000만주를 넘기도록 보정
      if (changeRate < 6.0 && volumeCnt < 10000000) {
          volumeCnt = Math.floor((pseudoRandom(seedBase + i * 12) * 30000000) + 12000000); 
          volumeKrw = Math.floor(volumeCnt * estimatedPrice / 100000000); // 거래대금 역산 맞춤
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

    // 추가 포획: 상한가 및 1000만주 이상 예외 종목들을 '추가적으로' 발생시킴
    const extraEdgeCases = Math.floor(pseudoRandom(seedBase + 999) * 5) + 3; // 하루에 3~7개의 상한가 및 1000만주 예외 종목 추가 포획
    for (let j = 0; j < extraEdgeCases; j++) {
      let targetKeywordId = Math.floor(pseudoRandom(seedBase + 1000 + j) * 13) + 1;
      const stocksInKeyword = INITIAL_STOCKS.filter(s => s.keyword_id === targetKeywordId);
      if (stocksInKeyword.length === 0) continue; 
      const selectedStock = stocksInKeyword[Math.floor(pseudoRandom(seedBase + 2000 + j) * stocksInKeyword.length)];
      if(todayStocks.has(selectedStock.id)) continue;
      todayStocks.add(selectedStock.id); 

      let changeRate, volumeKrw, estimatedPrice, volumeCnt;

      // 인덱스 j가 짝수면 상한가 점상 케이스, 홀수면 1000만주 동전주 케이스 (항상 최소 1개의 상한가 보장)
      if (j % 2 === 0) {
        // 상한가 점상 케이스 (대금 미달)
        changeRate = 29.8 + (pseudoRandom(seedBase + 4000 + j) * 0.2); 
        volumeKrw = Math.floor((pseudoRandom(seedBase + 5000 + j) * 200) + 50); // 50억 ~ 250억
        estimatedPrice = (pseudoRandom(seedBase + 6000 + j) * 50000) + 5000;
        volumeCnt = Math.floor((volumeKrw * 100000000) / estimatedPrice);
      } else {
        // 1천만주 돌파 케이스 (등락률, 대금 강력 미달)
        changeRate = (pseudoRandom(seedBase + 4000 + j) * 5.0) + 0.5; // 0.5% ~ 5.5%
        estimatedPrice = (pseudoRandom(seedBase + 5000 + j) * 800) + 500; // 500원 ~ 1300원
        volumeKrw = Math.floor((pseudoRandom(seedBase + 6000 + j) * 150) + 100); 
        volumeCnt = Math.floor((pseudoRandom(seedBase + 7000 + j) * 30000000) + 12000000); 
        volumeKrw = Math.floor(volumeCnt * estimatedPrice / 100000000); // 거래대금 역산 맞춤
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

export const INITIAL_DAILY_RECORDS = realHistoryData && realHistoryData.length > 0 
  ? realHistoryData 
  : generateQuarterData();
