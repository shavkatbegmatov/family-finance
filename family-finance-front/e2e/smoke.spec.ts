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
 * Oddiy oila foydalanuvchisi — CI workflow'i uni register API orqali yaratadi
 * ("CI demo oila hisobini yaratish" qadami). `admin` SUPER_ADMIN bo'lgani va
 * oila daraxtiga kira olmagani uchun 3D graf qismi shu hisob bilan sinaladi.
 * Lokal ishga tushirishda bunday hisob bo'lmasligi mumkin — test u holda
 * 3D bo'limini o'tkazib yuboradi.
 */
const FAMILY_USERNAME = 'ci_demo_family';
// PasswordPolicy: kamida 10 belgi + katta harf + kichik harf + raqam.
const FAMILY_PASSWORD = 'CiSmokeDemo2026';

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

/**
 * Login sahifasiga o'tib, berilgan hisob bilan kiradi (READ-ONLY auth).
 * `expectSuccess: false` bo'lsa muvaffaqiyatsizlik xato emas — chaqiruvchi
 * natijani o'zi hal qiladi (hisob mavjud bo'lmasligi mumkin bo'lgan holatlar).
 *
 * @returns kirish muvaffaqiyatli bo'ldimi
 */
async function login(
  page: Page,
  username = DEMO_USERNAME,
  password = DEMO_PASSWORD,
  expectSuccess = true,
): Promise<boolean> {
  await page.goto('/login');

  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Muvaffaqiyatli kirishdan keyin SPA bosh sahifaga (`/`) yo'naltiradi.
  // `/login` dan chiqib ketganini kutamiz (URL'da login qolmasligi shart).
  const ok = await page
    .waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: expectSuccess ? 30_000 : 15_000,
    })
    .then(() => true)
    .catch(() => false);

  if (!ok) {
    if (expectSuccess) throw new Error(`Login muvaffaqiyatsiz: ${username}`);
    return false;
  }

  await dismissPasswordChangeModal(page);
  return true;
}

/**
 * Sahifadagi JS xatolarini yig'a boshlaydi. React 19 ostida StrictMode
 * effektlarni ikki marta ishga tushiradi, shuning uchun effekt-og'ir
 * komponentlarda (WebSocket, WebGL) regressiya birinchi navbatda shu yerda
 * ko'rinadi.
 */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Yig'ilgan konsol xatolarini log qiladi va bo'sh bo'lishini talab qiladi. */
function assertNoConsoleErrors(errors: string[]): void {
  if (errors.length > 0) {
    console.warn(`[smoke] Konsol xatolari (${errors.length}):\n${errors.join('\n')}`);
  } else {
    console.log('[smoke] Konsol xatolari yo\'q.');
  }
  expect(errors, 'sahifada JS xatosi bo\'lmasligi kerak').toEqual([]);
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
   * Realtime (SockJS/STOMP bildirishnomalar) — Header mount bo'lishi bilan
   * ulanadi, ya'ni har qanday hisobda, superadmin'da ham ishlaydi.
   * StrictMode effektlari ikki marta ishga tushadigan joy, shuning uchun
   * asosiy signal — konsol xatolari.
   */
  test('realtime ulanish (READ-ONLY)', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    // SockJS WebSocket transportini tanlasa shu event ishlaydi; XHR-streaming
    // fallback'ida esa quyidagi /ws/info javobi dalil bo'ladi.
    const wsFrames: string[] = [];
    page.on('websocket', (ws) => wsFrames.push(ws.url()));

    const wsInfo = page
      .waitForResponse((r) => r.url().includes('/ws/info'), { timeout: 25_000 })
      .catch(() => null);

    await login(page);

    const info = await wsInfo;
    const realtimeStarted = Boolean(info) || wsFrames.length > 0;
    console.log(
      realtimeStarted
        ? `[smoke] Realtime handshake bajarildi (ws/info: ${info?.status() ?? 'yo\'q'}, websocket: ${wsFrames.length}).`
        : '[smoke] Realtime handshake kuzatilmadi.',
    );
    expect(realtimeStarted, 'WebSocket/SockJS handshake boshlanishi kerak').toBe(true);

    assertNoConsoleErrors(consoleErrors);
  });

  /**
   * 3D genealogiya grafi (three.js/WebGL) — eng og'ir effekt-komponent.
   *
   * Oddiy oila hisobi bilan kiriladi: `admin` SUPER_ADMIN va oila daraxtiga
   * kira olmaydi. Hisobni CI workflow'i register API orqali yaratadi; u
   * bo'lmasa (masalan lokal ishga tushirishda) test o'tkazib yuboriladi.
   *
   * READ-ONLY: faqat ko'rish rejimi almashtiriladi, hech narsa yozilmaydi.
   */
  test('3D graf render (READ-ONLY)', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    const loggedIn = await login(page, FAMILY_USERNAME, FAMILY_PASSWORD, false);
    test.skip(
      !loggedIn,
      `"${FAMILY_USERNAME}" hisobi yo'q — CI seed qadami ishlamagan yoki lokal ishga tushirish.`,
    );

    await page.goto('/family');

    const btn3d = page.getByRole('button', { name: /3D umumiy ko'rish rejimi/ });
    const has3d = await btn3d
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    expect(has3d, 'oila hisobida 3D rejim tugmasi bo\'lishi kerak').toBe(true);

    {
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

    assertNoConsoleErrors(consoleErrors);
  });
});
