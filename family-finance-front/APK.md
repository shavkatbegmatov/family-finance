# Family Finance — Android APK build qilish (Capacitor)

Web ilova [Capacitor](https://capacitorjs.com/) yordamida Android APK'ga paketlanadi.
Web fayllar (`dist/`) APK ichiga joylab beriladi — UI offline ishlaydi, API
chaqiruvlari esa tarmoqdagi backend'ga boradi.

## Talablar (bir marta)

- **JDK 21** — oddiy HotSpot JDK (Temurin/Adoptium, Microsoft OpenJDK yoki Android
  Studio JBR). ⚠️ **GraalVM JDK ishlamaydi** — uning `jlink`/`JdkImageTransform`
  bilan muammosi bor (`Failed to transform core-for-system-modules.jar` xatosi).
- **Android SDK** (platform `android-36`, build-tools 35+). Android Studio orqali
  o'rnatiladi. `android/local.properties` faylida `sdk.dir` ko'rsatiladi (bu fayl
  gitignore qilingan, mashinaga xos).

`JAVA_HOME` agar GraalVM'ga o'rnatilgan bo'lsa, build paytida oddiy JDK'ga
yo'naltiring (PowerShell):

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"
```

## API manzilini sozlash (MUHIM)

APK ichida Vite proxy ishlamaydi, shuning uchun **backend manzilini build paytida**
`VITE_API_BASE_URL` orqali bering. Telefon `localhost`ga ko'ra olmaydi — kompyuteringizning
LAN IP'sini yoki deploy qilingan domenni ishlating:

```powershell
$env:VITE_API_BASE_URL = "http://192.168.1.33:8098/api"   # misol: LAN IP
```

> Eslatma: http (https emas) backend uchun `capacitor.config.ts` da `cleartext: true`
> yoqilgan. Ishlab chiqarishda https backend ishlating va uni o'chiring.
> Backend CORS sozlamalarida ham mobil origin (`https://localhost`) ruxsat etilishi kerak.

## Build (debug APK)

```powershell
# 1) Web + sync + APK (bitta buyruq):
npm run apk:debug

# YOKI qadamba-qadam:
npm run build                 # dist/ yaratadi
npx cap sync android          # dist'ni android loyihasiga ko'chiradi
cd android
./gradlew assembleDebug       # APK build qiladi
```

Tayyor APK:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Uni telefonga o'tkazib o'rnatish mumkin (Settings → "Noma'lum manbalar"ga ruxsat),
yoki ulangan qurilmaga:

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Release APK (imzolangan) — keyinroq

Do'konga/tarqatishga imzolangan APK kerak. Imzo kaliti (keystore) **maxfiy** —
repozitoriyga qo'shilmaydi. Qisqacha:

```powershell
keytool -genkey -v -keystore family-finance.keystore -alias ff -keyalg RSA -keysize 2048 -validity 10000
# android/app/build.gradle ga signingConfigs qo'shing yoki gradle.properties orqali bering
cd android
./gradlew assembleRelease
```

## Ilovani Android Studio'da ochish

```powershell
npx cap open android
```

## Foydali

- Ikonka/splash: `dist/` ichidagi PWA ikonkalari ishlatiladi. Native adaptiv ikonka
  uchun `android/app/src/main/res/` ni yangilang (yoki `@capacitor/assets`).
- App ID: `uz.familyfinance.app` (`capacitor.config.ts`).
