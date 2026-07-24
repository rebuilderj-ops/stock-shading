# -*- coding: utf-8 -*-
"""
[0단계] 역방향 기준 만들기 — 재료 지속성(Material Persistence) 분석기

기존 shadowing_real_history.json 은 '재료(reason/keywordName) → 실제 주가 반응(change_rate)'이
이미 라벨링된 데이터셋입니다. 이걸 뒤집어 "이 재료로 며칠 갔나"를 정량화합니다.

산출물:
  - src/data/material_persistence.json : 대시보드/뉴스 스코어링 rubric 튜닝의 기준 데이터
  - 콘솔 요약 : 일주일+ 지속된 '시장급' 재료(예: 호남 반도체)와 당일 소멸 재료의 대비

지속성 정의(거래일 기준):
  - 당일소멸      : 연속 1거래일만 등장
  - 단기(2~4일)   : 연속 2~4거래일
  - 지속(5일+)    : 연속 5거래일 이상 (≈ 일주일 이상, '시장급 재료' 후보)
"""
import os
import re
import sys
import json
from collections import defaultdict
from datetime import datetime

# Windows 콘솔(cp949)에서도 유니코드 출력이 깨지지 않도록 UTF-8로 강제
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

HISTORY_FILE = 'src/data/shadowing_real_history.json'
OUTPUT_FILE = 'src/data/material_persistence.json'


def load_history():
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_material_tag(reason):
    """reason 앞머리의 [말머리] 태그를 재료 식별자로 추출합니다. (예: '[호남 반도체] ...' -> '호남 반도체')"""
    if not reason:
        return None
    m = re.match(r'\s*\[([^\]]+)\]', reason)
    return m.group(1).strip() if m else None


def categorize(run_len):
    if run_len <= 1:
        return '당일소멸'
    if run_len <= 4:
        return '단기(2~4일)'
    return '지속(5일+)'


def build_runs(appeared_day_indices):
    """등장한 거래일 인덱스 집합에서 연속 구간(run)들의 길이 리스트를 만듭니다."""
    if not appeared_day_indices:
        return []
    idxs = sorted(appeared_day_indices)
    runs = []
    start = prev = idxs[0]
    for i in idxs[1:]:
        if i == prev + 1:
            prev = i
        else:
            runs.append((start, prev))
            start = prev = i
    runs.append((start, prev))
    return runs


def main():
    data = load_history()
    if not data:
        print('데이터가 비어 있습니다.')
        return

    # 거래일 캘린더 (정렬된 고유 날짜 -> 인덱스)
    trading_days = sorted(set(r['date'] for r in data))
    day_index = {d: i for i, d in enumerate(trading_days)}

    # ---------------- 테마(keywordName) 단위 지속성 ----------------
    theme_days = defaultdict(lambda: defaultdict(list))  # theme -> date -> [records]
    for r in data:
        kw = r.get('keywordName') or '미분류'
        theme_days[kw][r['date']].append(r)

    theme_persistence = []
    for theme, days in theme_days.items():
        day_idxs = {day_index[d] for d in days}
        runs = build_runs(day_idxs)
        run_details = []
        cat_dist = defaultdict(int)
        for (s, e) in runs:
            length = e - s + 1
            cat_dist[categorize(length)] += 1
            # 이 run 구간의 실제 반응 강도
            run_dates = [trading_days[i] for i in range(s, e + 1) if trading_days[i] in days]
            recs = [rec for d in run_dates for rec in days[d]]
            peak = max((rec.get('change_rate', 0) or 0) for rec in recs) if recs else 0
            run_details.append({
                'start': trading_days[s],
                'end': trading_days[e],
                'length': length,
                'peak_change': round(peak, 2),
                'record_count': len(recs),
            })
        lengths = [e - s + 1 for (s, e) in runs]
        theme_persistence.append({
            'theme': theme,
            'appeared_days': len(day_idxs),
            'run_count': len(runs),
            'max_run': max(lengths) if lengths else 0,
            'avg_run': round(sum(lengths) / len(lengths), 2) if lengths else 0,
            'category_dist': dict(cat_dist),
            'runs': sorted(run_details, key=lambda x: x['length'], reverse=True),
        })
    theme_persistence.sort(key=lambda x: (x['max_run'], x['appeared_days']), reverse=True)

    # ---------------- 재료(reason 말머리 태그) 단위 지속성 ----------------
    tag_records = defaultdict(list)  # tag -> [(date, record)]
    for r in data:
        tag = extract_material_tag(r.get('reason', ''))
        if tag:
            tag_records[tag].append(r)

    theme_names = set(theme_days.keys())
    material_persistence = []
    for tag, recs in tag_records.items():
        dates = sorted(set(rec['date'] for rec in recs))
        day_idxs = {day_index[d] for d in dates}
        runs = build_runs(day_idxs)
        max_run = max((e - s + 1 for (s, e) in runs), default=0)  # 실제 최장 연속 지속 거래일
        span = day_index[dates[-1]] - day_index[dates[0]] + 1     # 최초~최종 폭(참고용)
        stocks = sorted(set(rec.get('name', '?') for rec in recs))
        themes = sorted(set(rec.get('keywordName', '미분류') for rec in recs))
        material_persistence.append({
            'tag': tag,
            'is_theme_name': tag in theme_names,  # 테마명과 동일한 코스한 태그인지(세부 재료가 아님)
            'first_date': dates[0],
            'last_date': dates[-1],
            'max_run': max_run,
            'span_trading_days': span,
            'days_appeared': len(dates),
            'stock_count': len(stocks),
            'themes': themes,
            'sample_stocks': stocks[:8],
            'peak_change': round(max((rec.get('change_rate', 0) or 0) for rec in recs), 2),
            'category': categorize(max_run),
        })
    # 연속 지속(max_run) 우선 정렬
    material_persistence.sort(key=lambda x: (x['max_run'], x['days_appeared'], x['stock_count']), reverse=True)

    # ---------------- '시장급' 지속 재료 추출 ----------------
    # 세부 재료(테마명 태그 제외) 중 연속 5거래일 이상 지속 = 시장급 재료 후보
    long_lasting_themes = [t for t in theme_persistence if t['max_run'] >= 5]
    long_lasting_materials = [m for m in material_persistence
                              if m['max_run'] >= 5 and not m['is_theme_name']]

    output = {
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'trading_days': len(trading_days),
        'date_range': [trading_days[0], trading_days[-1]],
        'category_definition': {
            '당일소멸': '연속 1거래일',
            '단기(2~4일)': '연속 2~4거래일',
            '지속(5일+)': '연속 5거래일 이상 (시장급 재료 후보)',
        },
        'theme_persistence': theme_persistence,
        'material_persistence': material_persistence[:120],
        'long_lasting_themes': long_lasting_themes,
        'long_lasting_materials': long_lasting_materials,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # ---------------- 콘솔 요약 ----------------
    print('=' * 60)
    print(' [0단계] 재료 지속성 분석 결과')
    print('=' * 60)
    print(f"분석 기간: {trading_days[0]} ~ {trading_days[-1]} ({len(trading_days)}거래일)")
    print()
    print('■ 지속력 상위 테마 (max_run = 최장 연속 급등 거래일)')
    for t in theme_persistence[:10]:
        print(f"  - {t['theme']:12s} 최장 {t['max_run']}일 연속 / 총 {t['appeared_days']}일 등장 / 평균런 {t['avg_run']}일")
    print()
    print('■ 시장급 세부 재료 후보 (테마명 제외, 연속 5거래일+ 지속)')
    if long_lasting_materials:
        for m in long_lasting_materials[:15]:
            print(f"  - [{m['tag']}] 최장 {m['max_run']}일 연속 / {m['first_date']}~{m['last_date']} "
                  f"/ {m['days_appeared']}일 등장 / {m['stock_count']}종목 / 테마 {m['themes']}")
    else:
        print('  (없음 - 세부 재료 대부분이 당일~단기 소멸. 지속성은 테마 레벨에서 발생)')
    print()
    print('■ 당일 소멸형 세부 재료 예시 (max_run 1일, 개별 이벤트성 → C등급 후보)')
    oneday = [m for m in material_persistence if m['max_run'] == 1 and not m['is_theme_name']][:12]
    for m in oneday:
        print(f"  - [{m['tag']}] {m['first_date']} / {m['stock_count']}종목 / 테마 {m['themes']}")
    print()
    print(f"기준 데이터 저장 완료: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
