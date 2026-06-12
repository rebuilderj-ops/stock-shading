import re

with open('scripts/update_shadowing.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Modify get_surged_stocks_fdr to extract Close and filter SPACs
replacement_1 = """def get_surged_stocks_fdr(target_date):
    print("FinanceDataReader를 통해 코스피/코스닥 전 종목 시세 수집 시작...")
    results = []
    
    try:
        df_kospi = fdr.StockListing('KOSPI')
        df_kosdaq = fdr.StockListing('KOSDAQ')
        df = pd.concat([df_kospi, df_kosdaq])
        
        for _, row in df.iterrows():
            code = str(row['Code'])
            name = str(row['Name'])
            
            # 스팩주 원천 차단
            if '스팩' in name or 'SPAC' in name.upper():
                continue
                
            change_rate = float(row['ChagesRatio']) if not pd.isna(row['ChagesRatio']) else 0.0
            amount = float(row['Amount']) if not pd.isna(row['Amount']) else 0.0
            vol_krw = int(amount / 100000000)
            vol_cnt = int(row['Volume']) if not pd.isna(row['Volume']) else 0
            close_price = int(row['Close']) if not pd.isna(row['Close']) else 0
            
            if (change_rate >= 6.0 and vol_krw >= 300) or change_rate >= 29.5:
                results.append({
                    "date": f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}",
                    "code": code,
                    "name": name,
                    "close_price": close_price,
                    "change_rate": round(change_rate, 2),
                    "volume_krw": vol_krw,
                    "volume_cnt": vol_cnt
                })
        print(f"전 종목 조회 성공! 필터링된 종목 수: {len(results)}개")
        return results"""

text = re.sub(r'def get_surged_stocks_fdr.*?return results', replacement_1, text, flags=re.DOTALL)

with open('scripts/update_shadowing.py', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Python rewrite 1 complete")
