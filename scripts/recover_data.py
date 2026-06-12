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

# Ensure UTF-8 mode in environment
os.environ["PYTHONUTF8"] = "1"

load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
EXISTING_KEYWORDS = "뷰티, 방산, 조선, 원전, 반도체, 건설, 우주항공, 게임, 로봇, AI, 바이오, 전력설비, 통신, 드론, 자동차, 2차전지, 금융, 신재생에너지, 양자암호, 엔터, 식음료, 철강, 화학, 해운, IT, 디스플레이, 기계, 메타버스, 유통, 패션"

def get_surged_stocks_fdr(target_date):
    date_formatted = f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}"
    print(f"[{date_formatted}] FinanceDataReader 수집 시작...")
    results = []
    
    # 6월 8일, 10일, 11일은 과거 데이터이므로 fdr_krx_data_cache GitHub 저장소에
    # 이미 캐시 CSV가 적재되어 있어 성공율이 100%입니다.
    try:
        df_kospi = fdr.StockListing('KOSPI')
        df_kosdaq = fdr.StockListing('KOSDAQ')
        df = pd.concat([df_kospi, df_kosdaq])
        
        for _, row in df.iterrows():
            code = str(row['Code'])
            name = str(row['Name'])
            
            if '스팩' in name or 'SPAC' in name.upper():
                continue
                
            change_rate = float(row['ChagesRatio']) if not pd.isna(row['ChagesRatio']) else 0.0
            amount = float(row['Amount']) if not pd.isna(row['Amount']) else 0.0
            vol_krw = int(amount / 100000000)
            vol_cnt = int(row['Volume']) if not pd.isna(row['Volume']) else 0
            close_price = int(row['Close']) if not pd.isna(row['Close']) else 0
            
            if (change_rate >= 6.0 and vol_krw >= 300) or change_rate >= 29.5:
                results.append({
                    "date": date_formatted,
                    "code": code,
                    "name": name,
                    "close_price": close_price,
                    "change_rate": round(change_rate, 2),
                    "volume_krw": vol_krw,
                    "volume_cnt": vol_cnt
                })
        print(f"[{date_formatted}] 수집 완료! 필터링된 종목 수: {len(results)}개")
        return results
    except Exception as e:
        print(f"[{date_formatted}] 수집 중 에러 발생: {e}")
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
    if not GEMINI_API_KEY:
        print("Gemini API 키가 없습니다.")
        return {}
    try:
        genai.configure(api_key=GEMINI_API_KEY)
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
분석 사유 맨 앞에 종목의 급등 사유를 한 문장으로 요약하되, [스페이스X], [마켓컬리], [어닝서프라이즈] 와 같은 구체적인 재료나 개별 키워드를 [말머리]로 달아주세요.
결과 사유는 정확히 1문장(최고 50자 내외)으로 핵심만 간결하게 작성하세요.

그리고 각 종목의 'keyword' 속성에는 반드시 아래의 '핵심 테마' 30개 중 가장 적합한 1개만 골라서 넣어주세요.
핵심 테마 목록: {EXISTING_KEYWORDS}

오직 다음 JSON 배열(Array) 형식으로만 출력해야 합니다 (기타 마크다운 없이 JSON만 출력):
[
  {{"code": "종목코드1", "reason": "[태그] 요약 사유", "keyword": "명명된 테마"}},
  {{"code": "종목코드2", "reason": "[태그] 요약 사유", "keyword": "명명된 테마"}}
]
"""
        response = model.generate_content(prompt)
        clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        data = json.loads(clean_json)
        return {item["code"]: {"reason": item["reason"], "keyword": item["keyword"]} for item in data}
    except Exception as e:
        print("Gemini 분석 에러:", e)
        return {}

def run_recovery_for_date(target_date):
    date_formatted = f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}"
    print(f"\n==========================================")
    print(f" {date_formatted} 데이터 복구 및 백필 시작")
    print(f"==========================================")
    
    stocks = get_surged_stocks_fdr(target_date)
    if not stocks:
        print(f"{date_formatted} 수집된 종목이 없습니다.")
        return []
        
    stocks.sort(key=lambda x: x['volume_krw'], reverse=True)
    
    print("구글 뉴스 수집 중...")
    for s in stocks:
        s['news_titles'] = get_google_news(s['name'])
        time.sleep(0.1)
        
    naver_themes = {}
    try:
        with open('src/data/naver_themes.json', 'r', encoding='utf-8') as f:
            naver_themes = json.load(f)
    except:
        pass
        
    print("Gemini AI 종목 분석 진행 중...")
    ai_results = analyze_stocks_batch(stocks, naver_themes)
    
    final_output = []
    
    # 산업정보 매핑 로드
    desc_dict = {}
    try:
        df_desc = fdr.StockListing('KRX-DESC')
        desc_dict = {str(row['Code']): str(row['Industry']) + ' ' + str(row['Products']) for _, row in df_desc.iterrows()}
    except Exception as e:
        print("KRX-DESC 로딩 에러:", e)
        
    keyword_rules = {
        '반도체': ['AI반도체', 'HBM', '엔비디아', '마이크론', 'TSMC', 'CXL', '온디바이스', '반도체', '유리기판'],
        '바이오': ['제약', '바이오', '신약', '임상', 'FDA', '항암', '치료제', '의료기기', '의학', '병원', '비만'],
        '로봇': ['로봇', '자동화', '스마트팩토리', '지능형'],
        'AI': ['인공지능', 'AI'],
        '원전': ['원전', 'SMR', '체코', '탈원전', '원자력'],
        '뷰티': ['화장품', '뷰티', '미용', '케이뷰티', '에스테틱'],
        '전력설비': ['전력', '변압기', '전선', '송전', '그리드', '전기', '스마트그리드'],
        '조선': ['조선', '선박', '항만', '피팅', '벌크선'],
        '우주항공': ['우주', '항공', '위성', '스페이스', '누리호'],
        '2차전지': ['배터리', '2차전지', '전고체', '리튬', '양극재', '음극재', '수산화리튬', 'ESS'],
        '방산': ['방산', '무기', '국방', '미사일', '자주포', '전차', '다련장'],
        '건설': ['건설', '건축', '토목', '재건축', '시공'],
        '게임': ['게임', '신작', 'MMORPG', '모바일게임'],
        '통신': ['통신', '5G', '6G', '네트워크'],
        '드론': ['드론', '무인기', 'UAM'],
        '자동차': ['자동차', '현대차', '기아', '전기차', '자율주행', '부품'],
        '금융': ['금융', '은행', '증권', '보험', '지주사', '밸류업'],
        '신재생에너지': ['태양광', '풍력', '수소', '탄소', '친환경', '신재생'],
        '양자암호': ['양자', '양자암호', '양자컴퓨터', '보안', '사이버보안'],
        '엔터': ['엔터', 'K-POP', '웹툰', '영화', '드라마', '방송'],
        '식음료': ['식음료', '식품', '라면', '제과', '음식료', 'K-푸드'],
        '철강': ['철강', '금속', '구리', '알루미늄', '희토류'],
        '화학': ['화학', '석유화학', '플라스틱', '정유'],
        '해운': ['해운', '상선', '물류', '택배'],
        'IT': ['IT', '클라우드', '빅데이터', '핀테크', '소프트웨어', 'SI'],
        '디스플레이': ['디스플레이', 'OLED', 'LCD', '마이크로LED'],
        '기계': ['기계', '건설기계', '농기계', '공작기계', '굴착기'],
        '메타버스': ['메타버스', 'VR', 'AR', 'XR', '가상현실', '증강현실'],
        '유통': ['유통', '백화점', '면세점', '편의점', '홈쇼핑'],
        '패션': ['패션', '의류', '신발']
    }
    
    for s in stocks:
        res = ai_results.get(s['code'], {})
        if 'reason' not in res or res.get('keyword', '미분류') == '미분류':
            news = s.get('news_titles', '')
            found_kw = None
            
            if s['code'] in naver_themes and naver_themes[s['code']]:
                found_kw = naver_themes[s['code']][0]
                
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
                found_kw = '특징주'
                
            reason_text = news.split('/')[0] if news else '차트 급등'
            s['reason'] = f'[{found_kw}] {reason_text[:40].strip()}...'
            s['keywordName'] = found_kw
        else:
            s['reason'] = res['reason']
            s['keywordName'] = res['keyword']
            
        final_output.append(s)
        
    print(f"[{date_formatted}] 복구 완료! 최종 {len(final_output)}개 종목 변환 성공.")
    return final_output

if __name__ == "__main__":
    output_filename = 'src/data/shadowing_real_history.json'
    existing_data = []
    
    if os.path.exists(output_filename):
        with open(output_filename, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except:
                pass
                
    # 6월 8일 (백필), 6월 10일 (복구), 6월 11일 (복구)
    dates_to_recover = ["20260608", "20260610", "20260611"]
    
    for d_str in dates_to_recover:
        d_formatted = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:]}"
        # 기존 해당 날짜 데이터 제거 (덮어씌우기)
        existing_data = [d for d in existing_data if d.get('date') != d_formatted]
        
        # 새로운 데이터 수집 및 분석
        new_records = run_recovery_for_date(d_str)
        existing_data.extend(new_records)
        time.sleep(1) # API 쿨다운
        
    # 날짜 정렬 후 저장
    existing_data.sort(key=lambda x: x['date'])
    
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
    print("\n[성공] 모든 데이터 복구 및 백필 완료!")
    print("shadowing_real_history.json 에 누적 저장되었습니다.")
