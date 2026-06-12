import re

with open('scripts/update_shadowing.py', 'r', encoding='utf-8') as f:
    text = f.read()

replacement_logic = """    output_filename = 'src/data/shadowing_real_history.json'
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
            
            # 2. 뉴스 매칭
            if not found_kw:
                for kw, rules in keyword_rules.items():
                    if any(r in news for r in rules):
                        found_kw = kw
                        break
            
            # 3. KRX-DESC 매칭
            if not found_kw:
                industry_info = desc_dict.get(s['code'], '')
                for kw, rules in keyword_rules.items():
                    if any(r in industry_info for r in rules):
                        found_kw = kw
                        break
                        
            found_kw = found_kw or '개별이슈'
            reason_text = news.split('/')[0] if news else '차트 급등 (주요 뉴스 미발견)'
            s['reason'] = f'[{found_kw}] {reason_text[:40].strip()}...'
            s['keywordName'] = found_kw
        else:
            s['reason'] = res['reason']
            s['keywordName'] = res['keyword']
            
        final_output.append(s)
        
    existing_data = [d for d in existing_data if d.get('date') != yyyymmdd_formatted]
    existing_data.extend(final_output)"""

pattern = re.compile(r"    keyword_rules = \{.*?existing_data\.extend\(final_output\)", re.DOTALL)
text = pattern.sub(replacement_logic, text)

with open('scripts/update_shadowing.py', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Done")
