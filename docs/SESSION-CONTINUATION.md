# Rivojlantirishni davom ettirish — handoff / resume qo'llanmasi

> **Maqsad:** ishni yangi sessiyada davom ettirish uchun **barqaror kirish nuqtasi**.
>
> ⚠️ **Repo PUBLIC.** Bu faylda maxfiy tafsilotlar (sir qiymatlari, zaiflik vektorlari) ATAYLAB YO'Q.
>
> 📋 **Jonli holat va prioritetli reja bu faylda EMAS** — u **private tracker**da:
> `D:\Projects\FAMILY_FINANCE\audit-2026-06-11\ISH-REJA.md` (repo'dan tashqarida, ataylab).
> Bu fayl FAQAT eskirmaydigan barqaror kontekst saqlaydi — bajarilgan/qolgan ish ro'yxati bu yerda
> YO'Q (u eskiradi). Holatni doim tracker'dan o'qing.

---

## Yangi sessiyani qanday boshlash

1. **Tracker'ga yeting** (yagona haqiqat manbai):
   - Eng oson: sessiyani **`D:\Projects\FAMILY_FINANCE\`** (ota-papka) bilan oching — u repo + tracker
     ikkalasini ham o'z ichiga oladi.
   - Yoki tracker'ni absolute yo'l bilan o'qishga ruxsat bering:
     `D:\Projects\FAMILY_FINANCE\audit-2026-06-11\ISH-REJA.md`.
2. Tracker'ning **"▶ KEYINGI SESSIYA — SHU YERDAN BOSHLA"** bo'limini o'qing — joriy holat,
   prioritetli qolgan ish va tavsiya etilgan tartib o'sha yerda.
3. **Prod sog'ligini** tekshiring (quyida URL'lar) va **branch = `main`** ekanini tasdiqlang.
4. Tanlangan ishni standart zanjir bilan qiling:
   `branch → PR → CI (2 check) → squash merge → deploy watch → health verify`.

> ⚠️ **Bir vaqtda bitta sessiya** (yoki alohida `git worktree`) ishlat — ikki sessiya bitta repo'ning
> git holatini buzishi mumkin.

---

## Barqaror reference (eskirmaydi)

### Stack & verify
- Backend `family-finance-api/` (Spring Boot 3.5.5, Java 17, `:8098`, ctx `/api`).
- Frontend `family-finance-front/` (React 18 + Vite + TS + Tailwind/daisyUI, `:5178`).
- Verify: backend `./mvnw clean compile`; frontend `npm run build` (tsc+vite) + `npm run lint`.
  Avtomatik test: `*IntegrationTest` (Testcontainers, real PG16 — CI'da).

### Lokal-muhit cheklovlari (desktop'da kuzatilgan)
- **Maven SSL** (korporativ GlobalProtect PKIX):
  `export MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NUL"`.
  `-o` (offline) deps cache bo'lsa ishlaydi; yangi bump'lar uchun online kerak.
- **Docker yo'q** → `*IntegrationTest` lokal ishlamaydi (faqat CI). Frontend `npm` muammosiz.

### Prod health-check (yolg'on-signal tuzog'i!)
- Front: `https://family-finance.uz/` → 200.
- API: `https://api.family-finance.uz/api/actuator/health` → 200 (**alohida subdomen!**).
- ⚠️ `https://family-finance.uz/api/...` prod'da **502** (faqat lokal Vite dev proxy) — yolg'on signal.
- Korporativ SSL tufayli lokal `curl` `000`/exit-35 → `curl -sk` ishlat.

### Git / PR / deploy
- `main` **himoyalangan** — faqat PR (2 CI check: Backend/Frontend + alohida `integration-test` job →
  **squash merge**).
- Commit/PR matni **TOZA** — "Claude"/"Co-Authored-By"/AI ishora **YO'Q**. Muloqot/commit **O'zbek LOTIN**.
- BOM tuzog'i: commit matniga bash heredoc (`cat > /tmp/x <<'EOF'`), PowerShell `Out-File` EMAS.
- `main`'ga merge = **avtomatik prod deploy** (GHCR → Coolify). Har merge'dan keyin deploy + health kuzat.

### Scope modeli (D1 yakunidan keyin)
- **Yagona aktiv scope** (`scopeContext.getActiveScopeIdOrNull()`, exact `= scopeId`): accounts, budgets,
  savings, debts(remaining), transactions. Super-admin: TransactionService null=hammasi.
- **Visible scope SET** (`getVisibleScopeIds()`, user-keng): DebtService.getAll.
- **Members = genealogiya** (`findAccessibleActiveMembers`) — scope-filter EMAS, household-tree traversali.
- `transactions.scope_id` **NULLABLE** (SYSTEM_TRANSIT/system tranzaksiya scope'siz).

### Integration-guard merge-chain (yuqori-risk migratsiyalar uchun)
CI yashil kut → `BEHIND` bo'lsa `gh pr update-branch` + qayta CI → integration-test check `pass` ekanini
tasdiqla → merge'ni **PR state** orqali tekshir (pipe-masking yo'q: `gh pr merge ...; sleep; state==MERGED?`)
→ deploy run'ni main sha bo'yicha top → `gh run watch --exit-status` (Verify Deploy = api+front 200).
