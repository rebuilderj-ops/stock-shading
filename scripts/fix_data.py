import json
import FinanceDataReader as fdr

with open('src/data/shadowing_real_history.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Explicit fixes
explicit_fixes = {
    '010120': '전력설비 / 변압기', # LS ELECTRIC
    '058610': '로봇 / 지능형 AI', # 에스피지
    '491000': 'K-바이오 (주도)', # 리브스메드
    '0004V0': '자율주행 / 로보택시', # 엔비알모션
    '0004v0': '자율주행 / 로보택시' # 엔비알모션
}

try:
    df_desc = fdr.StockListing('KRX-DESC')
    desc_dict = {str(row['Code']): str(row['Industry']) for _, row in df_desc.iterrows()}
except:
    desc_dict = {}

keyword_rules = {
    'HBM (AI 반도체)': ['AI반도체', 'HBM', '엔비디아', '마이크론', 'TSMC', 'CXL', '온디바이스', '반도체'],
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

changed = 0
for d in data:
    kw = d.get('keywordName', '')
    if d['code'] in explicit_fixes:
        if kw != explicit_fixes[d['code']]:
            d['keywordName'] = explicit_fixes[d['code']]
            if ']' in d['reason']:
                d['reason'] = f"[{explicit_fixes[d['code']]}] " + d['reason'].split(']', 1)[-1].strip()
            changed += 1
    elif kw == '기타' or kw == 'nan' or str(kw).lower() == 'nan':
        news = d.get('news_titles', '')
        ind = desc_dict.get(d['code'], '')
        
        found_kw = None
        for r_kw, rules in keyword_rules.items():
            if any(r in news for r in rules):
                found_kw = r_kw
                break
        
        if not found_kw:
            for r_kw, rules in keyword_rules.items():
                if any(r in ind for r in rules):
                    found_kw = r_kw
                    break
        
        if not found_kw:
            if ind and len(ind) > 2:
                found_kw = ind.split()[0]
            else:
                found_kw = '특징주'
                
        d['keywordName'] = found_kw
        if ']' in d['reason']:
            d['reason'] = f"[{found_kw}] " + d['reason'].split(']', 1)[-1].strip()
        changed += 1

print('Changed:', changed)
with open('src/data/shadowing_real_history.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
