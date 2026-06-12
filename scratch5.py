# -*- coding: utf-8 -*-
import json

with open('src/data/shadowing_real_history.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

new_data = []
for d in data:
    name = d.get('name', '')
    if '스팩' in name or 'SPAC' in name.upper():
        continue
    
    if '리센스메디컬' in name:
        d['keywordName'] = 'K-바이오 (주도)'
        d['reason'] = '[K-바이오 (주도)] 피부 냉각마취 의료기기 코스닥 입성 당일 강세 부각'
    
    new_data.append(d)

with open('src/data/shadowing_real_history.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=4)

print("JSON completely cleaned")
