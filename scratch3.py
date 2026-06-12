import re

with open('src/pages/KeywordEncyclopedia.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'overflow-x-auto' not in text:
    text = text.replace('<table className="w-full text-left', '<div className="overflow-x-auto w-full pb-4"><table className="w-full text-left min-w-[700px]"')
    text = text.replace('</table>', '</table></div>')

with open('src/pages/KeywordEncyclopedia.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated KeywordEncyclopedia UI')
