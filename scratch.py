import re

with open('src/pages/LandingPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

replacement_checklist = """const checklistNames = {
    c1: "테마 지속 1~5일 내 신선도",
    c2: "전일 거래대금 1000억 이상 돌파",
    c3: "단독/수주/임상 등 강력한 모멘텀",
    c4: "테마 선도 대장주 프리미엄",
    c5: "직전 거래일 상승률 15% 이상 돌파",
    c6: "동일 테마 종목 다수 동반 상승",
    c7: "최근 3일 연속 등반 없는 눌림목",
    c8: "분기 누적 거래액 상위 메가 트렌드",
    c9: "하루 거래량 500만 주 이상 폭발",
    c10: "AI 통계적 승률 80% 이상 조건",
    c11: "전일 종가 5000원 이상 우량주"
  };"""

text = re.sub(r'const checklistNames = \{[\s\S]*?c10.*?\}[\s\S]*?;', replacement_checklist, text)
text = text.replace('11-Point Checklist', '11-Point Checklist').replace('10-Point Checklist', '11-Point Checklist')
text = text.replace('Score: {rec.totalScore}/100', 'Score: {rec.totalScore}/110')
text = text.replace('단기 목표가 (추정)', '당일 종가 (Close)')
text = text.replace('{rec.targetPrice}원', '{rec.close_price?.toLocaleString() || "-"}원')

with open('src/pages/LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated LandingPage UI')
