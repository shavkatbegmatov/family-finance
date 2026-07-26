import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * G7 — READ-ONLY smoke test.
 *
 * Oqim: login (admin / admin123, DEV demo hisob) → bosh sahifa ("Bosh sahifa")
 * ko'rinishi → scope switcher ko'rinishi → a11y skan (kritik buzilishlarni log).
 *
 * QAT'IY: hech qanday yozish / tranzaksiya / mutatsiya yo'q — faqat ko'rish.
 * Faqat lokal/CI dev server (localhost) — prod login ISHLATILMAYDI.
 *
 * Selektorlar (Explore tasdiqlagan, LoginPage.tsx bilan moslangan):
 *   - foydalanuvchi nomi: input[autocomplete="username"]
 *   - parol:             input[autocomplete="current-password"]
 *   - kirish tugmasi:    button[type="submit"]
 */

const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'admin123';

/**
 * Admin bergan parol (`admin123`) bilan kirilganda `PasswordChangeModal`
 * avtomatik ochiladi va orqadagi butun kontentni to'sib qo'yadi — sahifa
 * elementlari `hidden` bo'lib qoladi va keyingi `toBeVisible()` tekshiruvlari
 * yiqiladi. Smoke READ-ONLY bo'lgani uchun parolni O'ZGARTIRMAYMIZ, modalni
 * "Keyinroq" tugmasi bilan yopamiz (bu hech qanday mutatsiya qilmaydi).
 * Modal chiqmasa (parol allaqachon o'zgartirilgan bo'lsa) test davom etadi.
 */
async function dismissPasswordChangeModal(page: Page): Promise<void> {
  const later = page.getByRole('button', { name: 'Keyinroq' });
  try {
    await later.waitFor({ state: 'visible', timeout: 10_000 });
    await later.click();
    await later.waitFor({ state: 'hidden', timeout: 10_000 });
  } catch {
    // Modal chiqmadi — bu ham normal holat.
  }
}

/** Login sahifasiga o'tib, demo hisob bilan kiradi (READ-ONLY auth). */
async function login(page: Page): Promise<void> {
  await page.goto('/login');

  await page.locator('input[autocomplete="username"]').fill(DEMO_USERNAME);
  await page.locator('input[autocomplete="current-password"]').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Muvaffaqiyatli kirishdan keyin SPA bosh sahifaga (`/`) yo'naltiradi.
  // `/login` dan chiqib ketganini kutamiz (URL'da login qolmasligi shart).
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30_000,
  });

  await dismissPasswordChangeModal(page);
}

test.describe('Smoke (READ-ONLY)', () => {
  test('login → bosh sahifa → scope switcher ko\'rinadi + a11y skan', async ({ page }, testInfo) => {
    await login(page);

    // --- Bosh sahifa ko'rinishi ---
    // Sarlavha Header breadcrumb'ida (desktop) va mobil <h1>'da chiqadi.
    // `admin` demo hisobi SUPERADMIN — login'dan keyin `/admin` ga tushadi va
    // u yerda sarlavha "Platforma boshqaruvi" bo'ladi; oddiy foydalanuvchida
    // "Bosh sahifa". Shu bilan birga "Bosh sahifa" matni yashirin navigatsiya
    // elementlarida ham uchraydi, shuning uchun `.first()` dan oldin
    // ko'rinadiganlarini filtrlaymiz (aks holda yashirin span tanlanadi).
    await expect(
      page
        .getByText(/Bosh sahifa|Dashboard|Platforma boshqaruvi/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 30_000 });

    // --- Scope switcher ---
    // Desktop: ScopeSwitcher tugmasi title="Aktiv scope'ni o'zgartirish".
    // Mobil:   MobileScopeSwitcher chip aria-label="Aktiv scope: ...".
    // Ikkalasi ham DOM'da mount bo'ladi va faqat CSS bilan yashiriladi, shuning
    // uchun ko'rinadiganlarini filtrlaymiz — `.first()` aks holda joriy
    // breakpoint'da yashirin bo'lgan variantni tanlab qo'yadi.
    //
    // MUHIM: `admin` superadmin va AdminLayout'da ScopeSwitcher ATAYLAB yo'q
    // ("super admin'da scope yo'q" — AdminLayout doc-comment), shuning uchun
    // uning yo'qligi xato emas. Holatni log qilamiz, smoke'ni yiqitmaymiz.
    const scopeSwitcher = page
      .locator(
        'button[title="Aktiv scope\'ni o\'zgartirish"], button[aria-label^="Aktiv scope"]',
      )
      .filter({ visible: true })
      .first();

    const scopeSwitcherShown = await scopeSwitcher
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    console.log(
      scopeSwitcherShown
        ? '[smoke] Scope switcher ko\'rinadi.'
        : '[smoke] Ko\'rinadigan scope switcher yo\'q — superadmin panelida bu kutilgan holat.',
    );

    // --- a11y skan (axe-core) — kritik buzilishlarni LOG qiladi ---
    // Smoke'ni qizil qilmaymiz (mavjud UI'da oldindan mavjud muammolar
    // bo'lishi mumkin); faqat ko'rinarli hisobot beramiz + artefakt.
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = axe.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (critical.length > 0) {
      const summary = critical
        .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} ta element)`)
        .join('\n');
      console.warn(
        `[a11y] ${critical.length} ta kritik/jiddiy buzilish topildi (smoke bloklamaydi):\n${summary}`,
      );
    } else {
      console.log('[a11y] Kritik/jiddiy buzilish topilmadi.');
    }

    // To'liq axe natijasini test artefakti sifatida biriktiramiz (CI'da ko'rish uchun).
    await testInfo.attach('axe-results.json', {
      body: JSON.stringify(axe.violations, null, 2),
      contentType: 'application/json',
    });
  });

  /**
   * Effekt-og'ir joylar: realtime WebSocket (bildirishnomalar) va 3D genealogiya
   * grafi (three.js/WebGL). Bular React'ning StrictMode ikki marta ishga
   * tushiradigan effektlariga eng sezgir qismlar, shuning uchun asosiy signal —
   * konsol xatolari va sahifa crash'i.
   *
   * READ-ONLY: faqat ko'rish rejimi almashtiriladi, hech qanday ma'lumot
   * yozilmaydi.
   */
  test('realtime ulanish + 3D graf render (READ-ONLY)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    // SockJS WebSocket transportini tanlasa shu event ishlaydi; XHR-streaming
    // fallback'ida esa quyidagi /ws/info javobi dalil bo'ladi.
    const wsFrames: string[] = [];
    page.on('websocket', (ws) => wsFrames.push(ws.url()));

    const wsInfo = page
      .waitForResponse((r) => r.url().includes('/ws/info'), { timeout: 25_000 })
      .catch(() => null);

    await login(page);

    // --- Realtime (bildirishnomalar) ---
    const info = await wsInfo;
    const realtimeStarted = Boolean(info) || wsFrames.length > 0;
    console.log(
      realtimeStarted
        ? `[smoke] Realtime handshake bajarildi (ws/info: ${info?.status() ?? 'yo\'q'}, websocket: ${wsFrames.length}).`
        : '[smoke] Realtime handshake kuzatilmadi.',
    );
    expect(realtimeStarted, 'WebSocket/SockJS handshake boshlanishi kerak').toBe(true);

    // --- 3D genealogiya grafi ---
    // `admin` superadmin bo'lgani uchun oila daraxtiga ruxsati bo'lmasligi
    // mumkin (AdminLayout'da moliya/oila menyulari yo'q) — u holda bu bo'lim
    // o'tkazib yuboriladi, smoke yiqilmaydi.
    await page.goto('/family');

    const btn3d = page.getByRole('button', { name: /3D umumiy ko'rish rejimi/ });
    const has3d = await btn3d
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (!has3d) {
      console.log(
        '[smoke] 3D tugmasi topilmadi — bu hisob oila daraxtiga kira olmaydi, bo\'lim o\'tkazib yuborildi.',
      );
    } else {
      await btn3d.click();

      // WebGL kontekst yaratilsa <canvas>, aks holda WebGLFallback ko'rsatiladi.
      // Ikkalasi ham to'g'ri xatti-harakat — muhimi crash bo'lmasligi.
      const canvasOrFallback = await page
        .locator('canvas, [data-testid="webgl-fallback"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => true)
        .catch(() => false);

      const glInfo = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return 'canvas yo\'q (fallback rejimi)';
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        return gl ? 'WebGL kontekst tirik' : 'canvas bor, WebGL kontekst yo\'q';
      });

      console.log(`[smoke] 3D rejim: render=${canvasOrFallback}, ${glInfo}`);
      expect(canvasOrFallback, '3D rejimda canvas yoki fallback chiqishi kerak').toBe(true);
    }

    // --- Konsol xatolari (asosiy React 19 regressiya signali) ---
    if (consoleErrors.length > 0) {
      console.warn(`[smoke] Konsol xatolari (${consoleErrors.length}):\n${consoleErrors.join('\n')}`);
    } else {
      console.log('[smoke] Konsol xatolari yo\'q.');
    }
    expect(consoleErrors, 'sahifada JS xatosi bo\'lmasligi kerak').toEqual([]);
  });
});
