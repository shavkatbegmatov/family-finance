# ADR-003: GROUP scope'ni olib tashlash

> **Status:** Qabul qilingan (Accepted) — mahsulot egasi tanlovi: "To'liq o'chirish" (2026-07-06)
> · **Asos:** [`adr-001`](./adr-001-genealogy-finance-decoupling.md) (CLAN→GROUP, ixtiyoriylik),
> [`adr-002`](./adr-002-person-wallets-and-schools.md) (scope soddalashuvi).

## 1. Kontekst

ADR-001 CLAN'ni majburiylikdan ixtiyoriy moliyaviy GROUP'ga tushirgan edi. Amaliyot ko'rsatdiki
GROUP hech qanday haqiqiy vazifa bajarmaydi:

- **Guruh kontekstida moliyaviy ma'lumot bo'sh**: tranzaksiyalar `t.scope.id = :aktivScope`
  bilan filtrlash (ierarxiya yo'q), hisob ochish GROUP'da taqiqlangan (ADR-002 P2), Points
  hamyon-konteksti faqat HOUSEHOLD/CLASS. Guruhga o'tgan foydalanuvchi bo'sh ekran ko'radi —
  aktiv UX zarari.
- **Data o'lchovi** (lokal, 2026-07-06): 26 GROUP scope'da hisob/tranzaksiya/byudjet/qarz/
  jamg'arma/points/family_unit = **0**; `users.primary_scope=GROUP` = **0**. GROUP = faqat
  struktura (parent linklar + membershiplar), hech qanday foydali yuk yo'q.
- **Kelajakdagi ko'p-xonadonli jamlanma GROUP'ni talab qilmaydi**: "barcha xonadonlarim
  bo'ylab" ko'rinish `getVisibleScopeIds()` (a'zoliklar) asosida quriladi — daraxt
  strukturasi va "biriktirish" tushunchasi ortiqcha bilvositalik.

## 2. Qaror

GROUP scope turi **to'liq olib tashlanadi** (foydalanish yo'li yopiladi; enum qiymati
o'qish uchun qoladi — ADR-002 P3'dagi PROJECT/EVENT/FUND naqshida):

1. **V60 data migratsiya**: barcha HOUSEHOLD'lar guruhdan uziladi (`parent_scope_id=NULL`);
   GROUP'lardagi ACTIVE membershiplar `LEFT`; `users.primary_scope` GROUP'ga ko'rsatsa —
   foydalanuvchining birinchi faol HOUSEHOLD a'zoligiga ko'chiriladi (himoya; lokalda 0 ta);
   GROUP scope'lar `is_active=false` (arxiv — data o'chmaydi).
2. **Backend**: GROUP yaratish bloklanadi (endi `POST /v1/scopes` faqat HOUSEHOLD);
   `PUT /v1/scopes/{id}/parent` (biriktirish/uzish) endpoint + servis mantig'i o'chiriladi;
   join-by-code oqimlaridan GROUP tarmoqlari olib tashlanadi (arxiv scope kodi baribir
   `isActive` filtridan o'tmaydi); o'lik kod o'chiriladi (`HouseholdProvisioningService`,
   `getActiveGroupOptional`, `canContainHousehold`); super admin `getAllScopes` faqat
   faollarni qaytaradi (25 arxiv guruh shovqinidan tozalash).
3. **Frontend**: Switcher'lardan GROUP guruhlash olib tashlanadi (SCHOOL container qoladi);
   `/scopes` sahifasi "guruh ochish/biriktirish"dan "xonadonlarim ro'yxati"ga soddalashadi;
   registratsiya/join oqimlarida GROUP kod preview tarmoqlari ketadi; admin statistikadan
   "Guruhlar" kartasi olib tashlanadi. TS `ScopeType` union'ida `'GROUP'` qoladi
   (super admin arxiv qatorlarni ko'rishi mumkin) — lekin UI oqimlarida ishlatilmaydi.

**Saqlanadiganlar (chalkashtirmaslik):** `FamilyGroup` jadvali/entity — sof genealogik
tenant (users/family_members izolyatsiyasi, ADR-001 F5 `scope.ownerUser.familyGroup`
resolve) — bu ADR unga TEGMAYDI. SCHOOL/CLASS ierarxiyasi (parent mexanizmi Scope'da
qoladi — u endi faqat maktab→sinf uchun).

## 3. Skew-himoya va orqaga moslik

- Enum qiymati (`GROUP`) va TS union qiymati qoladi — arxiv qatorlar o'qiladi, eski JWT
  (`activeScopeId`=GROUP) bilan kelgan so'rovda `ScopeContextService.resolveHousehold`
  fallback'i ishlaydi (deploy oynasi himoyasi).
- Eski frontend (skew oynasi) `PUT /parent` chaqirsa 404 oladi — faqat `/scopes`
  sahifasidagi tugma, funksional zarar yo'q.
- `archiveOldGroup` join parametri qabul qilinaveradi (eski klientlar) — endi faqat eski
  bo'sh XONADONNI arxivlaydi.

## 4. Amalga oshirish

Bitta PR (backend V60 + kod + frontend + changelog 1.14.0) — skew oynasi minimal.
ADR-001/002 naqshida: CI → merge → deploy → versiyaga sezgir smoke. O'chirilgan o'lik
kod: `HouseholdProvisioningService` (chaqiruvchisiz), `getActiveGroupOptional`,
`canContainHousehold`, `setHouseholdParent`+`SetScopeParentRequest`+`PUT /parent`,
`FamilyGroupService`dagi V34-GROUP tarmog'i. Integration testlarda GROUP fixture →
HOUSEHOLD.
