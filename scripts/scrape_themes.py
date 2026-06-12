import urllib.request
from bs4 import BeautifulSoup
import time
import json

def build_theme_db():
    print("Naver Finance Theme Scraping Started...")
    themes = {} # theme_name -> list of stock_codes
    stock_to_themes = {} # stock_code -> list of theme_names
    
    # Let's just fetch page 1 for test
    url = 'https://finance.naver.com/sise/theme.naver?field=name&ordering=asc&page=1'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('euc-kr', errors='ignore')
    soup = BeautifulSoup(html, 'html.parser')
    
    for a in soup.select('.theme_name a'):
        theme_name = a.text.strip()
        theme_url = 'https://finance.naver.com' + a['href']
        print(f"Fetching {theme_name}...")
        
        try:
            req_t = urllib.request.Request(theme_url, headers={'User-Agent': 'Mozilla/5.0'})
            html_t = urllib.request.urlopen(req_t).read().decode('euc-kr', errors='ignore')
            soup_t = BeautifulSoup(html_t, 'html.parser')
            
            codes = []
            for item in soup_t.select('.name .name_area'):
                # Extract stock code from href
                href = item.select_one('a')['href']
                code = href.split('code=')[1]
                codes.append(code)
                
                if code not in stock_to_themes:
                    stock_to_themes[code] = []
                stock_to_themes[code].append(theme_name)
                
            themes[theme_name] = codes
            time.sleep(0.1)
        except Exception as e:
            print(e)
        
        break # Just test the first theme
    
    print(f"Found {len(themes)} themes and mapped {len(stock_to_themes)} stocks.")
    return stock_to_themes

build_theme_db()
