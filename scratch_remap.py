import json
import os

keyword_rules = {
    '반도체': ['AI반도체', 'HBM', '엔비디아', '마이크론', 'TSMC', 'CXL', '온디바이스', '반도체', '유리기판', '반도체 장비', '반도체 부품'],
    '바이오': ['제약', '바이오', '신약', '임상', 'FDA', '항암', '치료제', '의료기기', '의학', '병원', '비만', 'K-바이오'],
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

valid_themes = set(keyword_rules.keys())

file_path = 'src/data/shadowing_real_history.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    old_kw = item.get('keywordName', '')
    new_kw = '기타'
    
    # 1. Exact match with valid themes
    if old_kw in valid_themes:
        continue
        
    # 2. Check keyword_rules using old_kw, reason, and news_titles
    found = False
    text_to_search = (old_kw + " " + item.get('reason', '') + " " + item.get('news_titles', '')).upper()
    
    for theme, keywords in keyword_rules.items():
        for kw in keywords:
            if kw.upper() in text_to_search:
                new_kw = theme
                found = True
                break
        if found:
            break
            
    item['keywordName'] = new_kw

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("Successfully remapped keywords.")
