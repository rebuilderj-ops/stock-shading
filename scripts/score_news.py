# -*- coding: utf-8 -*-
"""
[3단계 LLM rubric 스코어링] + [4단계 제약 어휘 테마·종목 매핑]

news_clusters.json 의 이벤트 클러스터를 Gemini에 넣어 rubric 6축으로 채점하고,
테마는 '기존 어휘(30 테마)' 중에서만 고르게 강제(환각 방지)한 뒤,
테마→종목은 shadowing_real_history.json 을 결정론적으로 조회해 매핑합니다.

rubric 6축(각 1~3):
  scope(파급범위) / specificity(구체성) / durability(지속성) /
  novelty(신규성) / chain_depth(밸류체인 깊이) / source_trust(신뢰도)
→ 종합 grade: A(시장급) / B(섹터급) / C(개별)

산출: public/data/daily_news_briefing.json (5단계 대시보드 입력)
      + 미분류 클러스터(신규 테마 후보) 리포트
"""
import os
import re
import sys
import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

load_dotenv('.env.local')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
KST = timezone(timedelta(hours=9))

CLUSTER_FILE = 'src/data/news_clusters.json'
HISTORY_FILE = 'src/data/shadowing_real_history.json'
PERSISTENCE_FILE = 'src/data/material_persistence.json'
OUTPUT_FILE = 'public/data/daily_news_briefing.json'

# 제약 어휘 — update_shadowing.py 의 EXISTING_KEYWORDS 와 동일한 30 테마 (단일 진실원본)
CANONICAL_THEMES = [
    "뷰티", "방산", "조선", "원전", "반도체", "건설", "우주항공", "게임", "로봇", "AI",
    "바이오", "전력설비", "통신", "드론", "자동차", "2차전지", "금융", "신재생에너지",
    "양자암호", "엔터", "식음료", "철강", "화학", "해운", "IT", "디스플레이", "기계",
    "메타버스", "유통", "패션",
]

MAX_CLUSTERS = 30  # API 부하 방지: 관심도 상위 N개 클러스터만 채점


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_theme_stock_map(history):
    """테마(keywordName) → 대표 종목 리스트를 실제 급등 데이터에서 결정론적으로 구성.
    등장 빈도·거래대금 기준 상위 종목. LLM이 종목을 지어내지 못하게 하는 4단계 핵심."""
    theme_stocks = defaultdict(lambda: defaultdict(lambda: {'count': 0, 'vol': 0, 'name': '', 'peak': 0.0}))
    for r in history:
        kw = r.get('keywordName')
        code = r.get('code')
        if not kw or not code:
            continue
        slot = theme_stocks[kw][code]
        slot['count'] += 1
        slot['vol'] = max(slot['vol'], r.get('volume_krw', 0) or 0)
        slot['peak'] = max(slot['peak'], r.get('change_rate', 0) or 0)
        slot['name'] = r.get('name', '')
    result = {}
    for kw, stocks in theme_stocks.items():
        ranked = sorted(stocks.items(), key=lambda kv: (kv[1]['count'], kv[1]['vol']), reverse=True)
        result[kw] = [{'code': c, 'name': v['name'], 'appear_days': v['count'], 'peak_change': round(v['peak'], 1)}
                      for c, v in ranked[:6]]
    return result


def build_durability_baseline(persistence):
    """테마별 과거 최장 연속 지속 거래일(max_run) — durability 축 보정/표기용."""
    base = {}
    if persistence:
        for t in persistence.get('theme_persistence', []):
            base[t['theme']] = {'max_run': t['max_run'], 'avg_run': t['avg_run']}
    return base


def score_clusters_with_gemini(clusters):
    if not GEMINI_API_KEY:
        print('[경고] GEMINI_API_KEY 미설정 - 스코어링을 건너뜁니다.')
        return []
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-lite-latest')

    lines = []
    for i, c in enumerate(clusters):
        disc = ' / 공시포함=예' if c.get('has_disclosure') else ''
        lines.append(f"[{i}] 제목:{c['representative_title']} / 요약:{c.get('summary','')[:80]} / "
                     f"기사수:{c['article_count']} / 매체수:{c['source_count']}{disc}")
    clusters_text = "\n".join(lines)

    prompt = f"""당신은 한국 증시 뉴스의 '영향력'을 평가하는 냉정한 애널리스트입니다.
아래 뉴스 이벤트 각각을 rubric 6축으로 채점하세요. 각 축은 정수 1~3점입니다.

[채점 rubric]
- scope(파급범위): 1=개별종목 2=특정섹터 3=시장전체
- specificity(구체성): 1=모호/루머/전망 2=일반발표 3=구체적 수치·계약·수주
- durability(지속성): 1=당일소멸성 2=2~3일 3=일주일이상 갈 대형재료
- novelty(신규성): 1=이미 반복된 재료 2=기존재료 업데이트 3=최초보도/서프라이즈
- chain_depth(밸류체인 파급깊이): 1=단일기업 2=1차 협력사까지 3=소재·부품·장비 산업전반
- source_trust(신뢰도): 1=단일매체·루머 2=복수매체 3=공식공시 또는 다수매체 확증

[테마 태그] 반드시 아래 목록에서만 고르거나, 해당 없으면 "미분류":
{', '.join(CANONICAL_THEMES)}

[종합 등급 grade]
- A: 시장/대형 섹터를 움직일 재료 (scope>=2 이면서 durability>=2, 또는 chain_depth=3)
- B: 특정 섹터/테마 단위 재료
- C: 개별 종목 이벤트(M&A·단일수주·실적 등)

[평가할 뉴스 이벤트]
{clusters_text}

반드시 아래 JSON 배열로만 응답하세요. index는 위 [n] 번호와 일치. 마크다운·설명 금지.
[
  {{"index":0,"event_summary":"한 문장 요약","scope":2,"specificity":2,"durability":2,"novelty":2,"chain_depth":2,"source_trust":2,"theme":"반도체","grade":"B","reason":"등급 판단 근거 한 문장"}}
]
"""
    from json_utils import extract_json_from_text
    for attempt in range(3):
        try:
            resp = model.generate_content(prompt)
            arr = json.loads(extract_json_from_text(resp.text))
            return arr
        except Exception as e:
            print(f"[Gemini 스코어링 재시도 {attempt+1}/3] {e}")
            if attempt < 2:
                import time as _t; _t.sleep(5)
    return []


def main():
    print('=' * 60)
    print(' [3단계] LLM rubric 스코어링 + [4단계] 테마·종목 매핑')
    print('=' * 60)

    cluster_data = load_json(CLUSTER_FILE)
    if not cluster_data or not cluster_data.get('clusters'):
        print('news_clusters.json 이 없습니다. 먼저 collect_news.py 를 실행하세요.')
        return
    history = load_json(HISTORY_FILE, [])
    persistence = load_json(PERSISTENCE_FILE, {})

    theme_stock_map = build_theme_stock_map(history)
    durability_base = build_durability_baseline(persistence)

    clusters = cluster_data['clusters'][:MAX_CLUSTERS]
    print(f"관심도 상위 {len(clusters)}개 클러스터 채점 중...")
    scores = score_clusters_with_gemini(clusters)
    by_index = {s['index']: s for s in scores if isinstance(s, dict) and 'index' in s}

    tier_a, tier_b, tier_c, unclassified = [], [], [], []
    for i, c in enumerate(clusters):
        s = by_index.get(i)
        if not s:
            continue
        theme = s.get('theme', '미분류')
        # 공시 포함 시 신뢰도 하한 보정
        if c.get('has_disclosure'):
            s['source_trust'] = max(s.get('source_trust', 1), 3)
        # 4단계: 테마→종목 결정론적 조회 (LLM이 종목 지어내지 못하게)
        mapped_stocks = theme_stock_map.get(theme, []) if theme in CANONICAL_THEMES else []
        item = {
            'event_summary': s.get('event_summary', c['representative_title']),
            'representative_title': c['representative_title'],
            'theme': theme,
            'grade': s.get('grade', 'C'),
            'rubric': {k: s.get(k) for k in
                       ['scope', 'specificity', 'durability', 'novelty', 'chain_depth', 'source_trust']},
            'rubric_total': sum(int(s.get(k, 0) or 0) for k in
                                ['scope', 'specificity', 'durability', 'novelty', 'chain_depth', 'source_trust']),
            'reason': s.get('reason', ''),
            'first_seen': c.get('first_seen', ''),
            'article_count': c['article_count'],
            'source_count': c['source_count'],
            'has_disclosure': c.get('has_disclosure', False),
            'mapped_stocks': mapped_stocks,
            'theme_persistence': durability_base.get(theme),  # 과거 이 테마 최장 지속일
            'urls': c.get('urls', [])[:5],
        }
        if theme == '미분류' or theme not in CANONICAL_THEMES:
            unclassified.append(item)
            (tier_c).append(item)
        elif item['grade'] == 'A':
            tier_a.append(item)
        elif item['grade'] == 'B':
            tier_b.append(item)
        else:
            tier_c.append(item)

    # rubric 총점 순 정렬
    for t in (tier_a, tier_b, tier_c):
        t.sort(key=lambda x: x['rubric_total'], reverse=True)

    output = {
        'generated_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S'),
        'source_cluster_count': len(clusters),
        'tier_a_market': tier_a,      # 시장급
        'tier_b_sector': tier_b,      # 섹터급
        'tier_c_individual': tier_c,  # 개별급
        'new_theme_candidates': [u['representative_title'] for u in unclassified],
    }
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n■ A등급 시장급 뉴스 ({len(tier_a)}건)")
    for it in tier_a[:8]:
        stocks = ', '.join(s['name'] for s in it['mapped_stocks'][:4])
        pers = it['theme_persistence']
        pstr = f" (과거 최장 {pers['max_run']}일 지속)" if pers else ''
        print(f"  [A][{it['theme']}]{pstr} {it['event_summary'][:45]} → 수혜: {stocks}")
    print(f"\n■ B등급 섹터급 ({len(tier_b)}건) / C등급 개별 ({len(tier_c)}건) / 신규테마후보 {len(unclassified)}건")
    for it in tier_b[:5]:
        print(f"  [B][{it['theme']}] {it['event_summary'][:50]}")
    print(f"\n저장: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
