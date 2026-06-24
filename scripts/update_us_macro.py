import os
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import yfinance as yf
import google.generativeai as genai
from dotenv import load_dotenv
import subprocess

# 환경변수 로드
load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def get_yfinance_data(ticker_symbol):
    """yfinance를 활용해 최근 가격과 전일 대비 등락률을 안전하게 구합니다."""
    try:
        ticker = yf.Ticker(ticker_symbol)
        df = ticker.history(period="5d")
        if df.empty or len(df) < 2:
            return {"price": 0.0, "change": 0.0, "status": "No Data"}
        
        last_row = df.iloc[-1]
        prev_row = df.iloc[-2]
        
        price = last_row["Close"]
        prev_price = prev_row["Close"]
        
        if prev_price == 0:
            change_rate = 0.0
        else:
            change_rate = ((price - prev_price) / prev_price) * 100
            
        return {
            "price": round(float(price), 2),
            "change": round(float(change_rate), 2),
            "status": "Success"
        }
    except Exception as e:
        print(f"yfinance 수집 실패 ({ticker_symbol}): {e}")
        return {"price": 0.0, "change": 0.0, "status": f"Error: {str(e)}"}

def get_google_news_rss(query_str, limit=5):
    """구글 뉴스 RSS 피드로부터 뉴스 목록을 취합합니다."""
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
                if ' - ' in title:
                    title = title.rsplit(' - ', 1)[0]
                titles.append(title)
    except Exception as e:
        print(f"뉴스 수집 실패 ({query_str}): {e}")
    return " / ".join(titles)

def is_risky_stock(name, code, reason):
    """상장폐지 우려 종목이거나 1,000원 미만의 동전주인지 검사합니다."""
    # 1. 관리종목, 정리매매, 상장폐지 등 리스크 키워드 검사
    risky_keywords = ["관리", "정리매매", "상장폐지", "환기", "락인", "상폐", "상장 폐지"]
    for kw in risky_keywords:
        if kw in name or kw in reason:
            print(f"[Filter] 리스크 키워드 포착으로 제외: {name}({code}) - 사유: {reason}")
            return True
            
    # 2. 동전주 검사 (주가가 1000원 미만인 경우)
    try:
        history_file = 'src/data/shadowing_real_history.json'
        if os.path.exists(history_file):
            with open(history_file, 'r', encoding='utf-8') as f:
                history_data = json.load(f)
                matching_records = [r for r in history_data if r.get('code') == code]
                if matching_records:
                    latest_record = matching_records[-1]
                    close_price = latest_record.get('close_price', 0)
                    if close_price > 0 and close_price < 1000:
                        print(f"[Filter] 동전주(1000원 미만) 제외: {name}({code}) 종가 {close_price}원")
                        return True
    except Exception as e:
        print(f"동전주 필터링 검사 중 오류: {e}")
    return False

def generate_bull_perspective(kr_data, us_market_info, us_news, model):
    """황소(Bull) 에이전트: 시장의 긍정적인 면과 상승 모멘텀을 극대화하여 낙관적인 시나리오를 구상합니다."""
    kr_str = f"날짜: {kr_data.get('date')}\n"
    kr_str += "--- 주도 테마 ---\n"
    for t in kr_data.get("top_sectors", []):
        kr_str += f"- {t.get('sector')}: {t.get('reason')}\n"
    kr_str += "\n--- 시간외/공시 포착 종목 (고위험주 제외됨) ---\n"
    for a in kr_data.get("after_market_stocks", []):
        code = a.get('code', '')
        name = a.get('name', '')
        reason = a.get('reason', '')
        if not is_risky_stock(name, code, reason):
            kr_str += f"- {name}({code}): {a.get('change_rate')} - {reason}\n"
            
    us_str = json.dumps(us_market_info, ensure_ascii=False, indent=2)
    
    prompt = f"""당신은 시장의 긍정적인 면(성장 동력, 유동성, 재료, 호재 공시 등)을 적극적으로 발굴하는 황소(Bull) 관점의 수석 투자전략가입니다.
아래 데이터를 보고 오늘 한국 증시 개장 시 시초가 상승 요인과 개장 직후 강하게 상승 랠리를 보여줄 주도 테마/종목의 시나리오를 최대한 긍정적이고 설득력 있게 작성하세요.

[어제자 한국 증시 요약 데이터]
{kr_str}

[오늘 아침 글로벌 금융 지표 데이터]
{us_str}

[오늘 아침 미국 증시 뉴스 헤드라인]
{us_news}

작성 규칙:
- 부정적인 리스크 요소는 모두 최소화하고, 왜 오늘 매수세가 붙을 수 있는지 긍정적인 상승 전술 위주로 한글 150자 내외로 상세히 논술하세요.
- 마크다운 기호 없이 순수 텍스트로만 설명하세요.
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[Bull Agent] 에러 발생 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                return "황소 에이전트 분석 불가 (한도 초과)"

def generate_bear_perspective(kr_data, us_market_info, us_news, model):
    """곰(Bear) 에이전트: 시장의 하방 압력, 고평가 부담, 매크로 리스크를 극대화하여 보수적인 시나리오를 구상합니다."""
    kr_str = f"날짜: {kr_data.get('date')}\n"
    kr_str += "--- 주도 테마 ---\n"
    for t in kr_data.get("top_sectors", []):
        kr_str += f"- {t.get('sector')}: {t.get('reason')}\n"
    kr_str += "\n--- 시간외/공시 포착 종목 (고위험주 제외됨) ---\n"
    for a in kr_data.get("after_market_stocks", []):
        code = a.get('code', '')
        name = a.get('name', '')
        reason = a.get('reason', '')
        if not is_risky_stock(name, code, reason):
            kr_str += f"- {name}({code}): {a.get('change_rate')} - {reason}\n"
            
    us_str = json.dumps(us_market_info, ensure_ascii=False, indent=2)
    
    prompt = f"""당신은 시장의 리스크(고평가 부담, 긴축, 금리 인상 우려, 환율 급등, 차익 실현 투매 등)를 경고하는 곰(Bear) 관점의 보수적인 위험관리 전문가입니다.
아래 데이터를 보고 오늘 한국 증시 개장 시 시초가 하락/급락 위험 및 장중 투매가 출현할 수 있는 리스크 요인과 보수적인 대기 전술 시나리오를 최대한 경계심을 담아 작성하세요.

[어제자 한국 증시 요약 데이터]
{kr_str}

[오늘 아침 글로벌 금융 지표 데이터]
{us_str}

[오늘 아침 미국 증시 뉴스 헤드라인]
{us_news}

작성 규칙:
- 낙관적인 상승 요소는 배제하고, 데이트레이더가 오늘 개장 직후 겪을 수 있는 위험 요소와 보수적인 현금 확보/대응 가이드 위주로 한글 150자 내외로 상세히 논술하세요.
- 마크다운 기호 없이 순수 텍스트로만 설명하세요.
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[Bear Agent] 에러 발생 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                return "곰 에이전트 분석 불가 (한도 초과)"

def generate_morning_briefing(kr_data, us_market_info, us_news):
    """수석 모더레이터(Moderator) 에이전트: 황소와 곰의 의견 대립을 중재 및 조율하여 최종 데이트레이딩 시나리오와 Watchlist를 JSON으로 도출합니다."""
    if not GEMINI_API_KEY:
        print("Gemini API 키가 없습니다.")
        return {
            "us_market_summary": "Gemini API 키 미설정으로 아침 브리핑 요약이 누락되었습니다.",
            "today_strategy": "API 키를 확인해 주세요.",
            "watchlist": []
        }
        
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-flash-lite-latest')
        
        # 1. 황소 에이전트 관점 도출
        print("[AI 토론] 황소 에이전트가 시장 상승 모멘텀을 분석 중...")
        bull_opinion = generate_bull_perspective(kr_data, us_market_info, us_news, model)
        print(f">> 황소 의견 수집 완료: {bull_opinion[:60]}...")
        time.sleep(2)  # 단기간 API 과부하 분산 딜레이
        
        # 2. 곰 에이전트 관점 도출
        print("[AI 토론] 곰 에이전트가 시장 하방 리스크를 분석 중...")
        bear_opinion = generate_bear_perspective(kr_data, us_market_info, us_news, model)
        print(f">> 곰 의견 수집 완료: {bear_opinion[:60]}...")
        time.sleep(2)  # 단기간 API 과부하 분산 딜레이
        
        # 3. 수석 조정자(Moderator) 분석 및 최종 리포트 합산
        print("[AI 토론] 수석 조정자 에이전트가 토론 요약 및 최종 매매 시나리오를 구성 중...")
        
        kr_str = f"날짜: {kr_data.get('date')}\n"
        kr_str += "--- 주도 테마 ---\n"
        for t in kr_data.get("top_sectors", []):
            kr_str += f"- {t.get('sector')}: {t.get('reason')}\n"
        kr_str += "\n--- 시간외/공시 포착 종목 (고위험주 제외됨) ---\n"
        for a in kr_data.get("after_market_stocks", []):
            code = a.get('code', '')
            name = a.get('name', '')
            reason = a.get('reason', '')
            if not is_risky_stock(name, code, reason):
                kr_str += f"- {name}({code}): {a.get('change_rate')} - {reason}\n"
        kr_str += f"\n국내 마켓 요약: {kr_data.get('market_summary')}"
        
        us_str = json.dumps(us_market_info, ensure_ascii=False, indent=2)
        
        prompt = f"""당신은 시장을 냉철하고 다각도로 분석하여 최종 데이트레이더를 위한 현실적인 대응 시나리오를 조율하는 수석 펀드매니저이자 중립 모더레이터입니다.
상승 모멘텀을 강조한 황소 에이전트의 관점과 리스크를 경고한 곰 에이전트의 관점을 냉정하게 비교하여 오늘 개장(오전 9시) 직전 최고의 매매 전략과 관심 종목을 도출하세요.

[황소 에이전트의 낙관론 의견]
{bull_opinion}

[곰 에이전트의 비관론 의견]
{bear_opinion}

[오늘 아침 글로벌 금융 지표 데이터]
{us_str}

[오늘 아침 미국 증시 뉴스 헤드라인]
{us_news}

[어제자 한국 증시 요약 데이터]
{kr_str}

위 토론 및 데이터를 토대로 분석을 수행하고 반드시 아래 JSON 형식으로만 응답해 주세요. (JSON 이외의 텍스트나 마크다운 기호 금지)

* 중요 지침: 최종 오늘의 데이트레이딩 관심종목(watchlist)을 선정할 때, 주가 1000원 미만의 초저가 동전주나 상장폐지, 정리매매, 관리종목 등 고위험 요인이 있는 종목은 절대 포함하지 마십시오. 오로지 재료와 수급이 튼튼하고 안전성이 담보된 우량 주도주 위주로만 추천 목록을 구성해야 합니다.

[출력 JSON 형식]
{{
  "us_market_summary": "새벽 미국 증시 마감 상황 및 글로벌 주요 선물시장(금, 원유, 비트코인 등)의 특이점 요약 (공백 제외 150자 내외)",
  "today_strategy": "황소와 곰의 의견을 현실적으로 절충하여, 오늘 아침 한국 증시 개장 시 시초가 방향(갭상승/갭하락 예상)과 장중 어떤 자금 흐름을 주의 깊게 보아야 하는지 대응 전략 요약 (150자 내외)",
  "watchlist": [
    {{
      "name": "오늘 시초가~장중 공략 가능한 데이트레이딩 관심 종목명 (어제 주도주 또는 시간외 종목 중 선정)",
      "code": "종목코드",
      "reason": "이 종목을 공략해야 하는 핵심 시나리오 및 기술적/재료적 관점 설명 (1문장, 50자 내외)"
    }},
    {{
      "name": "종목명",
      "code": "종목코드",
      "reason": "선정 사유"
    }}
  ]
}}
"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
                return json.loads(clean_json)
            except Exception as e:
                print(f"[Moderator Agent] 에러 발생 (시도 {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(5)
                else:
                    raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Gemini 아침 브리핑 최종 실패: {e}")
        return {
            "us_market_summary": "글로벌 금융 시장 요약 로딩에 실패했습니다.",
            "today_strategy": "장 시작 전 뉴스 및 수급 흐름을 직접 체크하시기 바랍니다.",
            "watchlist": []
        }

def get_last_business_day(ref_date):
    """주말(토, 일)을 고려하여 기준일 직전 최근 영업일 날짜를 YYYY-MM-DD 형식으로 구합니다."""
    # 오늘이 월요일(0)이면 직전 영업일은 금요일(오늘 - 3일)
    # 오늘이 일요일(6)이면 직전 영업일은 금요일(오늘 - 2일)
    # 오늘이 토요일(5)이면 직전 영업일은 금요일(오늘 - 1일)
    # 그 외 평일은 어제(오늘 - 1일)
    weekday = ref_date.weekday()
    if weekday == 0:  # 월요일
        return (ref_date - timedelta(days=3)).strftime("%Y-%m-%d")
    elif weekday == 6:  # 일요일
        return (ref_date - timedelta(days=2)).strftime("%Y-%m-%d")
    elif weekday == 5:  # 토요일
        return (ref_date - timedelta(days=1)).strftime("%Y-%m-%d")
    else:  # 화~금요일
        return (ref_date - timedelta(days=1)).strftime("%Y-%m-%d")

def check_and_backfill_kr_data():
    """어제 저녁 분석(KR) 데이터가 없거나 오래되었을 경우, 자동으로 저녁 분석 스크립트를 먼저 실행합니다."""
    briefing_file = 'public/data/daily_briefing.json'
    today = datetime.now()
    expected_kr_date = get_last_business_day(today)
    
    need_backfill = False
    
    # 1. 파일 자체가 없는 경우
    if not os.path.exists(briefing_file):
        print("[Backfill] daily_briefing.json 파일이 존재하지 않아 백필을 가동합니다.")
        need_backfill = True
    else:
        # 2. 파일은 있으나 kr_data의 날짜가 최근 영업일과 다른 경우 (어제 오후 9시 수집 누락)
        try:
            with open(briefing_file, 'r', encoding='utf-8') as f:
                full_data = json.load(f)
                kr_date = full_data.get("kr_data", {}).get("date", "")
                if kr_date != expected_kr_date:
                    print(f"[Backfill] 어제자 취합 날짜 불일치 포착 (예상: {expected_kr_date} / 실제: {kr_date}). 백필을 가동합니다.")
                    need_backfill = True
        except Exception as e:
            print(f"[Backfill] 파일 읽기 에러로 백필을 안전하게 가동합니다: {e}")
            need_backfill = True
            
    if need_backfill:
        print("[Backfill] 9:00 PM 국내장/시간외 분석 스크립트(update_kr_briefing.py)를 자동 실행합니다...")
        try:
            # subprocess를 사용해 동기적으로 국내장 분석 스크립트 실행
            result = subprocess.run(["py", "scripts/update_kr_briefing.py"], capture_output=True, text=True, check=True)
            print("[Backfill] 실행 성공!")
            print(result.stdout)
        except Exception as e:
            print(f"[Backfill] 백필 스크립트 실행 실패: {e}")

def main():
    print("====================================")
    print(" [오전 8시] 글로벌 선물 및 미국장 시황 분석 파이프라인 가동 ")
    print("====================================")
    
    # [백필 엔진 작동] 어제 저녁 수집 데이터를 검사하고 누락되었으면 먼저 갱신합니다.
    check_and_backfill_kr_data()
    
    # 1. 기존 저녁 국내 분석 자료 로드
    briefing_file = 'public/data/daily_briefing.json'
    if not os.path.exists(briefing_file):
        kr_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "top_sectors": [],
            "after_market_stocks": [],
            "market_summary": "어제자 국내 분석 데이터가 존재하지 않습니다."
        }
    else:
        with open(briefing_file, 'r', encoding='utf-8') as f:
            full_data = json.load(f)
            kr_data = full_data.get("kr_data", {})
            
    # 2. 글로벌 금융 지표 & 선물 데이터 수집
    print("yfinance로부터 글로벌 금융 시장 데이터 수집 중...")
    
    sp500 = get_yfinance_data("^GSPC")
    # [수정됨] Nasdaq100(^NDX) 대신 Nasdaq 종합지수(^IXIC)를 수집합니다.
    nasdaq = get_yfinance_data("^IXIC")
    dow = get_yfinance_data("^DJI")
    sox = get_yfinance_data("^SOX")
    
    nasdaq_fut = get_yfinance_data("NQ=F")
    gold = get_yfinance_data("GC=F")
    oil = get_yfinance_data("CL=F")
    bitcoin = get_yfinance_data("BTC-USD")
    usdjpy = get_yfinance_data("USDJPY=X")
    eurusd = get_yfinance_data("EURUSD=X")
    
    usdkrw = get_yfinance_data("USDKRW=X")
    ewy = get_yfinance_data("EWY")
    
    # [추가됨] 미국 시가총액 상위 10대 대형주 정보 수집
    print("미국 시총 상위 10대 대형주 종가 수집 중...")
    LARGE_CAPS = {
        "Apple (AAPL)": "AAPL",
        "Microsoft (MSFT)": "MSFT",
        "NVIDIA (NVDA)": "NVDA",
        "Alphabet (GOOGL)": "GOOGL",
        "Amazon (AMZN)": "AMZN",
        "Meta (META)": "META",
        "Berkshire (BRK-B)": "BRK-B",
        "Eli Lilly (LLY)": "LLY",
        "Broadcom (AVGO)": "AVGO",
        "Tesla (TSLA)": "TSLA"
    }
    large_caps_data = {}
    for name, ticker in LARGE_CAPS.items():
        large_caps_data[name] = get_yfinance_data(ticker)
        time.sleep(0.1) # 과도한 API 호출 방지
    
    us_market_info = {
        "indices": {
            "S&P500": sp500,
            "Nasdaq": nasdaq,
            "Dow30": dow,
            "Semiconductor(SOX)": sox
        },
        "futures": {
            "Nasdaq_100_Futures": nasdaq_fut,
            "Gold_Futures": gold,
            "Crude_Oil_Futures": oil,
            "Bitcoin_USD": bitcoin,
            "USD_JPY": usdjpy,
            "EUR_USD": eurusd
        },
        "macro": {
            "USD_KRW": usdkrw,
            "MSCI_South_Korea_ETF(EWY)": ewy
        },
        "large_caps": large_caps_data
    }
    
    # 3. 미국 시황 관련 아침 뉴스 취합
    print("미국 마감 뉴스 요약 수집 중...")
    us_news = get_google_news_rss("미국 증시 마감", limit=5)
    
    # 4. Gemini 종합 아침 시나리오 생성
    print("글로벌 매크로 시나리오 생성 중 (AI 연산)...")
    us_analysis = generate_morning_briefing(kr_data, us_market_info, us_news)
    
    # 5. daily_briefing.json에 통합 업데이트
    # 파일이 백필되었을 수 있으므로 기존 파일에서 갱신 시간을 다시 가져옵니다.
    last_kr_time = datetime.now().strftime("%Y-%m-%d 21:00:00")
    if os.path.exists(briefing_file):
        try:
            with open(briefing_file, 'r', encoding='utf-8') as f:
                temp_data = json.load(f)
                last_kr_time = temp_data.get("last_updated_kr", last_kr_time)
                kr_data = temp_data.get("kr_data", kr_data)  # 최신 백필된 kr_data로 동기화
        except:
            pass

    full_briefing = {
        "last_updated_kr": last_kr_time,
        "last_updated_us": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "kr_data": kr_data,
        "us_data": {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "indices": us_market_info["indices"],
            "futures": us_market_info["futures"],
            "macro": us_market_info["macro"],
            "large_caps": us_market_info["large_caps"],
            "us_market_summary": us_analysis.get("us_market_summary", ""),
            "today_strategy": us_analysis.get("today_strategy", ""),
            "watchlist": us_analysis.get("watchlist", [])
        }
    }
    
    with open(briefing_file, 'w', encoding='utf-8') as f:
        json.dump(full_briefing, f, ensure_ascii=False, indent=2)
        
    print(f"아침 글로벌 브리핑 업데이트 완료! ({briefing_file})")

if __name__ == "__main__":
    main()
