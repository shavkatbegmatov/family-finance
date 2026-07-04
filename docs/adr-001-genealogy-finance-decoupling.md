# ADR-001: Genealogiya ↔ Moliya decoupling

> **Status:** Qabul qilingan (Accepted) — Faza 1-4 bajarildi · **Sana:** 2026-06-30 · **Aloqador:** `docs/architecture.md`,
> `docs/multi-scope-plan-original.txt`

## 1. Kontekst

Tizimda **ikkita mustaqil tabiatga ega tuzilma** yonma-yon yashaydi, lekin ular hozir
sun'iy ravishda bir-biriga bog'lab qo'yilgan:

1. **Genealogiya — GRAF** (`family_members`, `family_units`, `family_children`,
   `family_partners`). Bu klassik GEDCOM-uslubidagi qarindoshlik grafi: `FamilyMember` =
   tugun, `FamilyUnit` = nikoh yadrosi, `FamilyChild`/`FamilyPartner` = chetlar. Sikllar
   bo'lishi mumkin (masalan, amakivachchalar nikohi).

2. **Moliya — DARAXT** (`scopes`, `scope_memberships`). `Scope` universal entity'si
   `CLAN → HOUSEHOLD/PROJECT/EVENT/...` ierarxiyasini `parentScope` orqali ifodalaydi.
   `CLAN` — majburiy ildiz (`parentScope = null`).

### Muammo: `CLAN` rol ulashadi (konseptual nochiqlik)

`CLAN` bir vaqtda bir nechta javobgarlikni ko'tarib turibdi:

| # | `CLAN`ning roli | Qayerda | Ortiqchami? |
|---|------------------|---------|-------------|
| 1 | **Genealogik "urug'" ildizi** | `FamilyMember.scope = CLAN` | ✅ Ha — graf buni hosil qila oladi |
| 2 | **Moliyaviy "hammasini birga ko'rish" ildizi** | `getVisibleScopeIds()` → parent CLAN | ❌ Yo'q — real ehtiyoj |
| 3 | **Boshqa scope'lar konteyneri** | `PROJECT/EVENT/FUND` `parent=CLAN` majbur | ⚠️ Kerak, lekin majburiyligi shart emas |
| 4 | **Legacy ko'prik** | `Scope.legacyFamilyGroup` | ⚠️ Vaqtinchalik |

Asosiy nochiqlik #1-rolda: genealogik "urug'" tushunchasi `scope` ustuniga
denormalizatsiya qilingan, holbuki u **grafdan hosil bo'ladigan** (derived) tushuncha —
umumiy ajdoddan tarqalgan connected component.

### Kod tahlili natijasi (2026-06-30)

Decoupling kutilganidan **yaqinroq** ekani aniqlandi:

- **`FamilyMember.scope` amalda o'lik FK.** `FamilyMemberRepository`da `scope_id` bo'yicha
  **bironta ham query yo'q** — barcha filtrlash legacy `family_group_id` orqali ketadi.
  Ya'ni genealogiya allaqachon `scope` orqali filtrlanmaydi; `scope` faqat yoziladi.
- **Genealogiya UI allaqachon grafdan ishlaydi**, scope-visibility'dan emas
  (`docs/architecture.md` §6: "bir xil genealogik traversal").
- **`FamilyUnit.scope` allaqachon ixtiyoriy** (`FamilyUnit.java:50` — "sof genealogik
  birliklar uchun NULL").
- **Tenant izolyatsiya `family_group_id` orqali allaqachon mavjud** — `scope`siz ham
  qarindoshlik daraxtlari aralashib ketmaydi.

Demak yagona haqiqiy bog'lanish — **yozish tomonida**: `FamilyUnitService` har yangi oila
yaratilganda avtomatik `HOUSEHOLD` ochib, `FamilyUnit.scope` va `FamilyMember.scope`ni
o'rnatadi.

## 2. Qaror

Genealogiya (graf) va moliyani (daraxt) **to'liq decoupling** qilamiz. `CLAN`ni
**o'chirmaymiz** — uning **genealogik ma'nosini olib tashlab**, sof moliyaviy *ixtiyoriy*
guruhga aylantiramiz.

Yo'naltiruvchi tamoyil:

> **Genealogiya = graf** (yo'nalishsiz qarindoshlik, sikl bo'lishi mumkin, "urug'" —
> derived). **Moliyaviy rollup = daraxt** (yagona ildiz, yo'nalishli, hech qachon erkin
> graf emas). Bu ikkisi faqat **bitta yupqa ko'prik** orqali bog'lanadi.

## 3. Target model

```
  GENEALOGIYA OLAMI                      MOLIYA OLAMI
  "Kim kimga qarindosh"                  "Kim pulni ko'radi / boshqaradi"
  ── sof graf, moliyani bilmaydi ──      ── ixtiyoriy daraxt, qarindoshlikni bilmaydi ──

  Person (FamilyMember)                  Household   ← root bo'la oladi (parent=null)
  FamilyUnit (nikoh)                     Group       ← eski CLAN, endi IXTIYORIY aggregation
  ParentChild / Partnership (chetlar)    Project / Event / Fund / Trustee / Property
  "Urug'" = DERIVED (umumiy ajdod)       Membership (user ↔ scope, rol)
  tenant_id (izolyatsiya markeri)

           └──────────── yagona yupqa ko'prik ────────────┘
       User ↔ Person (mavjud)  ·  FamilyUnit.scope → Household (ixtiyoriy, mavjud)
```

### Tushunchalar lug'ati (har biri — bitta javobgarlik)

| Tushuncha | Yagona ma'nosi | Eslatma |
|-----------|----------------|---------|
| `Person` (`FamilyMember`) | Bitta inson (tirik/marhum) | `scope`siz — qarindoshlik moliyani bilmaydi |
| `FamilyUnit` | Bitta nikoh + farzandlari | Genealogiya yadrosi |
| **"Urug'"** | **Jadval emas** — grafdan hosil (umumiy ajdod komponenti) | Derived |
| `tenant_id` | Qaysi mustaqil daraxtga tegishli (izolyatsiya) | Moliyaviy `Group` EMAS |
| `Household` | Bitta byudjet birligi | Endi **root bo'la oladi** |
| `Group` (eski `CLAN`) | Bir nechta household ustidagi **ixtiyoriy** aggregation | "Urug'" deb da'vo qilmaydi |
| `Scope` | Har qanday moliyaviy kontekst (umumiy) | O'zgarmaydi |
| `Membership` | User ↔ Scope, rol bilan | O'zgarmaydi |

Endi hech bir tushuncha ikki ish qilmaydi: `Group` faqat *"otam + men + akamning
xonadonlarini birga ko'raman"* degan moliyaviy konteyner; urug' kimligini esa graf aytadi.

## 4. Asoslar

### Nega moliya uchun graf XAVFLI (eng muhim sabab)

Agar moliyani qarindoshlik grafi bo'ylab rekursiv yig'sak:

```
   Otam xonadoni ──bog'langan── Mening xonadonim ──bog'langan── Akam xonadoni
        100$                          200$                          150$
```

- Istalgan tugundan rollup → bir xil 100$ bir necha marta sanaladi (double-counting).
- Grafda **yagona "ildiz" va "yo'nalish" yo'q** — "kimники" degan savolga bir javob yo'q.
- Grafda **sikl** bo'lsa (amakivachchalar nikohi — real holat), rollup **cheksiz aylanadi**.

Shuning uchun pul har doim **daraxt** (yoki ulushli egalik bo'lsa — `%`li DAG) talab qiladi.
`Group` aynan shu yagona moliyaviy ildizni beradi.

### Nega `CLAN`ni o'chirmaymiz

`CLAN` `V33→V48` migratsiyalari, `getVisibleScopeIds`, JWT `activeScopeId`, legacy bridge —
hammaga singib ketgan. Uni o'chirish = teskari migratsiya + yuqori regressiya xavfi. To'g'ri
yo'l — **ma'nosini evolyutsiya qilish**, strukturani buzmasdan.

### Nega xavfsiz: tenant izolyatsiya yo'qolmaydi

`FamilyMember.scope`ni olib tashlasak ham, `FamilyMember.familyGroup` (yoki uning o'rnini
bosuvchi `tenant_id`) qarindoshlik daraxtlarini bir-biridan ajratib turadi. Ya'ni bitta
DB'dagi ko'p oila grafları aralashmaydi.

## 5. Hozirgi bog'lanishlar xaritasi

### Uziladigan joylar (genealogiya → moliya)

| Joy | Fayl:satr | Nima qiladi |
|-----|-----------|-------------|
| `FamilyMember.scope` maydoni | `entity/FamilyMember.java:85-91` | CLAN/HOUSEHOLD'ga FK (o'lik — query'da ishlatilmaydi) |
| Yangi a'zoga scope | `service/FamilyMemberService.java:280, 337, 357` | `getActiveHousehold().ifPresent(member::setScope)` |
| `FamilyUnit.scope` o'rnatish | `service/FamilyUnitService.java:56, 62, 94, 293` | Yangi oilaga HOUSEHOLD bog'lash |
| **Avtomatik HOUSEHOLD** | `service/FamilyUnitService.java:268-272` (`createHouseholdForUnit`) | Har nikohga yangi xonadon ochadi (`getActiveClanOptional` → `createHousehold`) |
| Ota-ona scope | `service/FamilyUnitService.java:130` (`resolveOrCreateParent`) | `parent.setScope(household)` |
| Sxema | `V35`/`V36` (qo'shish+backfill), `V40`/`V41` (FamilyUnit `scope_id`) | `V39` `family_members`ni NOT NULL'dan **ATAYLAB istisno** qilgan → `scope_id` ikkalasida ham **nullable** |

### Qoladigan joylar (sof moliyaviy — tegmaymiz)

- `Account.scope`, `Budget.scope`, `Debt.scope`, `SavingsGoal.scope` — moliyaviy scoping.
- `ScopeContextService` visibility/permission (`getVisibleScopeIds`, `canWriteToScope`, ...).
- `ScopeMembership` va rollar.
- Frontend `scopeGrouping.ts` (`groupScopesByClan`) — bu **moliyaviy** parent-child
  guruhlash, genealogik emas. Faqat "CLAN" yorlig'i "Group"ga o'zgaradi.

## 6. Migratsiya fazalari (PR rejasi)

Har faza — alohida PR, oldingisi prod'da barqarorlashgach keyingisi. `CLAUDE.md` qoidasi:
yangi sxema = yangi Flyway `V49+` (qo'llanilgan migration tahrirlanmaydi).

### Faza 1 — Yozish tomonini uzish (xulq o'zgarishi, sxemasiz)
- `FamilyUnitService`: yangi `FamilyUnit` yaratilganda **avtomatik HOUSEHOLD ochishni
  to'xtatish**. Xonadonni byudjet kerak bo'lganda, alohida/ixtiyoriy harakat bilan ochish.
- `FamilyMemberService.create/registerSelf`: `setScope(activeHousehold)`ni olib tashlash.
- `FamilyUnit.scope` — endi faqat foydalanuvchi ataylab "bu oila shu xonadonda yashaydi"
  desa to'ldiriladi (ixtiyoriy ko'prik sifatida qoladi).
- ✅ **Bloker yo'q:** `family_members.scope_id` (`V39` ATAYLAB istisno) va `family_units.scope_id`
  (`V40` nullable) allaqachon nullable — migration shart emas, sof kod o'zgarishi.
- ✅ **Holat: BAJARILDI** (`feat/decouple-genealogy-scope`): `FamilyUnitService` +
  `FamilyMemberService`dan avtomatik HOUSEHOLD ochish va `.scope(...)` o'rnatish olib tashlandi,
  `createHouseholdForUnit` o'chirildi. Compile CI'da tekshiriladi (lokal Maven TLS bloklangan).

### Faza 2 — Tenant markeri + root household (`V52`) ✅ BAJARILDI
- ✅ **`HOUSEHOLD` root bo'la oladi:** `ScopeType.requiresParent()` endi CLAN+HOUSEHOLD uchun
  `false`; yangi `forbidsParent()` faqat CLAN uchun `true`. HOUSEHOLD → ikkalasi `false` =
  parent **ixtiyoriy** (mustaqil root yoki CLAN/Group ostida). `ScopeService` validatsiyasi
  `forbidsParent()`ga o'tdi.
- ✅ **`V52`** (`household_optional_parent`): `chk_scope_parent` DB constraint HOUSEHOLD
  parent'ini ixtiyoriy qildi — mavjud ma'lumot buzilmaydi (faqat cheklov bo'shatildi, backfill yo'q).
- ✅ **`family_group_id` = genealogik tenant** sifatida rasmiylashtirildi (`FamilyMember`
  field commentlari) — moliyaviy `Group`dan mustaqil izolyatsiya markeri (kelajakda `tree_id`).
  `scope_id` allaqachon nullable — `DROP NOT NULL` kerak emas.
- ⚠️ Eng yuqori migration **V51** edi (CLAUDE.md'dagi "V48" eskirgan) → yangi migration **V52**.

### Faza 3 — `CLAN` → `GROUP` to'liq rebrand + root household provisioning ✅ BAJARILDI
Foydalanuvchi tanlovi: to'liq rebrand (enum + DB migration) + auto-provisioning root HOUSEHOLD.

- **3A** (`10dacb94`): `ScopeType.CLAN` → `GROUP` (enum, ~18 backend joy,
  `getActiveGroupOptional`, `InviteCodeGenerator` prefiks 'C'→'G'); `V53` DB migration
  (`type='CLAN'`→`'GROUP'` + `chk_scope_type`/`chk_scope_parent` — enum bilan ATOMIK,
  `@Enumerated(STRING)`). Invite kodlar (`'C...'`) tegilmadi — decode DB lookup orqali.
- **3B** (`ca075ec2`): frontend TS type `'CLAN'`→`'GROUP'`, `SCOPE_TYPE_META`/`LABEL` key,
  UI "Urug'"→"Guruh", `groupScopesByGroup`, icon `TreePine`→`Users2`. `npx tsc -b --force` TOZA.
- **3C** (`acbf0081`): yangi user auto-provisioning `GROUP`+`HOUSEHOLD` → faqat **root
  HOUSEHOLD** (Group ixtiyoriy); `joinExistingScopeByCode` root household'ni qo'llab-quvvatlaydi
  (`clan` null-safe). Mavjud eski GROUP scope'lar o'zgarmaydi.

**TEGILMADI (ataylab):** `graph3d` `'clan'` ColorBy (genealogik urug' rangi — moliyaviy GROUP
emas), `archiveOldClan` API param (JSON kontrakt), `changelog.ts` (tarixiy yozuvlar).
**Qoldi:** `archiveOldClan` param nomi (internal, keyingi tozalash).

### Faza 4 — Genealogiyadan `scope`ni butunlay olib tashlash (`V54`) ✅ BAJARILDI
- ✅ `V54`: `family_members.scope_id` ustuni + `idx_family_members_scope` DROP.
- ✅ `FamilyMember.scope` maydoni entity'dan olib tashlandi.
- ✅ **"A'zoning xonadoni"ning yagona manbasi endi `FamilyUnit.scope` ko'prigi** — shaxs emas,
  OILA (nikoh birligi) xonadonga bog'lanadi. O'qish joylari ko'chirildi:
  `FamilyUnitRepository.findScopesByPartnerIdAndType` (yangi query) → `AuthService` self-heal
  (`reconcileUserScopeWithMember`) va `UserService.resolveHouseholdScope`. Yozish joylari
  (`joinExistingScopeByCode`, `provisionScopeAndFamilyGroup` FamilyMember builder'lari) tozalandi.
- ✅ `FamilyUnit.scope` saqlanadi (ixtiyoriy ko'prik) — tasdiqlab qolindi.

### Faza 5 — Legacy cleanup (alohida, allaqachon rejada)
- `Scope.legacyFamilyGroup` va `FamilyGroup` ko'prigini yo'q qilish.

## 7. Rad etilgan variantlar

- **V1 — `CLAN`ni butunlay o'chirish, hammasini grafga.** Rad: moliyaviy double-counting +
  V33–V48 ni teskari ag'darish ulkan xavf. Funksional foyda yo'q.
- **V3 — Status-kvo+ (faqat genealogiyani boyitish).** Rad: konseptual nochiqlik
  (rol ulashish) saqlanib qoladi — bu ADR'ning asosiy maqsadiga zid.

## 8. Ochiq savollar

1. **`tenant_id` manbasi:** genealogik izolyatsiya markeri sifatida mavjud `family_group_id`
   qayta ishlatiladimi yoki yangi toza `tenant_id` kiritiladimi?
2. **`HOUSEHOLD` root bo'lganda visibility:** root household uchun `getVisibleScopeIds`
   o'zini qaytaradi (parent yo'q) — bu UX'da qanday ko'rinadi?
3. **`Group` ixtiyoriy bo'lsa, default oqim:** yangi user ro'yxatdan o'tganda darrov `Group`
   yaratiladimi yoki yolg'iz `HOUSEHOLD` bilan boshlaб, keyin kerak bo'lsa guruhlanadimi?
4. **`FamilyUnit.scope` semantikasi:** "bu oila shu xonadonda yashaydi" ko'prigi 1:1 mi yoki
   bir nikoh vaqt o'tib boshqa xonadonga ko'chsa, tarix saqlanadimi?
