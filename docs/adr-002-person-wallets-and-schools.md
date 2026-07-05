# ADR-002: Shaxsiy hamyonlar, maktablar va moliya tamoyillari

> **Status:** Qabul qilingan (Accepted) — barcha qarorlar mahsulot egasi bilan tasdiqlangan
> (2026-07-05) · **Asos:** [`adr-001`](./adr-001-genealogy-finance-decoupling.md) (genealogiya↔moliya
> decoupling) · **Holat:** hujjat — implementatsiya P1'dan boshlanadi.

## 1. Kontekst

ADR-001 genealogiya (graf) va moliyani (daraxt) ajratdi, lekin ikkita savolni ochiq qoldirdi:
Points tizimi kimga tegishli (u hali `family_group`ga bog'langan — 14 entity) va `FamilyGroup`ning
yakuniy taqdiri. Mahsulot egasi vizionni aniqlashtirdi:

1. **Ball — xonadon farzandiga** qo'yiladi (shaxsga, oila kontekstida).
2. **Maktablar**: keyinchalik platformada "maktab" ochiladi → ichida guruhlar (sinflar) →
   farzandlar yozilib, u yerda ham ball oladi.
3. **Har user — kamida bitta xonadon a'zosi** (avtomatik).
4. **Moliya shaxsga bog'lanadi**; umumiy hisoblar **faqat xonadon darajasida**.

## 2. Qarorlar

### Q1 — Hamyonlar: har (shaxs, kontekst) jufti uchun ALOHIDA balans

`Hamyon = (FamilyMember, kontekst-Scope)`. Uy hamyoni (kontekst=HOUSEHOLD) pulga
konvertatsiya qilinishi MUMKIN (ota-ona tasdig'i bilan); sinf hamyoni (kontekst=CLASS) —
FAQAT obro'/reyting/maktab-ichki mukofotlar, pulga konvertatsiya YO'Q.

**Nega:** balanslar aralashsa, maktabda qo'yilgan ball uyda pulga aylanadi — o'qituvchi
bevosita "pul chiqaruvchi"ga aylanadi (iqtisodiy teshik + suiiste'mol yo'li). Valyutalar
hech qachon kesishmaydi.

### Q2 — PROJECT/EVENT/FUND scope turlari bekor qilinadi

To'y/hashar/fond kabi ko'p-xonadonli yig'inlar: **tashkilotchi xonadonidagi `SavingsGoal`**
(maqsad) + boshqa xonadonlardan **hissa-transferlar** (kim qancha qo'shgani ko'rinadi, egalik
aniq). TRUSTEE/PROPERTY ham keyinga — hozircha yaratish bloklanadi.

**Nega:** bu turlar uchun UI hech qachon qurilmagan (CreateScopeWizard yo'q); ularda hisob
ochish "umumiy hisob faqat xonadonda" qoidasiga zid; scope daraxti soddalashadi:
`HOUSEHOLD`, `GROUP`, (keyin `SCHOOL`/`CLASS`).

### Q3 — PERSONAL hisoblar faqat egasiga ko'rinadi

Hozirgi xulq saqlanadi va qotiriladi: xonadon hisobotlariga faqat umumiy (`FAMILY`)
hisoblar kiradi. Kattalar moliyaviy erkinligi — default.

## 3. Target model

```
SHAXS (FamilyMember — login IXTIYORIY, bola akkauntsiz bo'lishi normal)
  ├── shaxsiy hisoblar (Account.owner=FamilyMember, AccountScope.PERSONAL)
  ├── xonadon a'zoligi → umumiy hisoblar (AccountScope.FAMILY, homeScope=HOUSEHOLD)
  └── HAMYONLAR (ball):
        ├── uy hamyoni   (kontekst = o'z xonadoni)  → konvertatsiya ✓ (ota tasdig'i)
        └── sinf hamyoni (kontekst = CLASS)          → konvertatsiya ✗ (reyting/mukofot)

SCOPE daraxti:
  HOUSEHOLD (root bo'la oladi)  ← hisoblar FAQAT shu yerda (+ SYSTEM_TRANSIT global)
  GROUP (ixtiyoriy)             ← faqat ko'rish/birlashtirish, hisobsiz
  SCHOOL (root, tekshiruvli) → CLASS  ← ball konteksti, moliya YO'Q
```

## 4. Aniqlangan xavflar va yechimlari

| # | Xavf | Yechim |
|---|------|--------|
| K1 | Uy↔maktab ballari aralashuvi (o'qituvchi = pul chiqaruvchi) | Q1: alohida hamyonlar, konvertatsiya faqat uy kontekstida |
| K2 | Bola ko'pincha loginsiz — `ScopeMembership` (user-based) yetmaydi | Sinfga yozilish = yangi `Enrollment` (FamilyMember ↔ CLASS); ball shaxsga, userga emas. `PointParticipant` allaqachon shu naqshda (familyMember FK + nickname) |
| K3 | Maktab tenant chegarasini kesadi: begona oilalar bolalari bir ro'yxatda | Ota-ona roziligi (consent) yozilishda; sinf ichida **nickname-first** ko'rsatish; "maktab ochish" tekshiruvli (platforma admin tasdig'i) — aks holda bolalar ro'yxatini yig'ish vektori |
| K4 | "Umumiy hisob faqat xonadonda" to'y/hasharni yo'qotadi | Q2: SavingsGoal + hissa-transferlar naqshi |

## 5. Hozirgi kod mosligi (2026-07-05 o'lchovi)

| Tamoyil | Fakt | Moslik |
|---------|------|--------|
| User → avto-xonadon | ADR-001 F3C: root HOUSEHOLD provisioning | ✅ 100% |
| Moliya shaxsga | `Account.owner` = FamilyMember; `AccountScope` PERSONAL/FAMILY; `homeScope` | 🟡 ~80% — GROUP-level hisob ochish hali mumkin; legacy `Account.familyGroup` yozilmoqda (`AccountService`) |
| Ball → shaxsga | `PointParticipant`: `familyMember` FK (nullable — loginsiz bola!) + nickname/avatar + `scope` (HOUSEHOLD, NOT NULL) | 🟡 ~70% — model tayyor; 14 entity'dagi `family_group` kaliti ortiqcha; hamyon-kontekst ajratish yo'q |
| Maktablar | Yo'q; `Scope`+membership mashinasi generik | 🔴 0% (poydevor mos) |

## 6. Bosqichlar

- **P1 — Points → (shaxs, kontekst)** ✅ **BAJARILDI** (PR #265/#266/#267/#268, PROD):
  - P1a (`V56`): 9 jadvalga `scope_id` + deterministik backfill (participant.scope / fg-admin
    household) + 11 yozish nuqtasida dual-write; `createOrUpdate` scope-bug fix.
  - P1b: 12 repo / 31 o'qish query scope'ga; yagona kalit
    `PointConfigService.getActiveHouseholdScopeId()`; sed'dan keyin qo'lda tutilgan 4 aralash
    joy (fg-id scope o'rnida) + 2 tashqi badge-lookup (member-based bo'ldi).
  - P1c (`V57`): 14 jadvaldan `family_group_id` DROP; unique constraintlar `(scope, ...)`ga
    (V25 ularni UNIQUE INDEX qilib yaratgani uchun DROP CONSTRAINT+DROP INDEX ikkalasi — #268
    fix); scope_id NOT NULL (global achievements'dan tashqari); **Q1 guard kodda**:
    konvertatsiya faqat `HOUSEHOLD` hamyonida; participant yaratish konteksti aniq XONADON.
  - Saboq: `UNSTABLE` (Integration Tests tugamay) merge qilmaslik — u aynan V57 xatosini
    ushlagan edi; PROD o'sha paytda eski konteynerda xavfsiz qolgan (Flyway rollback).
- **P2 — Moliya qoidasini qotirish** ✅ **BAJARILDI** (`V58`):
  - Hisob ochish faqat XONADONDA: `AccountService.create` → `getActiveHousehold().orElseThrow`
    (DB CHECK emas — PG'da cross-table CHECK yo'q, servis darajasida qotirildi).
  - `Account.familyGroup` DROP (V58): entity, accCode generatsiyasi (`homeScope`-based),
    `findFamilyAccountsByScopeId`, audit-map, seed SQL.
  - **Q3 maxfiylik FIX**: "Barcha hisoblar" (`findByScopeId`) va dropdown
    (`findActiveByScopeId`) boshqalarning PERSONAL hisoblarini ko'rsatib yuborardi —
    endi `FAMILY OR meniki OR menga ulashilgan` sharti bilan.
- **P3 — Scope soddalashuvi** ✅ **BAJARILDI**: PROJECT/EVENT/FUND/TRUSTEE/PROPERTY yaratish
  servis darajasida bloklandi (aniq xato xabari SavingsGoal'ga yo'naltiradi); enum qiymatlari
  `@Deprecated` (mavjud ma'lumot o'qiladi). UI allaqachon faqat GROUP yaratadi.
  **`tree_id` rename — ATAYLAB KEYINGA**: P1/P2'dan keyin `family_group` faqat genealogiya
  (users, family_members, family_address_history) va auth oqimlarida — rename endi semantik
  jihatdan halol, LEKIN `User.familyGroup` autentifikatsiya/provisioning'ning hamma joyida:
  churn yuqori, funksional foyda nol. Maktablar (P4) bilan birga yoki alohida kichik
  sessiyada qilinadi.
- **P4 — Maktablar MVP** (qarorlar 2026-07-05: tasdiq=SUPER_ADMIN; nickname MAJBURIY;
  maktab do'koni MVP'da BOR; 18 yosh — qo'lda o'tkazish):
  - **P4a (backend) ✅ BAJARILDI** (`V59`): `SCHOOL` (root, ariza→`isActive=false`→SUPER_ADMIN
    approve) / `CLASS` (parent=SCHOOL) turlari; `Enrollment` (FamilyMember↔CLASS, nickname
    NOT NULL, consentBy=ota-ona, qayta-yozilish LEFT→ENROLLED); yozilganda sinf hamyoni
    (PointParticipant scope=CLASS, nickname bilan) + Balance/Savings avtomatik; ota-onaga
    sinfda VIEWER (mavjud visibility infra); o'qituvchi = CLASS ADMIN. `SchoolController`
    (`/v1/schools/*`). **Kalit kengaytma:** `getActiveHouseholdScopeId` → hamyon-kontekst
    (HOUSEHOLD **yoki** CLASS) — P1 tufayli reyting/do'kon/topshiriqlar sinfda avtomatik
    ishlaydi; konvertatsiya guard'i CLASS'ni baribir rad etadi.
  - **P4b (frontend) ✅ BAJARILDI** (PROD, v1.13.0): `/schools` sahifasi (sinf kodi bilan
    yozish — taxallus majburiy; maktab arizasi; sinf ochish; ro'yxat+kod nusxalash),
    `/admin/schools` tasdiq UI, scopeTypeMeta SCHOOL/CLASS, SCHOOL container sifatida
    Switcher'da (🎓 sarlavha).
  - **P4c (ruxsatlar)**: POINTS moduli uchun **scope-admin fallback** — global
    `POINTS_MANAGE*` (faqat ADMIN rolida) yangi ro'yxatdan o'tgan o'qituvchini (MEMBER)
    bloklar edi: sinf yaratadi-yu, ball/vazifa/do'kon yurita olmaydi. Yechim:
    `PermissionAspect` global tekshiruv yiqilsa, talab faqat POINTS-moduli bo'lsa va user
    hamyon-kontekst scope'ida (HOUSEHOLD/CLASS) OWNER/ADMIN bo'lsa — ruxsat
    (`ScopeContextService.canManageActiveWalletScope`). Frontend `usePermission` +
    `ProtectedRoute`/`PermissionGate` xuddi shu formula bilan. Farzand (membership'siz)
    hech narsa olmaydi; konvertatsiya baribir HOUSEHOLD-guard ostida.

Har bosqich — alohida PR to'lqini, ADR-001 uslubida (CI → merge → deploy → smoke).

## 7. Ochiq savollar (P4'gacha hal qilinadi)

1. Maktabni tasdiqlash oqimi: faqat SUPER_ADMIN'mi yoki hujjat-asosli arizami?
2. Sinf reytingida nickname majburiymi yoki ota-ona tanlovimi (consent darajalari)?
3. Sinf hamyonidagi mukofotlar: maktab o'z "do'koni"ni yuritadimi (PointShop per SCHOOL)?
4. Bola 18 yoshga to'lganda: hamyonlar va PERSONAL hisoblar o'z User akkauntiga qanday o'tadi?
