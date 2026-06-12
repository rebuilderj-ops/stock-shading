import re

with open('src/lib/recommendationEngine.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Make c11 mandatory in the filter map
text = text.replace(
    '''const qualified = scoredStocks.filter(s => s.checks.c1 && !s.stockName.includes('스팩'));''',
    '''const qualified = scoredStocks.filter(s => s.checks.c1 && s.checks.c11 && !s.stockName.includes('스팩'));'''
)

with open('src/lib/recommendationEngine.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Penny stocks excluded')
