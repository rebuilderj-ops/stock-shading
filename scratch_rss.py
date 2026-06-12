import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

def get_google_news(stock_name):
    query = urllib.parse.quote(stock_name + " 특징주")
    url = f"https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            titles = []
            for item in root.findall('.//item')[:5]:
                title = item.find('title').text
                # Clean up "- 파이낸셜뉴스" etc.
                if ' - ' in title:
                    title = title.rsplit(' - ', 1)[0]
                titles.append(title)
            return " / ".join(titles)
    except Exception as e:
        return str(e)

print(get_google_news("삼성전자"))
print(get_google_news("휴림로봇"))
