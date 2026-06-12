import re

with open('src/pages/ShadowingDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add a wrapper for responsive table
if 'overflow-x-auto' not in text:
    text = text.replace('<table className="w-full text-left', '<div className="overflow-x-auto w-full pb-4"><table className="w-full text-left min-w-[700px]')
    text = text.replace('</table>', '</table></div>')

# Add 당일 종가 column headers
if '당일 종가' not in text:
    text = text.replace('<th>등락률</th>', '<th>당일 종가</th><th>등락률</th>')
    text = text.replace('<td className="text-right', '<td className="font-mono text-slate-300 px-4 py-4">{stock.close_price ? (stock.close_price).toLocaleString() + "원" : "-"}</td>\n                  <td className="text-right')

with open('src/pages/ShadowingDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated ShadowingDashboard UI')
