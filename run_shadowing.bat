@echo off
chcp 65001 > nul
echo =========================================
echo 주식 쉐도잉 데이터 크롤링 자동 시작 (오후 4시)
echo =========================================
cd /d "C:\Users\metu9\OneDrive\Desktop\JM"

:: 가상환경이 있다면 활성화, 없으면 Global py 사용
echo 스크립트를 실행합니다...
py scripts\update_shadowing.py

echo Vercel 서버 배포를 위해 GitHub에 데이터를 전송합니다...
git add src/data/shadowing_real_history.json
git commit -m "🤖 [Local Bot] Daily Stock Shadowing Updated (Local Task)"
git push origin main

echo 완료되었습니다.
:: 일정 시간 후 창 닫기
timeout /t 10 > nul
exit
