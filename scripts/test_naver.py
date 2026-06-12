import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import re

def get_naver_theme(stock_name):
    url = f'https://search.naver.com/search.naver?query={urllib.parse.quote(stock_name + " 테마")}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        
        # Naver search often highlights themes in the text
        # Let's see if there's a specific box
        texts = soup.get_text()
        return "SUCCESS"
    except Exception as e:
        return str(e)

print(get_naver_theme('LS일렉트릭'))
print(get_naver_theme('에스피지'))
