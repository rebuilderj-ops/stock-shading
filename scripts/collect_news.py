# -*- coding: utf-8 -*-
"""
[1단계 수집 + 2단계 중복제거/클러스터링]

- 언론사 증권섹션 RSS + (선택)DART 공시 OpenAPI 에서 당일 뉴스를 수집합니다.
- 원문 전문은 저장하지 않고 요약+링크만 저장합니다(저작권).
- 같은 사건이 여러 매체에 실린 것을 명사 자카드 유사도로 묶어 이벤트 클러스터를 만듭니다.
  · 최초 보도시각 = 클러스터 대표값(신규성 판단 재료)
  · 클러스터에 붙은 기사 수 = 시장 관심도 지표(스코어 입력값)

산출물:
  - src/data/news_raw.json      : 원자료(발행시각/매체/제목/요약/URL/카테고리)
  - src/data/news_clusters.json : 이벤트 클러스터(3단계 LLM 스코어링 입력)

DART 공시를 포함하려면 .env.local 에 DART_API_KEY 를 설정하세요(무료: opendart.fss.or.kr).
키가 없으면 RSS 만으로 동작합니다.
"""
import os
import re
import sys
import json
import html
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

load_dotenv('.env.local')
DART_API_KEY = os.environ.get('DART_API_KEY', '')

KST = timezone(timedelta(hours=9))

# 증권/경제 섹션 RSS (매일경제는 403 차단으로 제외; 필요시 추가)
RSS_SOURCES = [
    ('한국경제', 'https://www.hankyung.com/feed/finance', '증권'),
    ('이데일리', 'https://rss.edaily.co.kr/stock_news.xml', '증권'),
    ('연합뉴스', 'https://www.yna.co.kr/rss/economy.xml', '경제'),
]

RAW_FILE = 'src/data/news_raw.json'
CLUSTER_FILE = 'src/data/news_clusters.json'

# 제목 토큰화 시 제거할 흔한 불용어/증권 상투어
STOPWORDS = set("""
특징주 종목 관련주 테마주 상승 하락 강세 약세 급등 급락 상한가 오늘 장중 마감 개장 증시 코스피 코스닥
전일 대비 기록 돌파 상회 하회 전망 분석 속보 단독 종합 그림 사진 영상 뉴스 기자 정정 재송 오전 오후
""".split())

TAG_RE = re.compile(r'<[^>]+>')
TOKEN_RE = re.compile(r'[가-힣A-Za-z0-9]{2,}')


def strip_html(text):
    if not text:
        return ''
    return html.unescape(TAG_RE.sub('', text)).strip()


def fetch_rss(name, url, category, max_retries=2):
    items = []
    raw = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=12) as resp:
                raw = resp.read()
            break
        except Exception as e:
            print(f"[RSS 재시도 {attempt+1}/{max_retries}] {name}: {e}")
            if attempt < max_retries - 1:
                import time as _t; _t.sleep(1.5)
    if raw is None:
        return items
    try:
        root = ET.fromstring(raw)
        for it in root.findall('.//item'):
            title = strip_html((it.findtext('title') or ''))
            link = (it.findtext('link') or '').strip()
            desc = strip_html((it.findtext('description') or ''))[:200]
            pub = (it.findtext('pubDate') or '').strip()
            try:
                pub_dt = parsedate_to_datetime(pub).astimezone(KST) if pub else None
            except Exception:
                pub_dt = None
            if not title or not link:
                continue
            items.append({
                'published_at': pub_dt.strftime('%Y-%m-%d %H:%M') if pub_dt else '',
                'source': name,
                'title': title,
                'summary': desc,
                'url': link,
                'category': category,
            })
    except Exception as e:
        print(f"[RSS 실패] {name}: {e}")
    return items


def fetch_dart(days=1, limit=100):
    """DART OpenAPI 공시 목록(최근). 신뢰도 축 최고점 소스. 키 없으면 빈 리스트."""
    if not DART_API_KEY:
        print('[DART] DART_API_KEY 미설정 - 공시 수집 생략 (RSS 만으로 진행)')
        return []
    end = datetime.now(KST)
    start = end - timedelta(days=days)
    url = ('https://opendart.fss.or.kr/api/list.json?'
           + urllib.parse.urlencode({
               'crtfc_key': DART_API_KEY,
               'bgn_de': start.strftime('%Y%m%d'),
               'end_de': end.strftime('%Y%m%d'),
               'page_no': 1, 'page_count': limit,
           }))
    items = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        if data.get('status') != '000':
            print(f"[DART] 응답 상태 {data.get('status')}: {data.get('message')}")
            return []
        for row in data.get('list', []):
            rcept = row.get('rcept_no', '')
            items.append({
                'published_at': f"{row.get('rcept_dt','')}",
                'source': f"DART/{row.get('corp_name','')}",
                'title': row.get('report_nm', ''),
                'summary': f"{row.get('corp_name','')} {row.get('report_nm','')}",
                'url': f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept}",
                'category': '공시',
            })
    except Exception as e:
        print(f"[DART 실패] {e}")
    return items


def tokenize(title):
    toks = {t for t in TOKEN_RE.findall(title) if t not in STOPWORDS and len(t) >= 2}
    return toks


def jaccard(a, b):
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def cluster_events(articles, threshold=0.4):
    """명사 자카드 유사도로 같은 사건 기사들을 그리디 클러스터링."""
    token_sets = [tokenize(a['title']) for a in articles]
    n = len(articles)
    assigned = [-1] * n
    clusters = []
    for i in range(n):
        if assigned[i] != -1:
            continue
        cid = len(clusters)
        assigned[i] = cid
        members = [i]
        for j in range(i + 1, n):
            if assigned[j] != -1:
                continue
            if jaccard(token_sets[i], token_sets[j]) >= threshold:
                assigned[j] = cid
                members.append(j)
        clusters.append(members)

    result = []
    for cid, members in enumerate(clusters):
        arts = [articles[m] for m in members]
        # 최초 보도 시각 = 대표값
        times = [a['published_at'] for a in arts if a['published_at']]
        first_seen = min(times) if times else ''
        sources = sorted(set(a['source'] for a in arts))
        # 대표 제목: 가장 긴(정보량 많은) 제목
        rep = max(arts, key=lambda a: len(a['title']))
        result.append({
            'cluster_id': cid,
            'representative_title': rep['title'],
            'summary': rep['summary'],
            'first_seen': first_seen,
            'article_count': len(arts),        # 관심도 지표
            'source_count': len(sources),      # 매체 확산도
            'sources': sources,
            'has_disclosure': any(a['category'] == '공시' for a in arts),  # 공시 포함=신뢰도↑
            'titles': [a['title'] for a in arts][:8],
            'urls': [a['url'] for a in arts][:8],
        })
    # 관심도(기사 수) 높은 순
    result.sort(key=lambda c: (c['article_count'], c['source_count']), reverse=True)
    return result


def main():
    print('=' * 60)
    print(' [1단계] 뉴스 수집 + [2단계] 이벤트 클러스터링')
    print('=' * 60)

    articles = []
    for name, url, cat in RSS_SOURCES:
        got = fetch_rss(name, url, cat)
        print(f"  {name}: {len(got)}건")
        articles.extend(got)
    dart = fetch_dart()
    if dart:
        print(f"  DART 공시: {len(dart)}건")
    articles.extend(dart)

    # URL 기준 중복 제거
    seen = set()
    deduped = []
    for a in articles:
        if a['url'] in seen:
            continue
        seen.add(a['url'])
        deduped.append(a)
    print(f"\n원자료 {len(articles)}건 → URL 중복제거 후 {len(deduped)}건")

    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    with open(RAW_FILE, 'w', encoding='utf-8') as f:
        json.dump({'collected_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S'),
                   'count': len(deduped), 'articles': deduped}, f, ensure_ascii=False, indent=2)

    clusters = cluster_events(deduped)
    multi = [c for c in clusters if c['article_count'] >= 2]
    print(f"이벤트 클러스터 {len(clusters)}개 (2건+ 묶인 이벤트 {len(multi)}개)")

    with open(CLUSTER_FILE, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S'),
                   'cluster_count': len(clusters), 'clusters': clusters}, f, ensure_ascii=False, indent=2)

    print('\n■ 관심도 상위 이벤트 클러스터 (기사 많이 붙은 순 = 시장 관심도)')
    for c in clusters[:12]:
        disc = ' [공시]' if c['has_disclosure'] else ''
        print(f"  ({c['article_count']}건/{c['source_count']}매체){disc} {c['representative_title'][:50]}")

    print(f"\n저장: {RAW_FILE}, {CLUSTER_FILE}")


if __name__ == '__main__':
    main()
