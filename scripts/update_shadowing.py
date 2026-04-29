import os
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import requests
import google.generativeai as genai
import FinanceDataReader as fdr
import pandas as pd
from dotenv import load_dotenv

load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "여기에_키를_입력하세요")
# KIS API 설정은 더 이상 사용하지 않지만 호환성을 위해 남겨둠
KIS_APP_KEY = os.environ.get("KIS_APP_KEY", "")
KIS_APP_SECRET = os.environ.get("KIS_APP_SECRET", "")

# [추가됨] FinanceDataReader가 환경변수의 KIS API 키를 감지하고 자체적으로 KIS API를 호출하다가 
# 토큰 발급 제한(1분 1회)에 걸리는 에러("EGW00133")를 방지하기 위해 환경변수에서 KIS 키를 제거합니다.
if 'KIS_APP_KEY' in os.environ:
    del os.environ['KIS_APP_KEY']
if 'KIS_APP_SECRET' in os.environ:
    del os.environ['KIS_APP_SECRET']

EXISTING_KEYWORDS = "기업 밸류업 프로그램, 전고체 배터리, HBM (AI 반도체), 우주항공, 전력설비 / 변압기, 유리기판, 비만치료제 (GLP-1), 로봇 / 지능형 AI, 원전 (SMR), CXL 반도체, K-방산 (수출), K-조선 (슈퍼사이클), 화장품 (K-뷰티)"

def get_surged_stocks_fdr(target_date):
    print("FinanceDataReader를 통해 코스피/코스닥 전 종목 시세 수집 시작...")
    results = []
    
    try:
        df_kospi = fdr.StockListing('KOSPI')
        df_kosdaq = fdr.StockListing('KOSDAQ')
        df = pd.concat([df_kospi, df_kosdaq])
        
        for _, row in df.iterrows():
            code = str(row['Code'])
            name = str(row['Name'])
            
            # 스팩주 원천 차단
            if '스팩' in name or 'SPAC' in name.upper():
                continue
                
            change_rate = float(row['ChagesRatio']) if not pd.isna(row['ChagesRatio']) else 0.0
            amount = float(row['Amount']) if not pd.isna(row['Amount']) else 0.0
            vol_krw = int(amount / 100000000)
            vol_cnt = int(row['Volume']) if not pd.isna(row['Volume']) else 0
            close_price = int(row['Close']) if not pd.isna(row['Close']) else 0
            
            if (change_rate >= 6.0 and vol_krw >= 300) or change_rate >= 29.5:
                results.append({
                    "date": f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}",
                    "code": code,
                    "name": name,
                    "close_price": close_price,
                    "change_rate": round(change_rate, 2),
                    "volume_krw": vol_krw,
                    "volume_cnt": vol_cnt
                })
        print(f"전 종목 조회 성공! 필터링된 종목 수: {len(results)}개")
        return results
    except Exception as e:
        print(f"FinanceDataReader 데이터 수집 에러: {e}")
        return []

def get_google_news(stock_name):
    query = urllib.parse.quote(stock_name + " 특징주")
    url = f"https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            titles = []
            for item in root.findall('.//item')[:3]:
                title = item.find('title').text
                if ' - ' in title:
                    title = title.rsplit(' - ', 1)[0]
                titles.append(title)
            return " / ".join(titles)
    except Exception as e:
        return ""

def analyze_stocks_batch(stocks, naver_themes):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "여기에_키를_입력하세요":
        print("Gemini API 키가 설정되지 않았습니다.")
        return {s['code']: {"reason": "[API 미설정]", "keyword": "미분류"} for s in stocks}

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # 무료 티어 한도가 넉넉한 최신 gemini-2.5-flash 모델로 변경합니다.
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""당신은 한국 주식을 다루는 최고 수준의 트레이더입니다.
아래는 오늘 필터링된 급등주 목록입니다. (종목코드, 종목명, 상승률, 거래대금, 오늘자 뉴스헤드라인)

"""
        for s in stocks:
            nt = naver_themes.get(s['code'], [])
            nt_str = f" (네이버 공식 지정 테마: {', '.join(nt)})" if nt else ""
            prompt += f"- {s['code']} {s['name']}: {s['change_rate']}% 상승, {s['volume_krw']}억 거래\n"
            prompt += f"  뉴스: {s.get('news_titles', '')}{nt_str}\n"
            
        prompt += f"""
위 종목들을 모두 분석하여, 각 종목마다 '어떤 재료/이슈/모멘텀'으로 급등했는지 심층 파악하세요.
분석 사유 맨 앞에 반드시 아래의 매우 상세한 카테고리 태그 모음 중 가장 적합한 1개를 [말머리]로 달아주세요.
[정책수혜], [임상통과/신약기대], [실적/어닝서프라이즈], [대규모수주/공급계약], [인수합병/M&A],
[유상증자/무상증자], [지분투자/투자유치], [자사주취득/소각], [경영권분쟁/행동주의], [독점/단독보도],
[FDA/식약처승인], [지정학적수혜/리스크], [신규사업진출], [품절주/스팩], [수급/테마편승], [기타]

결과 사유는 정확히 1문장(최고 50자 내외)으로 핵심만 간결하게 작성하세요.
절대로 '개별이슈', '기타', '미분류' 와 같은 모호하고 포괄적인 단어를 테마명으로 사용하지 마세요. 반드시 구체적인 산업이나 재료(예: '폐배터리', '보안/양자암호', '경영권 분쟁' 등)를 테마명으로 특정해 주세요.
기존 테마 목록({EXISTING_KEYWORDS}) 중 하나를 고르거나 전혀 새로운 테마라면 10자 이내 명사형의 새 테마를 명명하세요.

오직 다음 JSON 배열(Array) 형식으로만 출력해야 합니다 (기타 마크다운 없이 JSON만 출력):
[
  {{"code": "종목코드1", "reason": "[태그] 요약 사유", "keyword": "명명된 테마"}},
  {{"code": "종목코드2", "reason": "[태그] 요약 사유", "keyword": "명명된 테마"}}
]
"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
                data = json.loads(clean_json)
                
                # 배열을 딕셔너리로 변환하여 code로 O(1) 접근
                return {item["code"]: {"reason": item["reason"], "keyword": item["keyword"]} for item in data}
            except Exception as e:
                if '429' in str(e) and attempt < max_retries - 1:
                    print(f"Gemini API 호출 제한(Rate Limit) 도달. 40초 후 재시도합니다... ({attempt+1}/{max_retries})")
                    time.sleep(40)
                else:
                    raise e
    except Exception as e:
        print("Gemini 일괄 분석 중 에러:", e)
        return {}

if __name__ == "__main__":
    print("====================================")
    print(" 주식 쉐도잉 데이터 파이프라인 (초정밀 AI 분석 가동) ")
    print("====================================")
    
    yyyymmdd = datetime.now().strftime("%Y%m%d")
    yyyymmdd_formatted = datetime.now().strftime("%Y-%m-%d")
    
    stocks_to_analyze = get_surged_stocks_fdr(yyyymmdd)
    stocks_to_analyze.sort(key=lambda x: x['volume_krw'], reverse=True)
    
    print(f"\n최종 요약: 총 {len(stocks_to_analyze)}개의 종목이 필터링되었습니다.\n")
    final_output = []
    
    print(f"구글 뉴스로부터 각 종목당 최신 헤드라인 수집 중...")
    for idx, s in enumerate(stocks_to_analyze):
        s['news_titles'] = get_google_news(s['name'])
        
    naver_themes = {}
    try:
        with open('src/data/naver_themes.json', 'r', encoding='utf-8') as f:
            naver_themes = json.load(f)
    except:
        print("네이버 테마 캐시를 찾을 수 없습니다. 기본 분석을 진행합니다.")

    ai_results = {}
    if stocks_to_analyze:
        print("Gemini AI를 이용한 일괄 분석 진행 중... (배치 처리로 통신 1회만 실시하여 API 한도 절약)")
        ai_results = analyze_stocks_batch(stocks_to_analyze, naver_themes)
        
    output_filename = 'src/data/shadowing_real_history.json'
    existing_data = []
    
    if os.path.exists(output_filename):
        with open(output_filename, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except:
                pass

    # 1. 과거 테마 캐싱
    theme_cache = {}
    for d in existing_data:
        kw = d.get('keywordName')
        code = d.get('code')
        if kw and kw not in ['미분류', '개별이슈']:
            theme_cache[code] = kw

    # 2. KRX-DESC 산업정보 캐싱
    import FinanceDataReader as fdr
    print("종목별 산업정보(KRX-DESC) 보조 데이터 로딩 중...")
    try:
        df_desc = fdr.StockListing('KRX-DESC')
        desc_dict = {str(row['Code']): str(row['Industry']) + ' ' + str(row['Products']) for _, row in df_desc.iterrows()}
    except Exception as e:
        print("KRX-DESC 로딩 에러:", e)
        desc_dict = {}

    keyword_rules = {
        'HBM (AI 반도체)': ['AI반도체', 'HBM', '엔비디아', '마이크론', 'TSMC', 'CXL', '온디바이스', '반도체 장비', '패키징'],
        '유리기판 / 디스플레이': ['디스플레이', 'LED', 'OLED', '유리기판', '모니터', 'LCD'],
        'K-바이오 (주도)': ['제약', '바이오', '신약', '임상', 'FDA', '항암', '치료제', '의료기기', '의학', '병원'],
        '비만치료제 (GLP-1)': ['비만', 'GLP-1', '당뇨', '삭센다', '위고비'],
        '로봇 / 지능형 AI': ['로봇', '자율주행', '지능형', '인공지능', '자동화', '스마트팩토리', 'AI서비스'],
        '원전 (SMR)': ['원전', 'SMR', '체코', '탈원전', '원자력'],
        '화장품 (K-뷰티)': ['화장품', '뷰티', '미용', '케이뷰티', '에스테틱'],
        '전력설비 / 변압기': ['전력', '변압기', '전선', '송전', '그리드', '전기', '스마트그리드'],
        'K-조선 (슈퍼사이클)': ['조선', '선박', '해운', '항만', '피팅', '벌크선'],
        '우주항공': ['우주', '항공', '위성', '스페이스', '드론', '누리호'],
        '전고체 배터리': ['배터리', '2차전지', '전고체', '리튬', '양극재', '음극재', '수산화리튬', 'ESS'],
        'K-방산 (수출)': ['방산', '무기', '국방', '미사일', '자주포', '전차', '다련장']
    }

    for s in stocks_to_analyze:
        res = ai_results.get(s['code'], {})
        
        if 'reason' not in res or res.get('keyword', '미분류') == '미분류':
            news = s.get('news_titles', '')
            found_kw = None
            
            # 1. 캐시 확인
            if s['code'] in theme_cache:
                found_kw = theme_cache[s['code']]
            
            # 1.5. 네이버 공식 테마 확인
            if not found_kw and s['code'] in naver_themes and naver_themes[s['code']]:
                found_kw = naver_themes[s['code']][0]
                
            # 2. 뉴스 매칭
            if not found_kw:
                for kw, rules in keyword_rules.items():
                    if any(r in news for r in rules):
                        found_kw = kw
                        break
            
            if not found_kw:
                industry_info = desc_dict.get(s['code'], '')
                for kw, rules in keyword_rules.items():
                    if any(r in industry_info for r in rules):
                        found_kw = kw
                        break
                        
            if not found_kw:
                industry_info = str(desc_dict.get(s['code'], ''))
                if industry_info and len(industry_info) > 2 and 'nan' not in industry_info.lower():
                    found_kw = industry_info.split()[0]
                else:
                    found_kw = '특징주'
            reason_text = news.split('/')[0] if news else '차트 급등 (주요 뉴스 미발견)'
            s['reason'] = f'[{found_kw}] {reason_text[:40].strip()}...'
            s['keywordName'] = found_kw
        else:
            s['reason'] = res['reason']
            s['keywordName'] = res['keyword']
            
        final_output.append(s)
        
    existing_data = [d for d in existing_data if d.get('date') != yyyymmdd_formatted]
    existing_data.extend(final_output)

    if not os.path.exists('src/data'):
        os.makedirs('src/data')
        
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
    print(f"\n완료! 결과물이 {output_filename} 에 누적 저장되었습니다.")
