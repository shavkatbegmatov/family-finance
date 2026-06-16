import { defineConfig } from 'vitest/config';

/**
 * Vitest uchun alohida, minimal config — ataylab `vite.config.ts` dan ajratilgan.
 *
 * Sabab: vite.config.ts VitePWA, manualChunks, SockJS polyfill kabi production-build
 * sozlamalarini yuklaydi; ularni test ishga tushishida bajarish keraksiz va sekin.
 * Hozircha faqat toza-mantiq (util) testlari — `node` muhiti yetarli (DOM/jsdom shart emas).
 * Komponent testlari qo'shilganda bu yerga `environment: 'jsdom'` + setup qo'shiladi.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // CI'da bir marta ishlab chiqib chiqadi (watch yo'q) — `vitest run` orqali.
    passWithNoTests: false,
  },
});
