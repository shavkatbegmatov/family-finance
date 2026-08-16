# Ko'p tillilik (i18n) — ish rejasi

**Holat:** 2026-08-17 — qaror qabul qilindi, i18next **saqlanadi** va bosqichma-bosqich ulanadi.
**Hozirgi qamrov:** ~0% (infratuzilma bor, hech bir komponent ishlatmaydi).

---

## 1. Hozirgi holat (audit)

`src/i18n/index.ts` i18next'ni `uz` (default) va `ru` bilan ishga tushiradi, `main.tsx`
uni import qiladi — ya'ni **runtime tayyor**. Lekin:

- `useTranslation()` / `t()` kod bazasida **hech qayerda** chaqirilmaydi
- til almashtirish UI **yo'q** (`i18n.changeLanguage` chaqiruvi yo'q)
- barcha matnlar komponentlarda hardcoded (o'zbek lotin)

### Mavjud kalitlar: 142 (uz va ru — to'liq juftlik)

| Bo'lim | Kalit | Holat |
|--------|-------|-------|
| `points` | 49 | ✅ Loyihaga to'liq mos (Ball tizimi, Ishtirokchilar, Ayirboshlash) |
| `profile` | 20 | ✅ Mos |
| `auth` | 11 | ✅ Mos |
| `debts` | 11 | ✅ Mos |
| `common` | 10 | ✅ Mos |
| `dashboard` | 9 | ✅ Mos |
| `notifications` | 8 | ✅ Mos |
| `nav` | 5 | ✅ Mos |
| `purchases` | 13 | ❌ Begona — "Hisob-faktura", "Mahsulotlar" (savdo ilovasi) |
| `payment` | 3 | ❌ Begona — invoice to'lov holati |
| `status` | 3 | ⚠️ Qisman — "Qaytarilgan" (refunded) savdo tushunchasi |

**Ishlatishga yaroqli: 123 kalit.** Bu kutilganidan yaxshi asos.

### Ko'chirilgan asos belgilari

Til sozlamasi `localStorage['portal-language']` deb saqlanadi — "portal" bu loyihaning
nomi emas. `purchases`/`payment` bo'limlari bilan birga, bu i18n asosi **boshqa
loyihadan ko'chirilganini** ko'rsatadi. Shuning uchun B0 bosqichida tozalash kerak.

### Ish hajmi

| O'lcham | Qiymat |
|---------|--------|
| Sahifalar | 51 |
| Komponentlar | 195 |
| Taxminiy foydalanuvchi matnlari | ~1500–2000 (grep `>matn<` naqshi 500 beradi; placeholder, toast, `aria-label`, `title`, tugma matnlari qo'shilsa 3-4 barobar) |
| Hozirgi qamrov | 123 kalit ≈ **6–8%** |

---

## 2. Strategiya

**Bosqichma-bosqich, foydalanuvchi ko'rish chastotasi bo'yicha.** "Hammasini birdan"
qilish 40–60 soatlik blokirovka bo'ladi va yarim yo'lda qolsa kod bazasi ikki uslubda
qoladi.

Har bosqich **mustaqil deploy qilinadi** va o'z-o'zicha qiymat beradi.

**Asosiy qoida:** yangi kod **darhol** `t()` bilan yoziladi (bosqich navbatini kutmasdan) —
aks holda qarz o'sishda davom etadi.

---

## 3. Bosqichlar

### B0 — Asos va tozalash (~3 soat)

Kod ko'chirishdan oldin bir marta bajariladi.

1. **Begona kalitlarni olib tashlash:** `purchases`, `payment` (16 kalit).
   `status` — "Qaytarilgan" o'chiriladi, qolgan ikkitasi `common`ga ko'chiriladi.
2. **`portal-language` → `ff-language`** (`src/i18n/index.ts`). Eski kalitni bir marta
   o'qib ko'chirish shart emas — hech kim ishlatmagan.
3. **Namespace strategiyasi:** hozircha bitta `translation` namespace qoladi (142 kalit
   uchun bo'lish ortiqcha). **≥400 kalitda** `common` + per-modul namespace'larga
   bo'linadi va lazy `import()` qo'shiladi (bundle'ni bo'lish uchun).
4. **Kalit nomlash konvensiyasi** (quyida, 4-bo'lim) `CLAUDE.md` ga yoziladi.
5. **ESLint qoidasi** (ixtiyoriy, lekin tavsiya): `react/jsx-no-literals` faqat
   ko'chirilgan papkalar uchun yoqiladi — regressiyani oldini oladi.

### B1 — Til almashtirish + doim ko'rinadigan qatlam (~6 soat)

Foydalanuvchi darhol natijani ko'radi.

- **Til almashtirish UI:** `ProfilePage` sozlamalarida (asosiy) + ixtiyoriy `Header`
  dropdown. `i18n.changeLanguage(lng)` + `localStorage`.
- **Ko'chiriladi:** `Header`, `Sidebar`, `BottomNav`, `PageHeader`, `LoginPage`,
  `RegisterPage`, umumiy tugma/modal matnlari (`common`, `nav`, `auth` — 26 kalit tayyor).
- **`<html lang>`** atributi til bilan yangilanadi (a11y + SEO).

### B2 — Points moduli (~4 soat)

**49 kalit allaqachon tayyor** — eng arzon qamrov. `pages/points/*` va
`components/points/*`.

### B3 — Moliyaviy yadro (~12 soat)

Eng ko'p ishlatiladigan sahifalar: Dashboard, Transactions, Accounts, Debts, Budgets,
Savings, Daily expenses. `dashboard`/`debts` kalitlari qisman tayyor (20 kalit).

### B4 — Oila va scope (~10 soat)

Family tree, Household, Members, Scope management, Schools/Classes.
Bu yerda matn ko'p va o'zbek terminologiyasi nozik (qarindoshlik atamalari) —
rus tiliga tarjima **alohida ko'rib chiqilishi** kerak (masalan "kelin", "kuyov",
"jiyan" — ruschada bir so'zli aniq ekvivalenti yo'q).

### B5 — Admin va qolgani (~8 soat)

Admin panel, Users, Roles, Audit log, Reports, Settings. Bu qatlamni oxirida qoldirish
mumkin — undan asosan bitta super admin foydalanadi.

---

## 4. Texnik qarorlar

### Kalit nomlash

```
<modul>.<ekran yoki blok>.<element>
```
Masalan: `transactions.filters.dateFrom`, `family.member.deleteConfirm`.

- Kalit **inglizcha**, qiymat tarjima qilinadi
- Umumiy takrorlanuvchi matnlar (`Saqlash`, `Bekor qilish`, `Yuklanmoqda...`) —
  faqat `common.*` da, modul ichida takrorlanmaydi
- Interpolatsiya: `t('debts.remaining', { amount })` — satr birlashtirish (`+`) **yo'q**,
  chunki so'z tartibi tillarda farq qiladi

### Ko'plik (plural)

Ruschada 3 shakl (1 / 2-4 / 5+), o'zbekchada 1 shakl. i18next `_one`/`_few`/`_many`
suffikslarini o'zi hal qiladi — **qo'lda `if` yozilmaydi**:

```json
{ "items_one": "{{count}} ta yozuv", "items_other": "{{count}} ta yozuv" }
```

### Sana, son, valyuta

`t()` bilan **emas**, `Intl` bilan: `Intl.NumberFormat(lng)`, `Intl.DateTimeFormat(lng)`.
Hozirgi `config/constants.ts` dagi `formatCurrency` / `formatDate` helperlari faol tilni
qabul qiladigan qilib yangilanadi. `MONTHS_UZ` massivi `Intl` bilan almashtiriladi.

### Tarjima qilinmaydigan joylar

- **`data/changelog.ts`** — versiya tarixi; tarjima qilinsa har yozuv ikki tilda yozilishi
  kerak bo'ladi. Hozircha o'zbekcha qoladi (qaror keyin ko'rib chiqiladi).
- **Backend xato xabarlari** — `BadRequestException` matnlari serverdan o'zbekcha keladi.
  To'liq ko'p tillilik uchun backend `errorCode` qaytarishi va front uni tarjima qilishi
  kerak. **Bu alohida katta vazifa** (D3 `errorCode` ishi bilan bog'liq) — 6-bo'limga qarang.
- Loyiha nomi, brend matnlari.

---

## 5. Tekshirish

- **`npm run build`** — `tsc` yetishmayotgan kalitni ko'rmaydi, shuning uchun:
- **Kalit butunligi skripti:** `uz.json` va `ru.json` kalitlari **aynan** mos kelishini
  tekshiradigan kichik Vitest testi (`i18n.test.ts`) — B0 da yoziladi. Bu eng arzon
  himoya: bir tilda kalit qo'shilib, ikkinchisida unutilishi eng tez-tez uchraydigan xato.
- **Qo'lda:** har bosqichdan keyin ikkala tilda asosiy oqim ko'zdan kechiriladi.
- Front'da **React Testing Library o'rnatilmagan** — komponent darajasida avtomatik
  tekshiruv hozircha yo'q (alohida vazifa).

---

## 6. Ochiq savollar (qaror kerak)

1. **Rus tili qanchalik shoshilinch?** Agar yaqin oylarda kerak bo'lsa — B1+B2 dan
   boshlanadi (10 soat, ko'rinadigan natija). Agar "kelajakda" bo'lsa — B0 (3 soat)
   bajarilib, qolgani yangi kod yozilgan sari tabiiy o'sadi.
2. **Backend xabarlari tarjima qilinadimi?** Hozir server xatolari o'zbekcha keladi va
   rus tilida ham o'zbekcha ko'rinadi. To'liq yechim `errorCode` talab qiladi
   (backend + front, ~8 soat). Oraliq variant: eng ko'p uchraydigan 20-30 xabar uchun
   front'da `errorCode`siz matn-moslashtirish (mo'rt, tavsiya etilmaydi).
3. **Uchinchi til (ingliz)?** Agar rejada bo'lsa, kalit nomlash va plural qoidalari
   hozirdanoq shunga mos yoziladi (qo'shimcha xarajat deyarli yo'q).
4. **`changelog.ts` tarjima qilinadimi?**

---

## 7. Xulosa

| Bosqich | Hajm | Natija |
|---------|------|--------|
| B0 | ~3 soat | Toza asos, konvensiya, kalit-butunlik testi |
| B1 | ~6 soat | Til almashtirish ishlaydi, doim ko'rinadigan qatlam ikki tilda |
| B2 | ~4 soat | Points moduli (49 kalit tayyor) |
| B3 | ~12 soat | Moliyaviy yadro |
| B4 | ~10 soat | Oila va scope (terminologiya nozik) |
| B5 | ~8 soat | Admin va qolgani |
| **Jami** | **~43 soat** | To'liq qamrov (backend xabarlaridan tashqari) |

**Tavsiya:** B0 + B1 + B2 (≈13 soat) — bu til almashtirishni **ishlaydigan** holatga
keltiradi va foydalanuvchi ko'radigan qatlamning katta qismini qoplaydi. Qolgani
prioritet bo'yicha, yangi kod esa darhol `t()` bilan yoziladi.
