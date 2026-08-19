import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

/**
 * Ko'p tillilik asosi. Reja va bosqichlar: `docs/i18n-plan.md`.
 *
 * Kalitlar bitta `translation` namespace'da turadi — 125 kalit uchun bo'lish ortiqcha.
 * ~400 kalitdan oshganda per-modul namespace + lazy `import()` ga o'tiladi.
 */

/** Qo'llab-quvvatlanadigan tillar — yangi til shu yerga qo'shiladi. */
export const SUPPORTED_LANGUAGES = ['uz', 'ru'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'uz';

/**
 * localStorage kaliti. Eski nom `portal-language` edi — u boshqa loyihadan ko'chib
 * kelgan (bu ilova "portal" emas). Ko'chirish kerak emas: i18n hali hech qayerda
 * ishlatilmagan, ya'ni saqlangan tanlov ham yo'q.
 */
const LANGUAGE_STORAGE_KEY = 'ff-language';

function isSupported(value: string | null): value is AppLanguage {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function readSavedLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupported(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    // localStorage bloklangan bo'lishi mumkin (private rejim, qat'iy cookie siyosati)
    return DEFAULT_LANGUAGE;
  }
}

/** `<html lang>` — ekran o'quvchilari va brauzer (imlo, tarjima taklifi) uchun. */
function syncHtmlLang(lng: string): void {
  document.documentElement.lang = lng;
}

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: readSavedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false, // React o'zi escape qiladi
  },
});

syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

/** Tilni almashtiradi va tanlovni saqlaydi (B1 dagi til almashtirish UI shuni chaqiradi). */
export function changeLanguage(lng: AppLanguage): Promise<unknown> {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // saqlab bo'lmasa ham til shu sessiyada almashaveradi
  }
  return i18n.changeLanguage(lng);
}

export default i18n;
