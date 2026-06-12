import json

f_path = 'src/data/shadowing_real_history.json'
data = json.load(open(f_path, encoding='utf-8'))

existing_kws = [k.strip() for k in "뷰티, 방산, 조선, 원전, 반도체, 건설, 우주항공, 게임, 로봇, AI, 바이오, 전력설비, 통신, 드론, 자동차, 2차전지, 금융, 신재생에너지, 양자암호, 엔터, 식음료, 철강, 화학, 해운, IT, 디스플레이, 기계, 메타버스, 유통, 패션".split(',')]

# 1. Build a theme cache from ALL historic data BEFORE June 8
theme_cache = {}
for d in data:
    if d.get('date') not in ['2026-06-08', '2026-06-10', '2026-06-11']:
        kw = d.get('keywordName')
        code = d.get('code')
        if kw and kw in existing_kws:
            theme_cache[code] = kw

# 2. Hardcode some well-known stock codes to keywords as backup
hardcoded_cache = {
    '005930': '반도체', # 삼성전자
    '005935': '반도체', # 삼성전자우
    '000660': '반도체', # SK하이닉스
    '009150': '전력설비', # 삼성전기
    '047050': '금융', # 포스코홀딩스
    '000720': '건설', # 현대건설
    '047040': '건설', # 대우건설
    '005960': '금융', # 토스
    '402340': '금융', # SK스퀘어 (지주사/금융)
}
theme_cache.update(hardcoded_cache)

rules = {
    '반도체': ['AI반도체', 'HBM', '엔비디아', '마이크론', 'TSMC', 'CXL', '온디바이스', '반도체', '유리기판', '컴퓨트익스프레스링크'],
    '바이오': ['제약', '바이오', '신약', '임상', 'FDA', '항암', '치료제', '의료기기', '의학', '병원', '비만'],
    '로봇': ['로봇', '자동화', '스마트팩토리', '지능형'],
    'AI': ['인공지능', 'AI'],
    '원전': ['원전', 'SMR', '체코', '탈원전', '원자력'],
    '뷰티': ['화장품', '뷰티', '미용', '케이뷰티', '에스테틱'],
    '전력설비': ['전력', '변압기', '전선', '송전', '그리드', '전기', '스마트그리드'],
    '조선': ['선박', '항만', '피팅', '벌크선'], # Removed '조선' to avoid matching '조선비즈'
    '우주항공': ['우주', '항공', '위성', '스페이스', '누리호'],
    '2차전지': ['배터리', '2차전지', '전고체', '리튬', '양극재', '음극재', '수산화리튬', 'ESS'],
    '방산': ['방산', '무기', '국방', '미사일', '자주포', '전차', '다련장'],
    '건설': ['건설', '건축', '토목', '재건축', '시공'],
    '게임': ['게임', '신작', 'MMORPG', '모바일게임'],
    '통신': ['통신', '5G', '6G', '네트워크', '이동통신'],
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

changed = 0
for d in data:
    if d.get('date') in ['2026-06-08', '2026-06-10', '2026-06-11']:
        code = d.get('code')
        old = d.get('keywordName')
        
        # 1. Try theme cache first
        if code in theme_cache:
            found = theme_cache[code]
        else:
            # 2. Fallback to rules (clean titles to avoid publisher name matches)
            clean_titles = d.get('news_titles', '').replace('조선비즈', '').replace('조선일보', '')
            found = None
            for k_core, trigs in rules.items():
                if any(t.lower() in clean_titles.lower() or t.lower() in d.get('reason', '').lower() for t in trigs):
                    found = k_core
                    break
            if not found:
                found = '기타'
                
        if old != found:
            d['keywordName'] = found
            if ']' in d.get('reason', ''):
                d['reason'] = f'[{found}]' + d['reason'].split(']', 1)[-1]
            print(f"Mapped {d['name']} ({code}): {old} -> {found}")
            changed += 1

with open(f_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"Successfully cleaned up {changed} records.")
