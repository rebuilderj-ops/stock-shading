import os
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

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

def analyze_kr_market(today_stocks, after_market_news):
    """Gemini API를 활용하여 국내 장마감 종합 요약을 수행합니다."""
    if not GEMINI_API_KEY:
        print("Gemini API 키가 설정되지 않았습니다.")
        return {
            "top_sectors": [],
            "after_market_stocks": [],
            "market_summary": "Gemini API 키 미설정으로 요약이 누락되었습니다."
        }

    genai.configure(api_key=GEMINI_API_KEY)
    # 한도 회피를 위해 안정적인 gemini-flash-lite-latest 모델을 사용합니다.
    model = genai.GenerativeModel('gemini-flash-lite-latest')
    
    # 1차 가공 데이터 문자열화
    stocks_str = ""
    for s in today_stocks:
        stocks_str += f"- {s.get('name')}({s.get('code')}): 등락률 {s.get('change_rate')}%, 거래대금 {s.get('volume_krw')}억, 테마: {s.get('keywordName')}, 사유: {s.get('reason')}\n"
        
    prompt = f"""당신은 한국 주식 데이트레이딩 분야의 인공지능 수석 분석가입니다.
오늘 장 마감 후 취합된 국내 정규장 주도주 정보와 시간외/공시 뉴스 목록을 바탕으로 핵심 투자 리포트를 작성해야 합니다.

[오늘 정규장 급등 주도주 목록]
{stocks_str if stocks_str else "오늘 급등 필터링에 걸린 종목이 없습니다."}

[장 마감 후 시간외 거래 및 공시 관련 뉴스 목록]
{after_market_news}

위 데이터를 종합적으로 분석하여 아래 JSON 형식에 맞추어 출력해 주세요.
* 중요: JSON 포맷 외에 마크다운 기호(```json 등)나 다른 설명 텍스트를 절대 붙이지 마세요. 오직 순수한 JSON 텍스트만 출력해야 합니다.

[출력 JSON 형식]
{{
  "top_sectors": [
    {{
      "sector": "핵심 테마명(예: 반도체)",
      "reason": "테마 전체의 오늘 상승 배경 및 재료에 대한 구체적인 분석 요약 (1문장)"
    }},
    {{
      "sector": "핵심 테마명",
      "reason": "요약 사유"
    }}
  ],
  "after_market_stocks": [
    {{
      "name": "시간외/공시 포착 종목명",
      "code": "종목코드(알 수 없다면 공란)",
      "change_rate": "예상 상승률 또는 등락 정도 (예: '상한가', '5.4% 상승' 등 뉴스 기반 추정)",
      "reason": "시간외 거래 급등 혹은 공시 내용 요약 (1문장)"
    }}
  ],
  "market_summary": "오늘 전체 한국 시장 흐름과 데이트레이더가 내일 아침 집중해야 할 공략 포인트 요약 리포트 (공백 제외 150자 내외로 상세하게)"
}}
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Gemini 분석 중 에러 발생 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print("5초 후 재시도합니다...")
                time.sleep(5)
            else:
                import traceback
                traceback.print_exc()
                return {
                    "top_sectors": [{"sector": "분석 실패", "reason": "AI 분석 도중 예외가 발생했습니다."}],
                    "after_market_stocks": [],
                    "market_summary": "데이터 처리에 오류가 발생했습니다. 로그를 확인해 주세요."
                }

def main():
    print("====================================")
    print(" [오후 9시] 국내장 및 시간외/공시 분석 파이프라인 가동 ")
    print("====================================")
    
    today_formatted = datetime.now().strftime("%Y-%m-%d")
    print(f"대상 날짜: {today_formatted}")
    
    # 1. 오늘 정규장 데이터 로드
    today_stocks = load_today_krx_shadowing(today_formatted)
    print(f"오늘 정규장 주도주 수: {len(today_stocks)}개")
    
    # 2. 장외 시간외 뉴스 및 공시 뉴스 수집
    print("시간외 특징주 및 공시 뉴스 수집 중...")
    news_after_hour = get_google_news_rss("시간외 특징주", limit=12)
    news_announcement = get_google_news_rss("공시 특징주", limit=12)
    combined_news = f"--- 시간외 특징주 뉴스 ---\n{news_after_hour}\n\n--- 공시 뉴스 ---\n{news_announcement}"
    
    # 3. AI 분석 실행
    print("Gemini AI 분석 모델 구동 중...")
    analysis_result = analyze_kr_market(today_stocks, combined_news)
    
    # 4. 독립적인 daily_briefing.json 파일 관리
    briefing_file = 'public/data/daily_briefing.json'
    briefing_data = {
        "last_updated_kr": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "last_updated_us": "",
        "kr_data": {
            "date": today_formatted,
            "top_sectors": analysis_result.get("top_sectors", []),
            "after_market_stocks": analysis_result.get("after_market_stocks", []),
            "market_summary": analysis_result.get("market_summary", "")
        },
        "us_data": None  # 다음날 아침 스크립트 실행 시 채워집니다.
    }
    
    # 기존 파일이 있는 경우 덮어쓰거나 백업 구조 유지
    os.makedirs(os.path.dirname(briefing_file), exist_ok=True)
    with open(briefing_file, 'w', encoding='utf-8') as f:
        json.dump(briefing_data, f, ensure_ascii=False, indent=2)
        
    print(f"분석 보고서 저장 성공! ({briefing_file})")

if __name__ == "__main__":
    main()
