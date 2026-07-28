import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // TODO: 콘솔 등록명으로 교체
  appName: 'budget-balance',
  brand: {
    displayName: '월간 예산 잔액 관리',
    primaryColor: '#3182f6',
    // TODO: 콘솔 아이콘 URL로 교체
    icon: 'https://static.toss.im/appsintoss/icon-placeholder.png',
  },
  permissions: [],
  web: {
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  outdir: 'dist',
});
