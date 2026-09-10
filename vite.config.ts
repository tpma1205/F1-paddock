import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base 對應 GitHub Pages 的專案型網址 https://<user>.github.io/f1-paddock/
// 見 docs/adr/0002-github-pages-with-prerendered-routes.md
export default defineConfig({
  base: '/f1-paddock/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
