import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Family Finance — Capacitor (Android APK) sozlamalari.
 *
 * Web ilova `dist/` ga build qilinadi va APK ichiga joylab beriladi (offline'da
 * UI ishlaydi). API chaqiruvlari `VITE_API_BASE_URL` orqali boshqariladi —
 * APK build qilishdan oldin uni real backend manziliga qo'ying, masalan:
 *   VITE_API_BASE_URL="http://192.168.1.33:8098/api" npm run build
 *
 * `cleartext: true` faqat LAN'dagi http backend uchun kerak. Ishlab chiqarishda
 * (https backend) buni olib tashlang.
 */
const config: CapacitorConfig = {
  appId: 'uz.familyfinance.app',
  appName: 'Family Finance',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
