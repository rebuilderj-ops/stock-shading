// scripts/copy_api.js
import fs from 'fs';
import path from 'path';

// 진짜 주소와 복사될 타겟 주소를 지정합니다.
const sourceFile = path.resolve('src/data/shadowing_real_history.json');
const targetDir = path.resolve('public/api');
const targetFile = path.resolve('public/api/history.json');

try {
  // api 폴더가 없으면 새로 만듭니다 (수납장 설치)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 원본 파일을 복사해서 덮어씌웁니다.
  fs.copyFileSync(sourceFile, targetFile);
  console.log("✅ [성공] 클로드용 데이터가 public/api/history.json 경로에 안전하게 복사되었습니다!");
} catch (error) {
  console.error("❌ [실패] 복사 중 오류 발생:", error);
}
