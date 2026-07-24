@echo off
echo =========================================
echo Stock Shadowing Data Crawling Automation (9:00 PM)
echo =========================================
cd /d "C:\Users\metu9\OneDrive\Desktop\JM"

echo Syncing with remote repository before running scripts...
git stash
git pull --rebase origin main
git stash pop

echo Resolving any potential JSON merge conflicts...
py scripts\resolve_json_conflict.py

echo Fetching Naver Themes Cache...
py scripts\update_naver_themes.py

echo Running python script (KR Market Shadowing)...
py scripts\update_shadowing.py

echo Running python script (Evening Briefing Analysis)...
py scripts\update_kr_briefing.py

echo [0-Stage] Rebuilding material persistence baseline...
py scripts\analyze_material_persistence.py

echo [1-2 Stage] Collecting news and clustering events...
py scripts\collect_news.py

echo [3-4 Stage] LLM rubric scoring and theme-stock mapping...
py scripts\score_news.py

echo [6-Stage] Validating prior news predictions...
py scripts\validate_news_predictions.py

echo Pushing data to Vercel via GitHub...
git add src/data/shadowing_real_history.json public/data/daily_briefing.json src/data/material_persistence.json public/data/daily_news_briefing.json public/data/news_validation.json src/data/news_briefing_history.json
git commit -m "📈 [Local Bot] Daily Stock Shadowing, KR Briefing & News Impact Updated (9:00 PM)"
git push origin main

echo Finished cleanly.
timeout /t 10 > nul
exit