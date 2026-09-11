import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base 對應 GitHub Pages 的專案型網址 https://<user>.github.io/f1-paddock/
// 見 docs/adr/0002-github-pages-with-prerendered-routes.md
export default defineConfig({
  base: '/f1-paddock/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /*
         * 第三方套件與資料分開打包：
         * - vendor：react / motion / router，幾個月才動一次，瀏覽器可長期快取
         * - data：快照與賽道外框，每週更新
         * 每週部署因此只失效 data 與應用程式碼，不必重下載 vendor。
         */
        manualChunks: (id) => {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/data/snapshots/') || id.includes('/src/data/circuits/')) return 'data';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
