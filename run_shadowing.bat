@echo off
chcp 65001 > nul
echo =========================================
echo Stock Shadowing Data Crawling Automation (4:00 PM)
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

echo Running python script...
py scripts\update_shadowing.py

echo Pushing data to Vercel via GitHub...
git add src/data/shadowing_real_history.json
git commit -m "?? [Local Bot] Daily Stock Shadowing Updated (Local Task)"
git push origin main

echo Finished cleanly.
timeout /t 10 > nul
exit