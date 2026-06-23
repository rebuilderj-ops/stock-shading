import os
import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import yfinance as yf
import google.generativeai as genai
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def get_yfinance_data(ticker_symbol):
    """yfinance를 활용해 최근 가격과 전일 대비 등락률을 안전하게 구합니다."""
    try:
        ticker = yf.Ticker(ticker_symbol)
        # 최근 5일치 데이터를 불러와 마지막 2일치로 등락률 계산
        df = ticker.history(period="5d")
        if df.empty or len(df) < 2:
            return {"price": 0.0, "change": 0.0, "status": "No Data"}
        
        # 마지막 행(오늘 또는 최근 마감일)과 직전 행 비교
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

def generate_morning_briefing(kr_data, us_market_info, us_news):
    """Gemini API를 사용하여 어제 국내장 정보와 오늘 아침 미국/선물 지표를 종합 분석합니다."""
    if not GEMINI_API_KEY:
        print("Gemini API 키가 없습니다.")
        return {
            "us_market_summary": "Gemini API 키 미설정으로 아침 브리핑 요약이 누락되었습니다.",
            "today_strategy": "API 키를 확인해 주세요.",
            "watchlist": []
        }
        
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # 어제 한국장 데이터 보기 쉽게 포맷
        kr_str = f"날짜: {kr_data.get('date')}\n"
        kr_str += "--- 주도 테마 ---\n"
        for t in kr_data.get("top_sectors", []):
            kr_str += f"- {t.get('sector')}: {t.get('reason')}\n"
        kr_str += "\n--- 시간외/공시 포착 종목 ---\n"
        for a in kr_data.get("after_market_stocks", []):
            kr_str += f"- {a.get('name')}({a.get('code')}): {a.get('change_rate')} - {a.get('reason')}\n"
        kr_str += f"\n국내 마켓 요약: {kr_data.get('market_summary')}"
        
        # 미국/선물 데이터 포맷
        us_str = json.dumps(us_market_info, ensure_ascii=False, indent=2)
        
        prompt = f"""당신은 국내외 주식 시장의 거시 경제 흐름과 데이트레이딩 기법에 정통한 투자 전문가입니다.
어제 저녁 분석한 한국 시장 정보와 오늘 아침 마감된 미국장 지표, 글로벌 핵심 선물 지표들을 융합하여 오늘 개장(오전 9시) 직전 데이트레이더를 위한 최종 브리핑 리포트를 작성해 주세요.

[어제자 한국 증시 요약 데이터]
{kr_str}

[오늘 아침 글로벌 금융 지표 데이터]
{us_str}

[오늘 아침 미국 증시 뉴스 헤드라인]
{us_news}

위 글로벌 매크로와 선물 지표, 그리고 전날 국내장 및 시간외 상승 종목의 흐름을 토대로 분석을 수행하고 반드시 아래 JSON 형식으로만 응답해 주세요. (JSON 이외의 텍스트나 마크다운 기호 금지)

[출력 JSON 형식]
{{
  "us_market_summary": "새벽 미국 증시 마감 상황 및 글로벌 주요 선물시장(금, 원유, 비트코인 등)의 특이점 요약 (공백 제외 150자 내외)",
  "today_strategy": "오늘 아침 한국 증시 개장 시 시초가 방향(갭상승/갭하락 예상)과 장중 어떤 자금 흐름을 주의 깊게 보아야 하는지 대응 전략 요약 (150자 내외)",
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
        response = model.generate_content(prompt)
        clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"Gemini 아침 브리핑 분석 중 에러: {e}")
        return {
            "us_market_summary": "글로벌 금융 시장 요약 로딩에 실패했습니다.",
            "today_strategy": "장 시작 전 뉴스 및 수급 흐름을 직접 체크하시기 바랍니다.",
            "watchlist": []
        }

def main():
    print("====================================")
    print(" [오전 8시] 글로벌 선물 및 미국장 시황 분석 파이프라인 가동 ")
    print("====================================")
    
    # 1. 기존 저녁 국내 분석 자료 로드
    briefing_file = 'src/data/daily_briefing.json'
    if not os.path.exists(briefing_file):
        print("어제 저녁 국내장 데이터(daily_briefing.json)가 발견되지 않았습니다. 기본 형태로 초기화 후 진행합니다.")
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
    
    # 미국 3대 지수 및 반도체
    sp500 = get_yfinance_data("^GSPC")
    nasdaq = get_yfinance_data("^NDX")
    dow = get_yfinance_data("^DJI")
    sox = get_yfinance_data("^SOX")
    
    # 글로벌 6대 선물/자산
    nasdaq_fut = get_yfinance_data("NQ=F")
    gold = get_yfinance_data("GC=F")
    oil = get_yfinance_data("CL=F")
    bitcoin = get_yfinance_data("BTC-USD")
    usdjpy = get_yfinance_data("USDJPY=X")
    eurusd = get_yfinance_data("EURUSD=X")
    
    # 한국 관련 매크로
    usdkrw = get_yfinance_data("USDKRW=X")
    ewy = get_yfinance_data("EWY")
    
    us_market_info = {
        "indices": {
            "S&P500": sp500,
            "Nasdaq100": nasdaq,
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
        }
    }
    
    # 3. 미국 시황 관련 아침 뉴스 취합
    print("미국 마감 뉴스 요약 수집 중...")
    us_news = get_google_news_rss("미국 증시 마감", limit=5)
    
    # 4. Gemini 종합 아침 시나리오 생성
    print("글로벌 매크로 시나리오 생성 중 (AI 연산)...")
    us_analysis = generate_morning_briefing(kr_data, us_market_info, us_news)
    
    # 5. daily_briefing.json에 통합 업데이트
    full_briefing = {
        "last_updated_kr": full_data.get("last_updated_kr", "") if os.path.exists(briefing_file) else datetime.now().strftime("%Y-%m-%d 21:00:00"),
        "last_updated_us": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "kr_data": kr_data,
        "us_data": {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "indices": us_market_info["indices"],
            "futures": us_market_info["futures"],
            "macro": us_market_info["macro"],
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
