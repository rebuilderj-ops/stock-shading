import urllib.request
from bs4 import BeautifulSoup
import time
import json
import os

def build_theme_db():
    print("Naver Finance Theme Scraping Started...")
    stock_to_themes = {} # stock_code -> list of theme_names
    
    # Naver themes typically span around 7-8 pages
    for page in range(1, 9):
        print(f"Fetching Naver Theme List Page {page}...")
        url = f'https://finance.naver.com/sise/theme.naver?field=name&ordering=asc&page={page}'
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            html = urllib.request.urlopen(req, timeout=10).read().decode('euc-kr', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            
            links = soup.find_all('a', href=True)
            theme_links = [(a.text.strip(), a['href']) for a in links if 'sise_group_detail.naver' in a['href']]
            
            if not theme_links:
                break # Reached the end of pages
                
            for name, href in theme_links:
                t_url = 'https://finance.naver.com' + href
                try:
                    t_req = urllib.request.Request(t_url, headers={'User-Agent': 'Mozilla/5.0'})
                    t_html = urllib.request.urlopen(t_req, timeout=10).read().decode('euc-kr', errors='ignore')
                    t_soup = BeautifulSoup(t_html, 'html.parser')
                    
                    for a in t_soup.find_all('a', href=True):
                        if 'main.naver?code=' in a['href']:
                            code = a['href'].split('code=')[1]
                            if code not in stock_to_themes:
                                stock_to_themes[code] = []
                            if name not in stock_to_themes[code]:
                                stock_to_themes[code].append(name)
                except Exception as e:
                    print(f"Error fetching theme details {name}: {e}")
                    
                time.sleep(0.1) # Be nice to Naver servers
                
        except Exception as e:
            print(f"Error fetching page {page}: {e}")
            break

    print(f"Found {len(stock_to_themes)} stocks mapped to Naver Official Themes.")
    
    out_dir = 'src/data'
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    out_path = os.path.join(out_dir, 'naver_themes.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(stock_to_themes, f, ensure_ascii=False, indent=4)
        
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    build_theme_db()
