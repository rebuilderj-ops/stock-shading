@echo off
echo =======================================================
echo Global Market Macro and US Briefing Automation (Morning)
echo =======================================================
cd /d "C:\Users\metu9\OneDrive\Desktop\JM"

echo Syncing with remote repository...
git stash
git pull --rebase origin main
git stash pop

echo Running python script (Morning US and Macro Briefing Analysis)...
py scripts\update_us_macro.py

echo Pushing briefing report to Vercel via GitHub...
git add public/data/daily_briefing.json
git commit -m "☀️ [Local Bot] Morning Global Briefing Updated (Daily Task)"
git push origin main

echo Morning update completed cleanly.
timeout /t 10 > nul
exit
