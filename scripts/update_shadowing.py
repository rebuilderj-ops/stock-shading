import os
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('.env.local')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "여기에_키를_입력하세요")
KIS_APP_KEY = os.environ.get("KIS_APP_KEY", "")
KIS_APP_SECRET = os.environ.get("KIS_APP_SECRET", "")
KIS_URL_BASE = "https://openapi.koreainvestment.com:9443"

EXISTING_KEYWORDS = "기업 밸류업 프로그램, 전고체 배터리, HBM (AI 반도체), 우주항공, 전력설비 / 변압기, 유리기판, 비만치료제 (GLP-1), 로봇 / 지능형 AI, 원전 (SMR), CXL 반도체, K-방산 (수출), K-조선 (슈퍼사이클), 화장품 (K-뷰티)"

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
            name = item.get('hts_kor_isnm', '')
            code = item.get('mksc_shrn_iscd', '')
            change_rate = float(item.get('prdy_ctrt', 0))
            vol_krw = int(float(item.get('acml_tr_pbmn', 0)) / 100000000)
            vol_cnt = int(float(item.get('acml_vol', 0)))
            
            if (change_rate >= 6.0 and vol_krw >= 300) or change_rate >= 29.5:
                results.append({
                    "date": f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}",
                    "code": code, "name": name, "change_rate": round(change_rate, 2), 
                    "volume_krw": vol_krw, "volume_cnt": vol_cnt
                })
        return results
    except Exception as e:
        print(f"KIS API 에러: {e}")
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

def analyze_stocks_batch(stocks):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "여기에_키를_입력하세요":
        print("Gemini API 키가 설정되지 않았습니다.")
        return {s['code']: {"reason": "[API 미설정]", "keyword": "미분류"} for s in stocks}

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""당신은 한국 주식을 다루는 최고 수준의 트레이더입니다.
아래는 오늘 필터링된 급등주 목록입니다. (종목코드, 종목명, 상승률, 거래대금, 오늘자 뉴스헤드라인)

"""
        for s in stocks:
            prompt += f"- {s['code']} {s['name']}: {s['change_rate']}% 상승, {s['volume_krw']}억 거래\n"
            prompt += f"  뉴스: {s.get('news_titles', '')}\n"
            
        prompt += f"""
위 종목들을 모두 분석하여, 각 종목마다 '어떤 재료/이슈/모멘텀'으로 급등했는지 심층 파악하세요.
분석 사유 맨 앞에 반드시 아래의 매우 상세한 카테고리 태그 모음 중 가장 적합한 1개를 [말머리]로 달아주세요.
[정책수혜], [임상통과/신약기대], [실적/어닝서프라이즈], [대규모수주/공급계약], [인수합병/M&A],
[유상증자/무상증자], [지분투자/투자유치], [자사주취득/소각], [경영권분쟁/행동주의], [독점/단독보도],
[FDA/식약처승인], [지정학적수혜/리스크], [신규사업진출], [품절주/스팩], [수급/테마편승], [기타]

결과 사유는 정확히 1문장(최고 50자 내외)으로 핵심만 간결하게 작성하세요.
기존 테마 목록({EXISTING_KEYWORDS}) 중 하나를 고르거나 전혀 새로운 테마라면 10자 이내 명사형의 새 테마를 명명하세요.

오직 다음 JSON 배열(Array) 형식으로만 출력해야 합니다 (기타 마크다운 없이 JSON만 출력):
[
  {{"code": "종목코드1", "reason": "[태그] 요약 사유", "keyword": "명명된 테마"}},
  {{"code": "종목코드2", "reason": "[태그] 요약 사유", "keyword": "명명된 테마"}}
]
"""
        response = model.generate_content(prompt)
        clean_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        data = json.loads(clean_json)
        
        # 배열을 딕셔너리로 변환하여 code로 O(1) 접근
        return {item["code"]: {"reason": item["reason"], "keyword": item["keyword"]} for item in data}
    except Exception as e:
        print("Gemini 일괄 분석 중 에러:", e)
        return {}

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
    
    print(f"구글 뉴스로부터 각 종목당 최신 헤드라인 수집 중...")
    for idx, s in enumerate(stocks_to_analyze):
        s['news_titles'] = get_google_news(s['name'])
        
    ai_results = {}
    if stocks_to_analyze:
        print("Gemini AI를 이용한 일괄 분석 진행 중... (배치 처리로 통신 1회만 실시하여 API 한도 절약)")
        ai_results = analyze_stocks_batch(stocks_to_analyze)
        
    for s in stocks_to_analyze:
        res = ai_results.get(s['code'], {})
        s['reason'] = res.get('reason', '[분석실패] 기사 파싱 장애')
        s['keywordName'] = res.get('keyword', '미분류')
        # 모델의 뉴스 출력을 확인하려면 원본도 남겨둠. (UI엔 안 보임)
        final_output.append(s)
        
    output_filename = 'src/data/shadowing_real_history.json'
    existing_data = []
    
    if os.path.exists(output_filename):
        with open(output_filename, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except:
                pass
                
    # 오늘 생성된 데이터를 기존 데이터 뒤에 추가
    # 날짜 중복 시 덮어쓰는 로직: 오늘 날짜의 데이터가 이미 있으면 지우고 새로 추가
    existing_data = [d for d in existing_data if d.get('date') != yyyymmdd_formatted]
    existing_data.extend(final_output)

    if not os.path.exists('src/data'):
        os.makedirs('src/data')
        
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
    print(f"\n완료! 결과물이 {output_filename} 에 누적 저장되었습니다.")
