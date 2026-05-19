import json
import re

def fix_json_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Use regex to find all JSON objects. They look like:
    # {
    #     "date": "...",
    #     ...
    # }
    # Since our objects don't contain nested objects, a simple regex or finding curly braces works.
    # A robust way is to just find everything between { and }
    objects_str = re.findall(r'\{[^{}]+\}', content)
    
    valid_objects = []
    for obj_str in objects_str:
        try:
            obj = json.loads(obj_str)
            if 'date' in obj and 'code' in obj:
                valid_objects.append(obj)
        except json.JSONDecodeError:
            pass
            
    # Deduplicate by date and code
    seen = set()
    deduped = []
    for obj in valid_objects:
        key = (obj['date'], obj['code'])
        if key not in seen:
            seen.add(key)
            deduped.append(obj)
            
    # Sort by date
    deduped.sort(key=lambda x: x['date'])
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(deduped, f, ensure_ascii=False, indent=4)
        
    print(f"Successfully fixed {filename}. Extracted {len(deduped)} valid records.")

fix_json_file('src/data/shadowing_real_history.json')
