# Sessiya davomi — qolgan ishlar va kontekst

> **Maqsad:** ishni boshqa kompyuterda (noutbuk) davom ettirish uchun handoff.
> **Sana:** 2026-06-18. **Vaqtinchalik hujjat** — ish davom etgach o'chirib tashlash mumkin.
>
> ⚠️ **Repo PUBLIC** — bu faylda maxfiy xavfsizlik tafsilotlari (sir qiymatlari, commit
> hash'lari, attack-vektorlar) ATAYLAB YO'Q. Ular alohida **private audit eslatmalarida**
> (`audit-2026-06-11/ISH-REJA.md` — repo'dan tashqarida). Muhandislik yo'l-xaritasi to'liq.

---

## 1. Bu sessiyada bajarilgan (10 PR, barchasi prod'da, verify OK — #160…#169)

| Guruh | PR | Mazmun |
|-------|-----|--------|
| FAZA A | #160 | **D4** — FROZEN/CLOSED hisobga `update` orqali tranzaksiya kiritish bug'i (`ensureAccountActive` endi update'da ham) |
| | #161 | **D6** — V47 performance indekslari (transactions account+date DESC, reversed_by; accounts scope+active) |
| | #162 | **D3** — GlobalExceptionHandler: TypeMismatch/HttpMessageNotReadable→400, DataIntegrity/OptimisticLock→409; 4xx `log.warn` |
| | #163 | **D13** — o'lik debug fayllar o'chirildi (securityTests/testRealtimeLogout/debugWebSocket) |
| Bonus | #164 | **D9-PR1** — `utils/apiError.ts` (getApiErrorMessage/getApiErrorStatus/toastApiError); 20 fayl/~48 ad-hoc xato-ekstraksiya markazlashtirildi |
| | #165 | **D7** — TRANSFER'da valyuta tengligi validatsiyasi (turli valyutali o'tkazma balansni buzardi) |
| | #166 | **D5** — audit "asl holat" cache xotira-oqishi + cross-request poyga (static map → `AuditOriginalStateContext` ThreadLocal + `AuditContextCleanupFilter`) |
| **D1 (scope foundation)** | #167 | **D1-a** — `transactions.scope_id` (V48: ustun nullable + backfill + kompozit indeks; `Transaction.scope`; doCreate/reverse to'ldiradi) |
| | #168 | **D1-b** — tranzaksiya **ro'yxati/recent** scope-aniq (`findWithFilters`/`findTop10ByScope` → `t.scope.id`; `resolveActiveScopeIdOrNull`) |
| | #169 | **D1-c** — Dashboard/Report **agregatlari + balans** scope-aniq (5 metod `...AndScope`, `getTotalBalanceByScopeId`); members familyGroup'da qoldi (genealogiya) |

**D1 = transactions to'liq scope-migratsiya** (accounts/budgets bilan izchil). Har D1 PR'da
**integration-guard** scope-izolatsiyani real PostgreSQL'da merge'dan oldin tasdiqladi.

---

## 2. Jonli sinab ko'rish kerak (xulq o'zgarishlari)

- **Scope-aniq tranzaksiya + dashboard** (D1-b/c): har scope endi FAQAT o'zining tranzaksiyalarini
  ko'radi (avval klan-keng edi). **Ko'p-xonadonli urug'da** ko'rinish torroq — bu KUTILGAN
  (`accounts`/`budgets` bilan izchil). ScopeSwitcher'da scope almashtirib tekshiring. Bitta-xonadonli
  oilada farq yo'q.
- **D7 — turli valyutali o'tkazma** endi rad etiladi (masalan UZS hisob → USD hisob). Sinab ko'ring:
  xato xabari `"Turli valyutali hisoblar o'rtasida o'tkazma qilib bo'lmaydi: ..."`.
- **D5/D9-PR1** — ichki, ko'rinmaydigan (audit barqarorroq; xato-toastlar o'zgarmagan).

---

## 3. Qolgan ishlar (keyingi sessiya uchun)

### Backend
- **D2 — RBAC ajratish** (foundational, **YUQORI risk**): platforma roli (SUPER_ADMIN/support) vs
  tenant roli (`scope_memberships.role`); `PermissionAspect`ni scope-kontekstga bog'lash; permission
  katalogi → `R__` repeatable migratsiya. D1'dan keyingi tabiiy qadam. Integration test bilan.
- **D5-PR2** (o'rta): `AuditLogService` refaktor — Writer/Query ajratish; UA-parser dublikati
  (`UserAgentParser` bor); o'lik metodlar; `cleanupOldLogs` → `@Scheduled` (365 kun retention).
- **D7-PR2** (o'rta): `getTotalBalance` GROUP BY currency (front valyutalar bo'yicha alohida
  ko'rsatadi); `currency` vs `currency_code` drift; (o'rta muddat: `exchange_rates` jadvali).
- **Mayda tozalash**: `AccountRepository.getTotalBalanceByFamilyGroup` endi **o'lik** (D1-c'dan keyin
  hech kim chaqirmaydi) — o'chirish mumkin. `Account.familyGroup` ham asta deprecated bo'lib boradi.

### Frontend
- **D9-PR2** (past-o'rta, xavfsiz/tsc): barcha `api/*.ts` modullarni `ApiResponse<T>`/`PagedResponse<T>`
  generiklarга tiplaш (`scopes.api.ts` naqshi); global `MutationCache.onError` (`toastApiError` +
  `mutation.meta.errorMessage` bilan). `utils/apiError.ts` allaqachon poydevor (D9-PR1).
- **D8 (seriya)** — react-query migratsiyasi: barcha ro'yxat/detail → `useQuery`/`useInfiniteQuery`,
  `queryKey`da `activeScopeId`; `SCOPE_CHANGED_EVENT`/`useScopeChange`/`useDataRefresh` o'chirish.
  Tartib: Transactions→Accounts→Dashboard→Debts→FamilyMembers→qolganlar.
- **D10 (seriya)** — god-sahifalarni bo'lish: `UsersPage` (~1575), `FamilyMembersPage` (~1451),
  `DebtsPage`, `DashboardPage` → Page + hook + modallar; ≤400 qator/sahifa. D8 bilan birga.

### Auth (eng oxirida, EHTIYOT)
- **D12** (**YUQORI risk**): refresh token → httpOnly cookie (backend+front birga); access xotirada
  (localStorage'dan chiqarish); logout'da PWA api-cache tozalash; parol siyosati kuchaytirish
  (min 10-12 + HIBP, `front/src/utils/password.ts` + backend sinxron). **V44 session saboq'ini
  yodda tut** — deploy'dan keyin login oqimini kuzat.

---

## 4. ⚠️ Xavfsizlik — ENG YUQORI PRIORITET (faqat foydalanuvchi qila oladi)

D-faza muhandislik ishidan ham muhimroq. **Tafsilotlar bu yerda YO'Q (repo public).** Private audit
eslatmalarida (`audit-2026-06-11/`). Qisqacha: maxfiy kalitlar rotatsiyasi + repo'ni private qilish +
default-credential almashtirish. Coolify/GitHub/ImgBB kirishi foydalanuvchida. **Birinchi navbatda
shu, keyin D-faza.**

---

## 5. Muhim ishchi kontekst (noutbukda kerak bo'ladi)

> Bu kontekst desktop'ning lokal **memory**'sida saqlanган, lekin memory **sync bo'lmaydi** —
> shuning uchun shu yerga yozildi. Lokal-muhit bandlari noutbukda farq qilishi mumkin — tekshiring.

### Stack & build
- Backend `family-finance-api/` (Spring Boot 3.5.5, Java 17, pkg `uz.familyfinance.api`, `:8098` ctx `/api`).
  Frontend `family-finance-front/` (React 18 + Vite + TS + Tailwind/daisyUI, `:5178`).
- Verify: backend `./mvnw clean compile` / `test-compile`; frontend `npm run build` (tsc+vite) + `npm run lint`.
  **Haqiqiy avtomatik testlar endi bor** — `*IntegrationTest` (Testcontainers, real PG16) + bir nechta unit test.

### Lokal-muhit cheklovlari (desktop'da kuzatilgan — noutbukda tekshiring)
- **Maven SSL** (korporativ GlobalProtect PKIX): `export MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NUL"` — aks holda `./mvnw` SSL xato beradi. `-o` (offline) deps cache bo'lsa ishlaydi.
- **Docker yo'q edi** → `*IntegrationTest` LOKAL ishlamaydi; faqat CI'da (alohida `integration-test` job, gate-qilmaydi). Noutbukda Docker bo'lsa lokal ishlatib bo'ladi.
- Frontend `npm` muammosiz (Maven SSL'ga aloqasi yo'q).

### Prod health-check URL'lari (yolg'on-signal tuzog'i!)
- **Front:** `https://family-finance.uz/` → 200.
- **API:** `https://api.family-finance.uz/api/actuator/health` → 200 (**alohida subdomen!**). CI "Verify Deploy" aynan shuni tekshiradi.
- ⚠️ `https://family-finance.uz/api/...` prod'da **502** (faqat lokal Vite dev proxy) — bu yolg'on signal, prod tushgan EMAS.
- Korporativ SSL tufayli lokal `curl` `000`/exit-35 → `curl -sk` ishlat.

### Git / PR workflow
- `main` **himoyalangan** — faqat PR orqali (2 CI check: Backend/Frontend + alohida `integration-test` job → **squash merge**).
- Commit/PR matni **TOZA** — "Claude"/"Co-Authored-By"/AI ishora **YO'Q**. Muloqot/commit **O'zbek LOTIN**.
- Commit matn BOM tuzog'i: PowerShell `Out-File -Encoding utf8` BOM qo'shadi → bash heredoc (`cat > /tmp/x <<'EOF'`) ishlat.
- `main`'ga merge = **avtomatik prod deploy** (GHCR → Coolify). Har merge'dan keyin deploy + health-check kuzatish shart.

### Scope modeli (D1 yakunidan keyin)
- **Yagona aktiv scope** (`scopeContext.getActiveScopeIdOrNull()`, exact `= scopeId`): accounts, budgets,
  savings, debts(remaining), **transactions** (D1). Super-admin: TransactionService null=hammasi.
- **Visible scope SET** (`getVisibleScopeIds()`, user-keng): DebtService.getAll (`findWithFiltersAndScopeIds`).
- **Members = genealogiya** (`findAccessibleActiveMembers(familyGroupId)`) — scope-filter EMAS, household-tree
  traversali (ReportService.getMemberReport shuni saqlaydi).
- `transactions.scope_id` **NULLABLE** (NOT NULL bo'lolmaydi) — SYSTEM_TRANSIT/system tranzaksiya scope'siz
  (V39 `accounts`ni shu sabab istisno qilgan).

### Integration-guard merge-chain naqshi (YUQORI-risk migratsiyalar uchun)
CI yashil kut → `BEHIND` bo'lsa `gh pr update-branch` + qayta CI → **integration-test check `pass` ekanini
tasdiqla** (real-PG validatsiyasi) → merge'ni **PR state** orqali tekshir (pipe-masking yo'q:
`gh pr merge ...; sleep; state==MERGED?`) → deploy run'ni main sha bo'yicha top → `gh run watch --exit-status`
(Verify Deploy = api+front 200).
