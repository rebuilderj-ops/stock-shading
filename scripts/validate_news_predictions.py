# -*- coding: utf-8 -*-
"""
[6단계 검증 루프]

전날 A/B 등급으로 걸었던 뉴스 테마가 '실제로 움직였는지'를 자동 기록합니다.
매핑된 테마의 D+1 / D+3 / D+5 실제 반응(급등 종목 수·평균 등락률)을
shadowing_real_history.json 에서 회수해 예측 적중을 채점합니다.

이게 세 가지를 동시에 해결합니다:
  1) rubric 튜닝 근거 (어느 축이 실제 예측력 있는지 실측)
  2) 서비스 차별점 (적중률 공개)
  3) 무인가 투자자문 리스크 회피 ('추천'이 아니라 '과거 유사 재료의 통계적 반응')

동작:
  - 오늘자 daily_news_briefing.json 의 A/B 테마·등급을 news_briefing_history.json 에 누적(날짜 키)
  - 누적된 각 예측일에 대해, forward 데이터가 쌓인 만큼 D+1/D+3/D+5 반응을 계산
  - 산출: public/data/news_validation.json (대시보드 '적중률' 표시용)
"""
import os
import sys
import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

KST = timezone(timedelta(hours=9))
BRIEFING_FILE = 'public/data/daily_news_briefing.json'
HISTORY_FILE = 'src/data/shadowing_real_history.json'
ARCHIVE_FILE = 'src/data/news_briefing_history.json'
OUTPUT_FILE = 'public/data/news_validation.json'


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def briefing_date(briefing):
    ts = briefing.get('generated_at', '')
    return ts.split(' ')[0] if ts else datetime.now(KST).strftime('%Y-%m-%d')


def archive_today(briefing):
    """오늘 A/B 예측을 아카이브에 누적(날짜 키, 재실행 시 덮어씀)."""
    archive = load_json(ARCHIVE_FILE, {}) or {}
    date = briefing_date(briefing)
    preds = []
    for tier, grade in (('tier_a_market', 'A'), ('tier_b_sector', 'B')):
        for it in briefing.get(tier, []):
            if it.get('theme') and it['theme'] != '미분류':
                preds.append({
                    'theme': it['theme'],
                    'grade': grade,
                    'event_summary': it.get('event_summary', ''),
                    'rubric': it.get('rubric', {}),
                })
    archive[date] = preds
    os.makedirs(os.path.dirname(ARCHIVE_FILE), exist_ok=True)
    with open(ARCHIVE_FILE, 'w', encoding='utf-8') as f:
        json.dump(archive, f, ensure_ascii=False, indent=2)
    return archive, date


def build_theme_reaction_index(history):
    """(date, theme) → 급등종목 수·평균등락률·총거래대금."""
    idx = defaultdict(lambda: {'count': 0, 'change_sum': 0.0, 'vol': 0})
    for r in history:
        kw = r.get('keywordName')
        d = r.get('date')
        if not kw or not d:
            continue
        slot = idx[(d, kw)]
        slot['count'] += 1
        slot['change_sum'] += (r.get('change_rate', 0) or 0)
        slot['vol'] += (r.get('volume_krw', 0) or 0)
    return idx


def main():
    print('=' * 60)
    print(' [6단계] 뉴스 예측 검증 루프')
    print('=' * 60)

    briefing = load_json(BRIEFING_FILE)
    if briefing:
        archive, today = archive_today(briefing)
        print(f"오늘({today}) A/B 예측 {len(archive.get(today, []))}건 아카이브 완료")
    else:
        archive = load_json(ARCHIVE_FILE, {}) or {}
        print('오늘 브리핑 없음 - 기존 아카이브만으로 검증합니다.')

    history = load_json(HISTORY_FILE, [])
    trading_days = sorted(set(r['date'] for r in history))
    day_pos = {d: i for i, d in enumerate(trading_days)}
    reaction = build_theme_reaction_index(history)

    def reaction_at(theme, base_date, offset):
        """base_date 로부터 offset 거래일 뒤의 테마 반응."""
        if base_date not in day_pos:
            return None
        j = day_pos[base_date] + offset
        if j >= len(trading_days):
            return None  # 아직 forward 데이터 없음
        d = trading_days[j]
        slot = reaction.get((d, theme))
        if not slot or slot['count'] == 0:
            return {'date': d, 'moved': False, 'count': 0, 'avg_change': 0.0, 'vol': 0}
        return {'date': d, 'moved': True, 'count': slot['count'],
                'avg_change': round(slot['change_sum'] / slot['count'], 2), 'vol': slot['vol']}

    results = []
    grade_hits = defaultdict(lambda: {'total': 0, 'hit_d1': 0, 'hit_d3': 0, 'hit_d5': 0})
    for date in sorted(archive.keys()):
        for pred in archive[date]:
            theme = pred['theme']
            r1, r3, r5 = (reaction_at(theme, date, k) for k in (1, 3, 5))
            # forward 데이터가 아직 없으면 검증 보류
            if r1 is None and r3 is None and r5 is None:
                continue
            g = pred['grade']
            grade_hits[g]['total'] += 1
            if r1 and r1['moved']:
                grade_hits[g]['hit_d1'] += 1
            if r3 and r3['moved']:
                grade_hits[g]['hit_d3'] += 1
            if r5 and r5['moved']:
                grade_hits[g]['hit_d5'] += 1
            results.append({
                'predict_date': date, 'theme': theme, 'grade': g,
                'event_summary': pred.get('event_summary', ''),
                'd1': r1, 'd3': r3, 'd5': r5,
            })

    def rate(h, k):
        return round(100 * h[k] / h['total'], 1) if h['total'] else None
    summary = {g: {'evaluated': h['total'],
                   'hit_rate_d1': rate(h, 'hit_d1'),
                   'hit_rate_d3': rate(h, 'hit_d3'),
                   'hit_rate_d5': rate(h, 'hit_d5')}
               for g, h in grade_hits.items()}

    out = {
        'generated_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S'),
        'note': '적중=예측 테마가 해당 D+n 거래일에 6%+ 급등 종목을 실제로 배출했는지 여부. 매수·매도 추천 아님(과거 반응 통계).',
        'summary_by_grade': summary,
        'details': results[-200:],
    }
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print('\n■ 등급별 적중률 (테마가 실제 급등 종목을 배출한 비율)')
    if summary:
        for g in ('A', 'B'):
            if g in summary:
                s = summary[g]
                print(f"  [{g}] 검증 {s['evaluated']}건 → D+1 {s['hit_rate_d1']}% / D+3 {s['hit_rate_d3']}% / D+5 {s['hit_rate_d5']}%")
    else:
        print('  아직 검증 가능한 예측이 없습니다. (forward 데이터가 쌓이면 자동 채워집니다)')
    print(f"\n저장: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
