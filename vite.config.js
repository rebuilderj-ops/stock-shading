import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 최신 자바스크립트 문법을 옛날 스마트폰이나 카카오톡 웹뷰에서도 안전하게 해석할 수 있도록 표준 구형 문법(es2015)으로 변환 빌드합니다.
    target: 'es2015',
    cssTarget: 'chrome61'
  }
})
