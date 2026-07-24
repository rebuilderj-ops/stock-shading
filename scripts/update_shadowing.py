import os
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
import requests
import google.generativeai as genai
import FinanceDataReader as fdr
import pandas as pd
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from json_utils import extract_json_from_text

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

EXISTING_KEYWORDS = "뷰티, 방산, 조선, 원전, 반도체, 건설, 우주항공, 게임, 로봇, AI, 바이오, 전력설비, 통신, 드론, 자동차, 2차전지, 금융, 신재생에너지, 양자암호, 엔터, 식음료, 철강, 화학, 해운, IT, 디스플레이, 기계, 메타버스, 유통, 패션"

def get_surged_stocks_naver(target_date):
    print("네이버 증권을 통해 실시간 급등주 수집 시작 (Fallback)...")
    results = []
    
    # krx_desc.json에서 종목코드 -> 종목명 매핑 정보 로드 (한글 깨짐 방지 및 보조용)
    code_to_name = {}
    try:
        if os.path.exists('krx_desc.json'):
            with open('krx_desc.json', 'r', encoding='utf-8') as f:
                desc_list = json.load(f)
                for item in desc_list:
                    if 'Code' in item and 'Name' in item:
                        code_to_name[str(item['Code']).zfill(6)] = str(item['Name'])
    except Exception as e:
        print(f"krx_desc.json 로드 실패: {e}")

    # sosok=0 (코스피), sosok=1 (코스닥)
    for sosok in [0, 1]:
        page = 1
        while True:
            url = f"https://finance.naver.com/sise/sise_rise.naver?sosok={sosok}&page={page}"
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                html = urllib.request.urlopen(req, timeout=10).read()
                # 네이버 금융은 EUC-KR 인코딩이므로 EUC-KR로 디코딩
                html_str = html.decode('euc-kr', errors='replace')
                
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html_str, 'html.parser')
                
                rows = soup.find_all('tr')
                page_results = []
                
                for tr in rows:
                    a_tag = tr.find('a', class_='tltle')
                    if not a_tag:
                        continue
                    
                    href = a_tag.get('href', '')
                    if 'code=' not in href:
                        continue
                    code = href.split('code=')[1].strip()
                    
                    # 스크랩된 종목명 확보 및 캐시 대조
                    scraped_name = a_tag.text.strip()
                    name = code_to_name.get(code, scraped_name)
                    
                    # 스팩주 필터링
                    if '스팩' in name or 'SPAC' in name.upper():
                        continue
                        
                    tds = tr.find_all('td')
                    if len(tds) < 6:
                        continue
                        
                    try:
                        # td[2] = 현재가, td[4] = 등락률, td[5] = 거래량
                        close_price = int(tds[2].text.strip().replace(',', ''))
                        change_rate = float(tds[4].text.strip().replace(',', '').replace('%', '').replace('+', ''))
                        vol_cnt = int(tds[5].text.strip().replace(',', ''))
                    except ValueError:
                        continue
                        
                    # 거래대금(억 원) = (거래량 * 현재가) / 100,000,000
                    vol_krw = int((vol_cnt * close_price) / 100000000)
                    
                    page_results.append({
                        "date": f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}",
                        "code": code,
                        "name": name,
                        "close_price": close_price,
                        "change_rate": round(change_rate, 2),
                        "volume_krw": vol_krw,
                        "volume_cnt": vol_cnt
                    })
                
                if not page_results:
                    break
                    
                # 필터링 조건 (상승률 6% 이상 & 거래대금 300억 이상, 또는 상한가 29.5% 이상)
                for r in page_results:
                    if (r['change_rate'] >= 6.0 and r['volume_krw'] >= 300) or r['change_rate'] >= 29.5:
                        results.append(r)
                        
                # 페이지 내 최소 등락률이 6.0% 미만이면 다음 페이지 탐색 종료
                lowest_change = min(r['change_rate'] for r in page_results)
                if lowest_change < 6.0:
                    break
                    
                page += 1
                time.sleep(0.1)
                
            except Exception as e:
                print(f"네이버 크롤링 중 에러 (Page {page}): {e}")
                break
                
    print(f"네이버 크롤링 완료! 필터링된 종목 수: {len(results)}개")
    return results

def get_surged_stocks_fdr(target_date):
    print("FinanceDataReader를 통해 코스피/코스닥 전 종목 시세 수집 시작...")
    results = []
    
    try:
        df_kospi = fdr.StockListing('KOSPI')
        df_kosdaq = fdr.StockListing('KOSDAQ')
        
        if df_kospi.empty and df_kosdaq.empty:
            print("FinanceDataReader 결과가 비어 있습니다. 예비 네이버 수집기를 작동합니다.")
            return get_surged_stocks_naver(target_date)
            
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
        print("예비 네이버 수집기(Fallback)를 작동합니다...")
        return get_surged_stocks_naver(target_date)


def get_naver_board_titles(code):
    """네이버 페이 증권 종목 토론실의 최신 게시글 제목 15개를 긁어옵니다."""
    url = f"https://finance.naver.com/item/board.naver?code={code}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    titles = []
    max_retries = 2
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            html = urllib.request.urlopen(req, timeout=8).read()
            html_str = html.decode('utf-8', errors='replace')

            soup = BeautifulSoup(html_str, 'html.parser')
            table = soup.find('table', class_='type2')
            if table:
                rows = table.find_all('td', class_='title')
                for row in rows[:15]:
                    a_tag = row.find('a')
                    if a_tag:
                        title = a_tag.get('title') or a_tag.text.strip()
                        titles.append(title)
            break
        except Exception as e:
            print(f"네이버 토론실 크롤링 실패 ({code}, 시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(1.5)
    return " / ".join(titles)

def get_refined_stock_news_and_board(stock_name, code):
    """구글 뉴스에서 최근 3일 이내의 기사만 필터링하고 네이버 종목 토론실 제목들과 병합하여 반환합니다."""
    # 1. 구글 뉴스 수집 (1차: 종목명 + 특징주)
    queries = [f"{stock_name} 특징주", stock_name]
    valid_articles = []
    now_dt = datetime.now(timezone.utc)
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    for q in queries:
        # 이미 3일 이내 기사가 3개 이상 모였다면 추가 검색 생략
        if len(valid_articles) >= 3:
            break
            
        query = urllib.parse.quote(q)
        url = f"https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                xml_data = response.read()
                root = ET.fromstring(xml_data)
                for item in root.findall('.//item')[:15]:  # 상위 15개 훑기
                    title = item.find('title').text
                    pub_date = item.find('pubDate').text
                    
                    try:
                        # RFC 822 날짜 포맷 파싱
                        pub_date_dt = parsedate_to_datetime(pub_date)
                        # 최근 3일 이내 발행 여부 검사 (과거 낡은 기사 원천 차단)
                        diff = now_dt - pub_date_dt
                        if diff.days <= 3:
                            if ' - ' in title:
                                title = title.rsplit(' - ', 1)[0]
                            if title not in valid_articles:
                                valid_articles.append(title)
                    except Exception as date_err:
                        # 파싱 에러 시 안전하게 스킵
                        continue
        except Exception as e:
            print(f"구글 뉴스 수집 중 에러 ({q}): {e}")
            
    news_text = " / ".join(valid_articles[:5]) if valid_articles else "최근 3일 내 특징주 기사 없음"
    
    # 2. 네이버 토론실 제목 수집
    board_text = get_naver_board_titles(code)
    
    # 두 소스 융합 반환
    return f"[최신 뉴스] {news_text} [토론방 의견] {board_text}"

def analyze_stocks_batch(stocks, naver_themes):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "여기에_키를_입력하세요":
        print("Gemini API 키가 설정되지 않았습니다.")
        return {s['code']: {"reason": "[API 미설정]", "keyword": "미분류"} for s in stocks}

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # 무료 티어 한도가 넉넉한 최신 gemini-2.5-flash 모델로 변경합니다.
        model = genai.GenerativeModel('gemini-flash-lite-latest')
        
        prompt = f"""당신은 한국 주식을 다루는 최고 수준의 트레이더입니다.
아래는 오늘 필터링된 급등주 목록입니다. (종목코드, 종목명, 상승률, 거래대금, 오늘자 뉴스헤드라인)

"""
        for s in stocks:
            nt = naver_themes.get(s['code'], [])
            nt_str = f" (네이버 공식 지정 테마: {', '.join(nt)})" if nt else ""
            prompt += f"- {s['code']} {s['name']}: {s['change_rate']}% 상승, {s['volume_krw']}억 거래\n"
            prompt += f"  뉴스: {s.get('news_titles', '')}{nt_str}\n"
            
        prompt += f"""
위 종목들의 뉴스 헤드라인과 네이버 토론실 실시간 여론을 꼼꼼하게 대조하여, 각 종목마다 '오늘(2026년) 어떤 구체적인 재료/이슈/모멘텀'으로 급등했는지 정확한 실시간 사유를 파악하세요.
반드시 제공된 최신 3일치 뉴스 및 실시간 토론글을 기준으로 삼으세요. 수년 전의 낡은 뉴스나 과거 테마(예: 2018년 남북러 가스관 사업)가 오늘자 급등 사유로 둔갑하지 않도록 각별히 필터링해야 합니다.
특히 구글 뉴스 헤드라인에 오래된 과거 테마가 잡히거나 날짜 왜곡이 있더라도, 네이버 토론방 의견에서 실시간 새로운 호재(예: 부국철강의 전남 반도체 공장 유치 및 장성 부지 보유 이슈 등)가 일관되게 언급된다면 과거 뉴스의 낡은 테마를 배제하고 토론방의 실시간 호재 정보를 우선하여 요약 사유와 테마 키워드를 작성하세요.

분석 사유 맨 앞에 종목의 급등 사유를 한 문장으로 요약하되, [스페이스X], [마켓컬리], [탈모 급여화] 와 같은 구체적인 오늘자 핵심 재료나 개별 키워드를 [말머리]로 달아주세요.
결과 사유는 정확히 1문장(최고 50자 내외)으로 핵심만 간결하게 작성하세요.

그리고 각 종목의 'keyword' 속성에는 반드시 아래의 '핵심 테마' 30개 중 가장 적합한 1개만 골라서 넣어주세요.
핵심 테마 목록: {EXISTING_KEYWORDS}
(예: '반도체 장비', '반도체 부품', 'HBM' 등은 모두 '반도체'로 분류. '스페이스 X' 관련주는 '우주항공'으로 분류)

최대한 위 30개 테마 안에서 분류해 주시고, 도저히 30개 안에 포함될 수 없는 완전히 독립적인 개별 테마인 경우에만 예외적으로 '기타'를 사용해 주세요. ('미분류', '개별이슈' 등의 단어는 절대 금지)

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
                clean_json = extract_json_from_text(response.text)
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
    
    # 주말/휴장일 체크
    try:
        import FinanceDataReader as fdr
        df_kospi = fdr.DataReader('KS11', yyyymmdd_formatted, yyyymmdd_formatted)
        if df_kospi.empty:
            print(f"{yyyymmdd_formatted} 은(는) 휴장일 또는 주말이므로 데이터 수집을 종료합니다.")
            exit(0)
    except Exception as e:
        print(f"휴장일 체크 중 에러 발생 (무시하고 진행): {e}")
        if datetime.now().weekday() >= 5:
            print("오늘은 주말이므로 데이터 수집을 종료합니다.")
            exit(0)
            
    stocks_to_analyze = get_surged_stocks_fdr(yyyymmdd)
    stocks_to_analyze.sort(key=lambda x: x['volume_krw'], reverse=True)
    
    print(f"\n최종 요약: 총 {len(stocks_to_analyze)}개의 종목이 필터링되었습니다.\n")
    final_output = []
    
    print(f"최근 3일치 뉴스와 네이버 종목 토론방 여론 분석 데이터 수집 중...")
    for idx, s in enumerate(stocks_to_analyze):
        s['news_titles'] = get_refined_stock_news_and_board(s['name'], s['code'])
        
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
    valid_themes = [k.strip() for k in EXISTING_KEYWORDS.split(',')]
    theme_cache = {}
    for d in existing_data:
        kw = d.get('keywordName')
        code = d.get('code')
        if kw and kw in valid_themes:
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
        
    # [수정] 오늘 데이터를 '통째로 교체'하면, 장 마감 직후 아직 데이터가 덜 정산됐을 때
    # 실행된 불완전한 수집이 이미 저장된 완전한 수집(또는 그 반대)을 덮어써서
    # 상한가 종목이 누락되는 문제가 있었습니다(예: 위닉스·아이씨에이치 상한가 누락).
    # → 오늘자 '기존 + 신규'를 종목코드 기준 union 으로 병합해, 어느 실행에서든 한 번
    #   포착된 종목은 보존합니다. 동일 종목은 등락률이 더 높은(더 정산된) 레코드를 채택.
    today_existing = {d['code']: d for d in existing_data if d.get('date') == yyyymmdd_formatted}
    existing_data = [d for d in existing_data if d.get('date') != yyyymmdd_formatted]
    merged_today = dict(today_existing)
    for r in final_output:
        prev = merged_today.get(r['code'])
        # 신규 레코드를 기본 채택하되, 기존이 더 높은 등락률(더 정산된 값)이면 유지
        if prev is None or (r.get('change_rate', 0) or 0) >= (prev.get('change_rate', 0) or 0):
            merged_today[r['code']] = r
    existing_data.extend(merged_today.values())

    if not os.path.exists('src/data'):
        os.makedirs('src/data')
        
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
    print(f"\n완료! 결과물이 {output_filename} 에 누적 저장되었습니다.")
