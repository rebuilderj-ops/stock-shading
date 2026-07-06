import os
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv
import sys

# 동일 디렉토리(scripts) 내의 update_shadowing.py 모듈을 임포트하기 위해 path 등록
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from update_shadowing import get_refined_stock_news_and_board
except ImportError:
    # 만약 임포트 에러가 날 경우를 대비해 기본 fallback 처리 함수 제공
    def get_refined_stock_news_and_board(stock_name, code):
        return f"[Fallback] {stock_name} 정보 수집 에러"

from json_utils import extract_json_from_text, trim_to_length

# 환경변수 로드
load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def get_google_news_rss(query_str, limit=10):
    """구글 뉴스 RSS 피드로부터 특정 키워드의 기사 헤드라인을 수집합니다."""
    query = urllib.parse.quote(query_str)
    url = f"https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
    titles = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            for item in root.findall('.//item')[:limit]:
                title = item.find('title').text
                # 언론사명 제거 (예: "종목명 급등 - 매일경제" -> "종목명 급등")
                if ' - ' in title:
                    title = title.rsplit(' - ', 1)[0]
                pub_date = item.find('pubDate').text
                titles.append(f"[{pub_date}] {title}")
    except Exception as e:
        print(f"구글 뉴스 수집 중 에러 ({query_str}): {e}")
    return "\n".join(titles)

def load_krx_desc():
    """krx_desc.json 파일을 로드하여 한국 주식 종목명 -> 종목코드 매핑을 생성합니다."""
    name_to_code = {}
    if os.path.exists('krx_desc.json'):
        try:
            with open('krx_desc.json', 'r', encoding='utf-8') as f:
                desc_list = json.load(f)
                for item in desc_list:
                    if 'Code' in item and 'Name' in item:
                        # 6자리 포맷(예: 005930)으로 코드 정리
                        name_to_code[str(item['Name'])] = str(item['Code']).zfill(6)
        except Exception as e:
            print(f"krx_desc.json 로드 에러: {e}")
    else:
        print("krx_desc.json 파일이 존재하지 않습니다. 국장 종목 매핑을 생략합니다.")
    return name_to_code

def load_today_krx_shadowing(target_date):
    """오늘 오후 4시에 정규장 필터링된 주도주 목록을 불러옵니다."""
    shadowing_file = 'src/data/shadowing_real_history.json'
    today_stocks = []
    if os.path.exists(shadowing_file):
        try:
            with open(shadowing_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # target_date 형식: YYYY-MM-DD
                today_stocks = [s for s in data if s.get('date') == target_date]
        except Exception as e:
            print(f"섀도잉 데이터 로드 에러: {e}")
    return today_stocks

def get_overtime_price_info(code):
    """네이버 실시간 시세 API로부터 실제 시간외 단일가 체결 정보를 가져옵니다.

    기존 로직은 시간외 등락률을 Gemini가 뉴스 문맥만 보고 '10% 이상 상승' 식으로
    추정하도록 시켰기 때문에 실제 체결가와 무관한 값이 나올 수 있었습니다.
    여기서는 네이버 금융이 제공하는 실시간 폴링 API의 overMarketPriceInfo
    (시간외 단일가 세션 체결 데이터)를 직접 조회해 실제 가격/등락률을 사용합니다.
    실제 체결 거래량이 0이면(시간외 거래가 없었던 종목) None을 반환해 제외시킵니다.
    """
    url = f"https://polling.finance.naver.com/api/realtime/domestic/stock/{code}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            item = (data.get('datas') or [{}])[0]
            over = item.get('overMarketPriceInfo') or {}
            if not over:
                return None

            volume = int(str(over.get('accumulatedTradingVolumeRaw', 0) or 0))
            if volume <= 0:
                return None

            over_price = int(str(over.get('overPrice', '0')).replace(',', '') or 0)
            change_pct = float(over.get('fluctuationsRatio', 0) or 0)

            return {
                "price": over_price,
                "change": round(change_pct, 2)
            }
    except Exception as e:
        print(f"시간외 단일가 실시간 조회 실패 ({code}): {e}")
        return None


def extract_kr_after_market_stocks(news_text, name_to_code):
    """뉴스 목록에서 한국 시장(코스피/코스닥)에 상장된 시간외/공시 특징주 종목만 AI로 1차 추출 후 매핑 검증합니다."""
    if not GEMINI_API_KEY:
        print("Gemini API 키 미설정으로 종목 추출을 건너뜁니다.")
        return []

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-lite-latest')

    prompt = f"""당신은 한국 주식 마켓 분석가입니다.
아래 뉴스 헤드라인 목록을 바탕으로 오늘 장마감 후 시간외 거래 및 공시 등으로 급등하거나 호재가 발생해 주목받은 **대한민국 국내 증시(코스피/코스닥) 상장 기업**의 종목명만 추출해 주세요.

[장 마감 후 시간외 거래 및 공시 뉴스 목록]
{news_text}

[수행 지침]
1. 반드시 한국 증시(코스피, 코스닥)에 상장된 실제 한국 기업이어야 합니다.
2. 해외 기업(예: IBM, HPE, 애플, 테슬라, 엔비디아 등)은 절대 추출하지 마세요.
3. 지주사나 우선주 등도 상장사라면 포함할 수 있습니다. (예: 삼성전자, 안랩 등)
4. 뉴스 내용 상에서 오늘 장마감 후 시간외 거래 혹은 장마감 공시와 직접적으로 관련된 종목이어야 합니다.
5. 오직 JSON 문자열 배열 형식으로만 응답해야 합니다. 마크다운이나 기타 설명(예: ```json)은 절대 붙이지 마세요.

출력 예시:
["안랩", "에스바이오메딕스", "부국철강"]
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            clean_json = extract_json_from_text(response.text)
            extracted_names = json.loads(clean_json)
            
            # 2차 검증: krx_desc.json에 존재하는 종목인지 확인하여 해외 종목 유입 원천 차단
            valid_stocks = []
            for name in extracted_names:
                name_clean = name.strip()
                # 100% 매칭되는 국장 종목 탐색
                if name_clean in name_to_code:
                    valid_stocks.append({
                        "name": name_clean,
                        "code": name_to_code[name_clean]
                    })
                else:
                    # 공백이나 특수문자 제거 후 부분 일치 비교
                    matched = False
                    for k, v in name_to_code.items():
                        if k.replace(" ", "") == name_clean.replace(" ", ""):
                            valid_stocks.append({
                                "name": k,
                                "code": v
                            })
                            matched = True
                            break
                    if not matched:
                        print(f"국내 상장사 목록에 없음 (해외 주식 또는 비상장주 스킵): {name_clean}")

            # 최대 5개 종목만 추출하여 분석 과부하 방지
            return valid_stocks[:5]
        except Exception as e:
            print(f"특징주 종목명 추출 에러 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return []

POSITIVE_DIRECTION_KEYWORDS = ['급등', '폭등', '상승세', '강세', '매수세 집중', '반등', '급상승']
NEGATIVE_DIRECTION_KEYWORDS = ['급락', '폭락', '하락세', '약세', '매도세', '실망 매물', '투매', '급하락']


def reason_matches_direction(reason, change):
    """AI가 생성한 사유 텍스트의 방향성(상승/하락 뉘앙스)이 실제 시간외 등락률의
    부호와 모순되는지 검사합니다. 실측 검증 결과, 프롬프트로 '실제 부호와 일치시켜라'라고
    지시해도 모델이 뉴스 문맥(예: 수주 실패 악재)에 이끌려 실제로는 +6% 상승인 종목을
    '급락'으로 서술하는 등 모순된 문장을 만드는 사례가 있어, 코드 레벨의 방어 검증이 필요합니다.
    """
    if change is None or not reason:
        return True
    has_positive = any(kw in reason for kw in POSITIVE_DIRECTION_KEYWORDS)
    has_negative = any(kw in reason for kw in NEGATIVE_DIRECTION_KEYWORDS)
    if change > 0 and has_negative and not has_positive:
        return False
    if change < 0 and has_positive and not has_negative:
        return False
    return True


def build_after_stocks_context(after_market_stocks_info):
    """시간외 특징주 정보를 프롬프트용 텍스트로 변환합니다.

    'overtime_price'/'overtime_change'는 네이버 실시간 API에서 조회한 실제
    체결 데이터이며, AI는 이 수치를 그대로 인용해야 하고 임의로 등락률을
    추정해서는 안 됩니다.
    """
    lines = []
    for s in after_market_stocks_info:
        change = s.get('overtime_change')
        price = s.get('overtime_price')
        real_data = f"[실제 시간외 단일가: {price:,}원 / 정규장 종가 대비 {change:+.2f}%]" if change is not None else ""
        lines.append(f"- {s['name']}({s['code']}) {real_data}: {s.get('raw_info', '')}")
    return "\n".join(lines)


def generate_kr_bull_perspective(today_stocks, after_market_stocks_info):
    """오늘 정규장 주도주와 시간외 종목 정보를 토대로 황소(낙관적) 관점의 분석 리포트를 생성합니다."""
    if not GEMINI_API_KEY:
        return "Gemini API 키 미설정"

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-lite-latest')

    stocks_str = ""
    for s in today_stocks:
        stocks_str += f"- {s.get('name')}({s.get('code')}): 등락률 {s.get('change_rate')}%, 테마: {s.get('keywordName')}, 사유: {s.get('reason')}\n"

    after_stocks_str = build_after_stocks_context(after_market_stocks_info)

    prompt = f"""당신은 한국 주식 시장의 전문 황소(Bull, 극도로 낙관적이고 공격적인 투자 성향) 에이전트입니다.
오늘 장 마감 후 취합된 국내 정규장 주도주 정보와 시간외/공시 특징주의 실시간 수집 정보를 바탕으로, 시장의 상승 동력과 내일 아침 공략해야 할 매수 전략을 강력하고 긍정적인 관점에서 작성해 주세요.

[오늘 정규장 급등 주도주 목록]
{stocks_str if stocks_str else "오늘 급등 필터링에 걸린 종목이 없습니다."}

[장 마감 후 시간외 거래 및 공시 특징주 상세 정보]
{after_stocks_str if after_stocks_str else "시간외 특징주 정보가 없습니다."}

[작성 요구사항]
1. 오늘 주도 테마들의 상승 연속성과 신규 테마들의 강력한 모멘텀을 강조하세요.
2. 시간외 종목들의 호재 분석을 극대화하여 내일 갭상승 및 추가 급등 가능성을 긍정적으로 분석하세요.
3. 내일 아침 시초가 공략 시 가장 수익률이 기대되는 핵심 테마 및 종목들을 선정하여 낙관적인 매수 시나리오를 제시하세요.
4. 문체는 정중하고 힘차며, 한국어 경어체로 자유 형식의 텍스트(300~500자 내외)로 작성해 주세요.
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Bull 에이전트 생성 중 에러 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return "낙관론 분석 실패"

def generate_kr_bear_perspective(today_stocks, after_market_stocks_info):
    """오늘 정규장 주도주와 시간외 종목 정보를 토대로 곰(보수적) 관점의 분석 리포트를 생성합니다."""
    if not GEMINI_API_KEY:
        return "Gemini API 키 미설정"

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-lite-latest')

    stocks_str = ""
    for s in today_stocks:
        stocks_str += f"- {s.get('name')}({s.get('code')}): 등락률 {s.get('change_rate')}%, 테마: {s.get('keywordName')}, 사유: {s.get('reason')}\n"

    after_stocks_str = build_after_stocks_context(after_market_stocks_info)

    prompt = f"""당신은 한국 주식 시장의 전문 곰(Bear, 극도로 보수적이고 리스크 중심의 투자 성향) 에이전트입니다.
오늘 장 마감 후 취합된 국내 정규장 주도주 정보와 시간외/공시 특징주의 실시간 수집 정보를 바탕으로, 시장의 하락 리스크와 내일 아침 조심해야 할 함정들을 보수적인 관점에서 작성해 주세요.

[오늘 정규장 급등 주도주 목록]
{stocks_str if stocks_str else "오늘 급등 필터링에 걸린 종목이 없습니다."}

[장 마감 후 시간외 거래 및 공시 특징주 상세 정보]
{after_stocks_str if after_stocks_str else "시간외 특징주 정보가 없습니다."}

[작성 요구사항]
1. 오늘 주도 테마들의 단기 과열 가능성, 재료 소멸, 상투 잡기 위험을 강력히 지적하세요.
2. 시간외 종목들의 반짝 급등 후 장중 '시가 고가, 종가 저가' 음봉 전환 리스크(설거지 무덤)를 강조하세요.
3. 시장의 대외 매크로 불안 요인, 수급 이탈 신호 등 내일 매매 시 피해야 할 지점들을 냉정하게 짚어내세요.
4. 문체는 정중하고 차분하며, 한국어 경어체로 자유 형식의 텍스트(300~500자 내외)로 작성해 주세요.
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Bear 에이전트 생성 중 에러 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return "비관론 분석 실패"

def analyze_kr_market_moderator(today_stocks, after_market_stocks_info, bull_opinion, bear_opinion):
    """황소와 곰의 의견을 융합하고, 수집된 시간외 종목들의 최종 마감 리포트를 조율하여 JSON을 생성합니다."""
    if not GEMINI_API_KEY:
        return {
            "top_sectors": [],
            "after_market_stocks": [],
            "market_summary": "Gemini API 키 미설정으로 요약이 누락되었습니다."
        }

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-lite-latest')

    stocks_str = ""
    for s in today_stocks:
        stocks_str += f"- {s.get('name')}({s.get('code')}): 등락률 {s.get('change_rate')}%, 테마: {s.get('keywordName')}, 사유: {s.get('reason')}\n"

    after_stocks_str = build_after_stocks_context(after_market_stocks_info)

    prompt = f"""당신은 한국 주식 마켓 분석팀의 수석 조정자(Moderator)이자 최종 의사결정자입니다.
상반된 성향을 가진 황소(Bull) 에이전트와 곰(Bear) 에이전트의 시장 관점 보고서, 그리고 오늘 장마감 후의 실제 특징주 데이터를 바탕으로 투자자들이 참고할 최종 국장 마감 리포트와 시간외 종목 분석을 작성해 주세요.

[오늘 정규장 급등 주도주 목록]
{stocks_str if stocks_str else "오늘 급등 필터링에 걸린 종목이 없습니다."}

[장 마감 후 시간외 거래 및 공시 특징주 수집 데이터]
{after_stocks_str if after_stocks_str else "시간외 특징주 정보가 없습니다."}

[황소 에이전트의 낙관 보고서]
{bull_opinion}

[곰 에이전트의 비관 보고서]
{bear_opinion}

[수행 지침]
1. 황소의 공격적인 아이디어와 곰의 리스크 관리 조언을 합리적으로 절충하여 데이트레이더를 위한 최적의 조율안을 'market_summary'에 녹여내세요. (공백 제외 150~200자 내외로 상세하게 작성)
2. 오늘 가장 강했던 핵심 주도 테마들을 분석하여 2~3개 선정하고, 'top_sectors'에 넣어주세요.
3. 시간외 특징주 목록인 'after_market_stocks'를 완성해 주세요.
   - 각 종목마다 이미 '[실제 시간외 단일가: N원 / 정규장 종가 대비 +-N.NN%]' 형태로 실제 체결 데이터가 주어져 있습니다. 이 등락률의 부호(상승/하락)와 절대 일치하는 방향으로 'reason'을 작성하세요. 등락률 수치 자체는 절대 새로 추정하거나 다른 값으로 바꾸지 마세요 (별도 필드로 시스템이 그대로 사용합니다).
   - 각 종목의 'reason'은 네이버 종목토론방 실시간 글 제목과 최신 3일 내의 구글 뉴스에서 공통적으로 언급되는 실시간 실제 상승/하락 원인을 한 문장(50자 내외)으로 압축하여 명확하고 정확하게 채워주세요. (구글 뉴스에 과거 날짜 왜곡이 있더라도 네이버 토론방의 실시간 호재/악재 글들을 적극 조율 및 필터링하여 오늘자 진짜 사유로 만들어야 합니다.)
   - 절대 우리나라에 상장되지 않은 종목은 포함해서는 안 됩니다.
4. 오직 JSON 형식으로만 응답해야 합니다. 마크다운 기호(```json 등)나 다른 설명 텍스트를 절대 붙이지 마세요.

[출력 JSON 형식]
{{
  "top_sectors": [
    {{
      "sector": "핵심 테마명",
      "reason": "테마 상승 배경 및 내일 전망 요약 (1문장)"
    }}
  ],
  "after_market_stocks": [
    {{
      "name": "종목명",
      "code": "6자리 종목코드",
      "reason": "[핵심키워드] 구글 뉴스 및 종목토론방을 종합 분석한, 실제 등락 방향과 일치하는 정확한 오늘의 원인 (1문장)"
    }}
  ],
  "market_summary": "황소와 곰의 의견을 융합한, 내일 아침 집중해야 할 공략 포인트 및 리스크 관리 가이드라인 리포트"
}}
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            clean_json = extract_json_from_text(response.text)
            result = json.loads(clean_json)
            result["market_summary"] = trim_to_length(result.get("market_summary", ""), 220)
            return result
        except Exception as e:
            print(f"Moderator 에이전트 최종 분석 중 에러 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print("5초 후 재시도합니다...")
                time.sleep(5)
            else:
                import traceback
                traceback.print_exc()
                return {
                    "top_sectors": [{"sector": "조율 실패", "reason": "최종 리포트 생성에 실패했습니다."}],
                    "after_market_stocks": [],
                    "market_summary": "토론 내용 융합 중 기술적 에이전트 충돌이 발생했습니다. 다시 시도해 주세요."
                }

def main():
    print("====================================")
    print(" [오후 9시] 국내장 및 시간외/공시 분석 파이프라인 가동 (AI 토론형)")
    print("====================================")
    
    # 백필(backfill) 실행 시 update_us_macro.py가 대상 날짜를 인자로 넘겨줍니다.
    # 인자가 없으면(평시 9시 정시 실행) 오늘 날짜를 그대로 사용합니다.
    if len(sys.argv) > 1:
        today_formatted = sys.argv[1]
        print(f"[Backfill 모드] 지정된 대상 날짜로 실행합니다: {today_formatted}")
    else:
        today_formatted = datetime.now().strftime("%Y-%m-%d")
    print(f"대상 날짜: {today_formatted}")
    
    # 0. 국장 상장 정보 krx_desc.json 로드
    print("국내 상장 종목 정보 로딩 중...")
    name_to_code = load_krx_desc()
    print(f"로드된 한국 상장사 수: {len(name_to_code)}개")
    
    # 1. 오늘 정규장 데이터 로드
    today_stocks = load_today_krx_shadowing(today_formatted)
    print(f"오늘 정규장 주도주 수: {len(today_stocks)}개")
    
    # 2. 장외 시간외 뉴스 및 공시 뉴스 수집
    print("시간외 특징주 및 공시 뉴스 수집 중...")
    news_queries = [
        "코스피 시간외 특징주",
        "코스닥 시간외 특징주",
        "장마감 공시 특징주",
        "시간외 특징주",
        "공시 특징주"
    ]
    news_lines = []
    for query in news_queries:
        news_data = get_google_news_rss(query, limit=5)
        if news_data:
            news_lines.append(news_data)
        time.sleep(1) # API Rate Limit 예방을 위해 1초 대기
    combined_news = "\n".join(news_lines)
    
    # 3. 뉴스 텍스트에서 국장에 상장된 특징주 종목 추출 및 검증
    print("Gemini AI를 사용하여 국장 시간외/공시 특징주 종목 1차 추출 중...")
    candidate_stocks = extract_kr_after_market_stocks(combined_news, name_to_code)
    print(f"추출된 검증 완료 국장 종목: {[s['name'] for s in candidate_stocks]}")

    # 3.5 [신규] 뉴스 기반 후보 종목들의 실제 시간외 단일가 체결 데이터를 네이버 실시간 API로 검증
    #     실제 시간외 거래 체결이 없는 종목(뉴스는 있으나 시간외 거래는 없었던 경우)은 제외합니다.
    #     이렇게 하면 AI가 등락률을 추정해서 지어내는 대신 실제 체결 데이터를 사용하게 됩니다.
    after_market_stocks = []
    for s in candidate_stocks:
        overtime_info = get_overtime_price_info(s['code'])
        time.sleep(0.5)
        if overtime_info is None:
            print(f"[Filter] 실제 시간외 체결 데이터 없음으로 제외: {s['name']}({s['code']})")
            continue
        s['overtime_price'] = overtime_info['price']
        s['overtime_change'] = overtime_info['change']
        after_market_stocks.append(s)
    print(f"실제 시간외 체결 데이터로 검증된 종목: {[s['name'] for s in after_market_stocks]}")

    # 4. 추출된 특징주들에 대해 개별 실시간 여론 및 뉴스 수집 (3일 이내 기사 + 네이버 종목 토론실)
    after_market_stocks_info = []
    for s in after_market_stocks:
        print(f"[{s['name']}({s['code']})] 실시간 뉴스 및 네이버 토론방 수집 중...")
        raw_info = get_refined_stock_news_and_board(s['name'], s['code'])
        s['raw_info'] = raw_info
        after_market_stocks_info.append(s)
        time.sleep(2) # 네이버 금융 차단 방지 및 API Rate Limit 예방 대기

    # 5. AI 토론 프로세스 가동 (황소 vs 곰 -> 모더레이터)
    print("황소(Bull) 에이전트 의견 작성 중...")
    bull_opinion = generate_kr_bull_perspective(today_stocks, after_market_stocks_info)
    time.sleep(2) # API Rate Limit 대기
    
    print("곰(Bear) 에이전트 의견 작성 중...")
    bear_opinion = generate_kr_bear_perspective(today_stocks, after_market_stocks_info)
    time.sleep(2) # API Rate Limit 대기
    
    print("수석 조정자(Moderator) 최종 조율 및 마감 리포트 작성 중...")
    analysis_result = analyze_kr_market_moderator(today_stocks, after_market_stocks_info, bull_opinion, bear_opinion)

    # 5.5 [신규] AI가 생성한 'reason' 텍스트는 채택하되, 등락률/가격은 항상 3.5단계에서
    #      조회한 실제 시간외 체결 데이터로 덮어써서 AI의 추정치가 최종 결과에 섞이지 않도록 합니다.
    overtime_lookup = {s['code']: s for s in after_market_stocks_info}
    ai_reason_lookup = {
        item.get("code"): item.get("reason", "")
        for item in analysis_result.get("after_market_stocks", [])
        if item.get("code")
    }
    final_after_market_stocks = []
    for code, s in overtime_lookup.items():
        change = s.get('overtime_change')
        reason = ai_reason_lookup.get(code)
        if not reason or not reason_matches_direction(reason, change):
            direction_word = "상승" if (change or 0) >= 0 else "하락"
            print(f"[Filter] AI 사유가 실제 등락 방향과 모순되어 안전한 기본 문구로 대체: {s['name']}({code}) - {reason}")
            reason = f"시간외 단일가 기준 정규장 종가 대비 {direction_word} {abs(change):.2f}% 기록 (세부 사유 자동 요약 실패로 방향성 정보만 표기합니다)"
        final_after_market_stocks.append({
            "name": s['name'],
            "code": code,
            "price": s.get('overtime_price'),
            "change": change,
            "reason": reason
        })
    # 등락률(절대값) 기준 내림차순 정렬 - 변동성이 큰 종목을 상단에 노출
    final_after_market_stocks.sort(key=lambda x: abs(x.get('change') or 0), reverse=True)
    analysis_result["after_market_stocks"] = final_after_market_stocks

    # 6. 독립적인 daily_briefing.json 파일 관리
    briefing_file = 'public/data/daily_briefing.json'
    
    # 기존 파일 로드하여 us_data 보존 시도
    existing_us_data = None
    existing_last_updated_us = ""
    if os.path.exists(briefing_file):
        try:
            with open(briefing_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                existing_us_data = existing_data.get("us_data")
                existing_last_updated_us = existing_data.get("last_updated_us", "")
        except Exception as e:
            print(f"기존 daily_briefing.json 로드 중 오류 (무시하고 새로 생성): {e}")

    briefing_data = {
        "last_updated_kr": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "last_updated_us": existing_last_updated_us,
        "kr_data": {
            "date": today_formatted,
            "top_sectors": analysis_result.get("top_sectors", []),
            "after_market_stocks": analysis_result.get("after_market_stocks", []),
            "market_summary": analysis_result.get("market_summary", "")
        },
        "us_data": existing_us_data  # 기존 미국장 브리핑 데이터를 보존합니다.
    }
    
    os.makedirs(os.path.dirname(briefing_file), exist_ok=True)
    with open(briefing_file, 'w', encoding='utf-8') as f:
        json.dump(briefing_data, f, ensure_ascii=False, indent=2)
        
    print(f"국내 마감 종합 리포트 저장 성공! ({briefing_file})")

if __name__ == "__main__":
    main()
