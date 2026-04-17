import os
import time
import requests
import json
import urllib.request
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except ImportError:
    print("google.generativeai 패키지가 설치되어 있지 않습니다.")

load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "여기에_키를_입력하세요")
NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "")

KIS_APP_KEY = os.environ.get("KIS_APP_KEY", "")
KIS_APP_SECRET = os.environ.get("KIS_APP_SECRET", "")
KIS_URL_BASE = "https://openapi.koreainvestment.com:9443"

EXISTING_KEYWORDS = ["전고체 배터리", "HBM", "기업 밸류업", "우주항공", "개별 호재", "K-방산", "K-조선", "화장품 (K-뷰티)"]

def get_kis_access_token():
    headers = {"content-type": "application/json"}
    body = {"grant_type": "client_credentials", "appkey": KIS_APP_KEY, "appsecret": KIS_APP_SECRET}
    res = requests.post(f"{KIS_URL_BASE}/oauth2/tokenP", headers=headers, data=json.dumps(body))
    if res.status_code != 200:
        print(f"KIS Token Error: {res.text}")
        return None
    return res.json().get('access_token')

def get_surged_stocks_kis(target_date, market_code="0000"):
    token = get_kis_access_token()
    if not token: return []
    print(f"[{market_code}] 한국투자증권 API 통신 시작...")
    
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "authorization": f"Bearer {token}",
        "appkey": KIS_APP_KEY,
        "appsecret": KIS_APP_SECRET,
        "tr_id": "FHPST01710000",
        "custtype": "P"
    }
    params = {
        "FID_COND_MRKT_DIV_CODE": "J", "FID_COND_SCR_DIV_CODE": "20171",
        "FID_INPUT_ISCD": market_code, "FID_DIV_CLS_CODE": "0", "FID_BLNG_CLS_CODE": "0",
        "FID_TRGT_CLS_CODE": "111111111", "FID_TRGT_EXLS_CLS_CODE": "000000",
        "FID_INPUT_PRICE_1": "", "FID_INPUT_PRICE_2": "", "FID_VOL_CNT": "", "FID_INPUT_DATE_1": ""
    }

    try:
        res = requests.get(f"{KIS_URL_BASE}/uapi/domestic-stock/v1/quotations/volume-rank", headers=headers, params=params)
        data = res.json()
        if res.status_code != 200 or data.get('rt_cd') != '0': return []
            
        results = []
        raw_items = data.get('output', [])
        print(f"[{market_code}] 받은 원본 데이터: {len(raw_items)}개")
        for item in raw_items:
            name, code = item.get('hts_kor_isnm', ''), item.get('mksc_shrn_iscd', '')
            change_rate = float(item.get('prdy_ctrt', 0))
            vol_krw = int(float(item.get('acml_tr_pbmn', 0)) / 100000000) # 거래대금 (억)
            vol_cnt = int(float(item.get('acml_vol', 0))) # 거래량 (주)
            
            # 조건: (6% 상승 & 300억) OR (상한가 29.5% 이상) OR (거래량 1000만 주 이상)
            if (change_rate >= 6.0 and vol_krw >= 300) or change_rate >= 29.5 or vol_cnt >= 10000000:
                results.append({
                    "date": f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}",
                    "code": code, "name": name, "change_rate": round(change_rate, 2), 
                    "volume_krw": vol_krw, "volume_cnt": vol_cnt
                })
        return results
    except Exception as e:
        print(f"KIS API 에러: {e}")
        return []

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

def analyze_stock_reason(stock_info, target_date):
    if GEMINI_API_KEY and GEMINI_API_KEY != "여기에_키를_입력하세요" and NAVER_CLIENT_ID:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            news_titles = ""
            try:
                query = urllib.parse.quote(stock_info['name'] + " 특징주")
                req = urllib.request.Request(f"https://openapi.naver.com/v1/search/news?query={query}&display=5")
                req.add_header("X-Naver-Client-Id", NAVER_CLIENT_ID)
                req.add_header("X-Naver-Client-Secret", NAVER_CLIENT_SECRET)
                res_news = urllib.request.urlopen(req)
                news_titles = " / ".join([item['title'].replace("<b>", "").replace("</b>", "") for item in json.loads(res_news.read().decode('utf-8'))['items']])
            except Exception as ne:
                print(f"네이버 뉴스 API 일시 장애 (뉴스 없이 자체 지식 추론으로 대체): {ne}")
            
            prompt = get_analysis_prompt(stock_info['name'], stock_info['change_rate'], stock_info['volume_krw'], news_titles)
            response = model.generate_content(prompt)
            clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
            time.sleep(1) # Rate limit 방지
            return json.loads(clean_json)
        except Exception as e:
            print("Gemini 분석 중 에러:", e)
            return {"reason": "[분석실패] 기사 파싱 장애", "keyword": "미분류"}

    return {"reason": "[API 미설정] Gemini 및 네이버 키 필요", "keyword": "미분류"}

if __name__ == "__main__":
    print("====================================")
    print(" 주식 쉐도잉 데이터 파이프라인 (초정밀 AI 분석 가동) ")
    print("====================================")
    
    yyyymmdd = datetime.now().strftime("%Y%m%d")
    yyyymmdd_formatted = datetime.now().strftime("%Y-%m-%d")
    
    stocks_to_analyze = get_surged_stocks_kis(yyyymmdd, market_code="0001")
    stocks_to_analyze += get_surged_stocks_kis(yyyymmdd, market_code="0002")
    stocks_to_analyze.sort(key=lambda x: x['volume_krw'], reverse=True)
    
    print(f"\n최종 요약: 총 {len(stocks_to_analyze)}개의 종목이 필터링되었습니다.\n")
    final_output = []
    
    for idx, s in enumerate(stocks_to_analyze):
        print(f"[{idx+1}/{len(stocks_to_analyze)}] {s['name']} AI 모멘텀 심층 분석 중...")
        ai_analysis = analyze_stock_reason(s, yyyymmdd)
        
        s['reason'] = ai_analysis.get('reason', '')
        s['keywordName'] = ai_analysis.get('keyword', '')
        final_output.append(s)
        
    output_filename = 'src/data/shadowing_real_history.json'
    existing_data = []
    
    if os.path.exists(output_filename):
        with open(output_filename, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except:
                pass
                
    # 오늘 생성된 데이터를 기존 데이터 뒤에 추가 (중복 날짜 제거 등은 생략하거나 필요시 추가)
    # 날짜 중복 시 덮어쓰는 로직: 오늘 날짜의 데이터가 이미 있으면 지우고 새로 추가
    existing_data = [d for d in existing_data if d.get('date') != yyyymmdd_formatted]
    existing_data.extend(final_output)

    if not os.path.exists('src/data'):
        os.makedirs('src/data')
        
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
    print(f"\n완료! 결과물이 {output_filename} 에 누적 저장되었습니다.")
