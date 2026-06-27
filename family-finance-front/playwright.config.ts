import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke-test konfiguratsiyasi (G7 — minimal, READ-ONLY).
 *
 * <p>Maqsad: dev serverni ko'tarib, login → bosh sahifa → scope switcher
 * ko'rinishini tekshirish + a11y skan. HECH QANDAY yozish/tranzaksiya yo'q.</p>
 *
 * <p>Muhim: bu config `npm run build` (tsc -b + vite) ga KIRMAYDI — `e2e/`
 * papkasi asosiy tsconfig'dan EXCLUDE qilingan, Playwright esa testlarni
 * o'zining TypeScript transformeri bilan kompilyatsiya qiladi.</p>
 *
 * <p>Port 5178 — `vite.config.ts` `server.port` bilan bir xil (strictPort).</p>
 */
const PORT = 5178;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // CI'da flaky himoyasi; lokalda 0 (tez fikr-mulohaza).
  retries: process.env.CI ? 1 : 0,
  // Smoke seriyali — bitta dev server + login holati ustida ishlaymiz.
  workers: 1,
  // Butun yugurish uchun umumiy chegara (CI osilib qolmasin).
  globalTimeout: process.env.CI ? 5 * 60 * 1000 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    // Birinchi qayta-urinishda iz/skrinshot — debug uchun (CI artefakt).
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      // Pixel 5 ≈ 393px kenglik — mobil layout (BottomNav, MobileScopeSwitcher).
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Dev serverni avtomatik ko'tarish. Lokalda allaqachon ishlab tursa qayta
  // ishlatamiz; CI'da har doim yangi server (reuse yo'q).
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
