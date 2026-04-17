import os
import time
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from dotenv import load_dotenv

try:
    from pykrx import stock
except ImportError:
    print("pykrx 패키지가 설치되어 있지 않습니다. pip install pykrx 로 설치해주세요.")
    exit(1)

try:
    import google.generativeai as genai
except ImportError:
    print("google.generativeai 패키지가 설치되어 있지 않습니다.")
    exit(1)

load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "")

EXISTING_KEYWORDS = ["전고체 배터리", "HBM", "기업 밸류업", "우주항공", "개별 호재", "K-방산", "K-조선", "화장품 (K-뷰티)", "의료기기", "자율주행", "가상화폐", "전력기기", "원전"]

def get_analysis_prompt(stock_name, change_rate, volume_krw, news_titles=""):
    context = f"\n오늘의 보조 뉴스 헤드라인 데이터:\n[{news_titles}]" if news_titles else ""

    prompt = f"""당신은 한국 주식을 다루는 최고 수준의 트레이더입니다.
종목명 '{stock_name}'이(가) 오늘 {change_rate}% 상승하며 거래대금 {volume_krw}억 규모의 시세 분출을 했습니다.{context}

지시사항:
1. 해당 종목이 '어떤 재료/이슈/모멘텀'으로 급등했는지 심층 파악하세요.
2. 분석 사유 맨 앞에 반드시 아래의 매우 상세한 카테고리 태그 모음 중 가장 적합한 1개를 [말머리]로 달아주세요.
   [정책수혜], [임상통과/신약기대], [실적/어닝서프라이즈], [대규모수주/공급계약], [인수합병/M&A],
   [유상증자/무상증자], [지분투자/투자유치], [자사주취득/소각], [경영권분쟁/행동주의], [독점/단독보도],
   [FDA/식약처승인], [지정학적수혜/리스크], [신규사업진출], [품절주/스팩], [수급/테마편승], [기타]
   (예: "[경영권분쟁] MBK파트너스의 고려아연 공개매수 선언에 따른 지분 경쟁 격화")
3. 결과는 정확히 1문장(최고 50자 내외)으로 핵심만 간결하게 작성하세요.
4. 분석 결과의 맥락을 고려하여, 기존 테마 목록({EXISTING_KEYWORDS}) 중 하나를 고르거나 전혀 새로운 테마라면 10자 이내 명사형의 새 테마를 명명하세요.

오직 다음 JSON 형식으로만 출력해야 합니다:
{{"reason": "[태그] 요약 사유", "keyword": "명명된 테마"}}
"""
    return prompt

def analyze_stock_reason(stock_info):
    if GEMINI_API_KEY and NAVER_CLIENT_ID:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # 검색어는 해당 날짜 부근의 특징주 검색 (완벽한 과거 검색은 어려우므로 일단 일반 검색)
            query = urllib.parse.quote(stock_info['name'] + " 특징주")
            req = urllib.request.Request(f"https://openapi.naver.com/v1/search/news?query={query}&display=3")
            req.add_header("X-Naver-Client-Id", NAVER_CLIENT_ID)
            req.add_header("X-Naver-Client-Secret", NAVER_CLIENT_SECRET)
            res_news = urllib.request.urlopen(req)
            news_titles = " / ".join([item['title'].replace("<b>", "").replace("</b>", "") for item in json.loads(res_news.read().decode('utf-8'))['items']])
            
            prompt = get_analysis_prompt(stock_info['name'], stock_info['change_rate'], stock_info['volume_krw'], news_titles)
            response = model.generate_content(prompt)
            clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
            return json.loads(clean_json)
        except Exception as e:
            print("  [에러] Gemini 분석 중 에러:", e)
            return {"reason": "[분석실패] 기사 파싱 장애", "keyword": "미분류"}
    return {"reason": "[API 미설정] Gemini 및 네이버 키 필요", "keyword": "미분류"}

def backfill_data(start_date_str, end_date_str):
    start_date = datetime.strptime(start_date_str, "%Y%m%d")
    end_date = datetime.strptime(end_date_str, "%Y%m%d")
    
    current_date = start_date
    final_results = []
    
    # 이어하기를 위한 기존 파일 로드
    output_filename = 'src/data/shadowing_real_history.json'
    if os.path.exists(output_filename):
        with open(output_filename, 'r', encoding='utf-8') as f:
            try:
                final_results = json.load(f)
                print(f"기존 {len(final_results)}개의 데이터가 로드되었습니다.")
            except:
                pass
    else:
        if not os.path.exists('src/data'):
            os.makedirs('src/data')

    while current_date <= end_date:
        # 주말 제외
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue
            
        date_str_krx = current_date.strftime("%Y%m%d")
        # 저장 시 프론트엔드의 2026년 시뮬레이션 환경에 맞추기 위해 연도를 2026년으로 변환
        date_str_formatted = current_date.replace(year=2026).strftime("%Y-%m-%d")
        
        # 만약 이 날짜의 데이터가 이미 파일에 있다면 스킵
        if any(r['date'] == date_str_formatted for r in final_results):
            print(f"[{date_str_formatted}] 이미 데이터가 존재하여 건너뜁니다.")
            current_date += timedelta(days=1)
            continue
            
        print(f"\n=====================================")
        print(f" [{date_str_formatted}] 일자 크롤링 시작...")
        print(f"=====================================")
        
        # pykrx를 이용해 해당 일자의 코스피, 코스닥 OHLCV 데이터 수집
        kospi_ohlcv = stock.get_market_ohlcv(date_str_krx, market="KOSPI")
        kosdaq_ohlcv = stock.get_market_ohlcv(date_str_krx, market="KOSDAQ")
        
        if kospi_ohlcv.empty and kosdaq_ohlcv.empty:
            print(f"[{date_str_formatted}] 데이터가 없습니다 (휴장일 가능성).")
            current_date += timedelta(days=1)
            continue
            
        all_stocks_data = [kospi_ohlcv, kosdaq_ohlcv]
        
        daily_surged = []
        
        for df in all_stocks_data:
            if df.empty: continue
            for ticker, row in df.iterrows():
                try:
                    change_rate = float(row['등락률'])
                    vol_krw = int(float(row['거래대금']) / 100000000) # 억 원
                    vol_cnt = int(float(row['거래량']))
                    
                    # 통합 스코어링 포획 조건 (진짜 데이터)
                    if (change_rate >= 6.0 and vol_krw >= 300) or change_rate >= 29.5 or vol_cnt >= 10000000:
                        name = stock.get_market_ticker_name(ticker)
                        daily_surged.append({
                            "date": date_str_formatted,
                            "code": ticker,
                            "name": name,
                            "change_rate": round(change_rate, 2),
                            "volume_krw": vol_krw,
                            "volume_cnt": vol_cnt
                        })
                except Exception as e:
                    pass

        # 거래대금 순 정렬
        daily_surged.sort(key=lambda x: x['volume_krw'], reverse=True)
        print(f"  > 조건 만족 종목: 총 {len(daily_surged)}개 발견! AI 뉴스 분석을 시작합니다.")
        
        for idx, s in enumerate(daily_surged):
            print(f"    [{idx+1}/{len(daily_surged)}] {s['name']} - 등락률: {s['change_rate']}%, 대금: {s['volume_krw']}억, 거래량: {s['volume_cnt']}주 ... 분석 중")
            
            ai_analysis = analyze_stock_reason(s)
            s['reason'] = ai_analysis.get('reason', '')
            s['keywordName'] = ai_analysis.get('keyword', '')
            
            final_results.append(s)
            
            # API 제한 우회를 위한 쿨다운 (분당 15회 제한)
            # 60초 / 15회 = 4초 지속
            time.sleep(4.1)
            
            # 즉시 덮어쓰기 (중간에 에러나서 꺼져도 저장되도록 유지)
            with open(output_filename, 'w', encoding='utf-8') as f:
                json.dump(final_results, f, ensure_ascii=False, indent=4)
        
        print(f"[SUCCESS] [{date_str_formatted}] 수집 완료 및 저장 완료!")
        current_date += timedelta(days=1)

    print("\n[FINISH] 모든 백필 작업이 성공적으로 완료되었습니다!")

if __name__ == "__main__":
    print("주식 쉐도잉 리얼 백데이터 크롤링 스크립트를 시작합니다.")
    # pykrx는 실제 데이터를 조회하므로 2026년 미래 데이터가 없습니다.
    # 2024년 4월 실제 주식 시장 데이터를 가져온 후 프론트엔드용으로 2026년으로 변조하여 저장합니다!
    START_DATE = "20240401"
    END_DATE = "20240416"
    backfill_data(START_DATE, END_DATE)
