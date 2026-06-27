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
}

test.describe('Smoke (READ-ONLY)', () => {
  test('login → bosh sahifa → scope switcher ko\'rinadi + a11y skan', async ({ page }, testInfo) => {
    await login(page);

    // --- Bosh sahifa ko'rinishi ---
    // "Bosh sahifa" sarlavhasi Header breadcrumb'ida (desktop) va mobil <h1>'da
    // chiqadi; bir nechta joyda bo'lishi mumkin, shuning uchun .first().
    await expect(
      page.getByText(/Bosh sahifa|Dashboard/).first(),
    ).toBeVisible({ timeout: 30_000 });

    // --- Scope switcher ko'rinishi ---
    // Desktop: ScopeSwitcher tugmasi title="Aktiv scope'ni o'zgartirish".
    // Mobil:   MobileScopeSwitcher chip aria-label="Aktiv scope: ...".
    // Ikkala variantni ham qoplaydigan locator (faqat scope ma'lumoti
    // yuklangach ko'rinadi — myScopes bo'sh bo'lsa null qaytaradi).
    const scopeSwitcher = page
      .locator(
        'button[title="Aktiv scope\'ni o\'zgartirish"], button[aria-label^="Aktiv scope"]',
      )
      .first();

    await expect(scopeSwitcher).toBeVisible({ timeout: 30_000 });

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
});
