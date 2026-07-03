# Family Finance — Project Context

Uzbek **family finance** web app. The core model is **multi-scope**: a person can belong
to several financial contexts — one or more *Households* (xonadon, mustaqil root bo'la oladi),
an optional *Group* (bir nechta xonadon ustidagi ixtiyoriy moliyaviy birlashma; eski "Clan"),
plus projects/events/funds. Genealogiya (qarindoshlik grafi) moliyadan ajratilgan — ADR-001
(`docs/adr-001-genealogy-finance-decoupling.md`). Monorepo: Spring Boot API + React/Vite SPA.

> **Communication rule (MUST):** Respond to the user in **O'zbek LOTIN** yozuvida. Never mix
> Cyrillic letters — not even inside a single word (e.g. `qilishni`, not `qilишни`). Check each
> word before writing.

## Stack & layout

| Module | Path | Tech | Port |
|--------|------|------|------|
| Backend | `family-finance-api/` | Spring Boot 3.5.5, Java 17, pkg `uz.familyfinance.api` | `:8098` (context `/api`) |
| Frontend | `family-finance-front/` | React 18, Vite, TypeScript, Tailwind+daisyUI | `:5178` |

DB: PostgreSQL 16 (`family_finance_db`), Flyway migrations, Hibernate `ddl-auto=validate`.

## Run / build / verify

```bash
# Backend (from family-finance-api/)
./mvnw spring-boot:run            # run on :8098
./mvnw clean compile -DskipTests  # compile check (CI uses this)

# Frontend (from family-finance-front/)
npm run dev       # Vite on :5178, proxies /api -> :8098
npm run build     # tsc -b && vite build  (type-check + bundle)
npm run lint      # ESLint
```

> **Automated tests (G6, 2026-06):** Backend JUnit5 unit (`PasswordPolicyTest`,
> `TransactionCurrencyValidationTest`, `JwtTokenProviderTest`) + Testcontainers integration
> (`AuthSessionIntegrationTest`, `FlywayMigrationIntegrationTest` — real PG, CI'da). Frontend Vitest
> (`src/__tests__`: `password.test`, `hibp.test` — 20 test). "Verify" = `./mvnw clean compile`/`test`,
> `npm run build`/`tsc`/`lint`/`test`, + **manual preview** (front :5178 ↔ back :8098,
> demo login `admin / admin123`). See `docs/architecture.md` for the preview/health-check flow.

## Architecture invariants (see `@docs/architecture.md` for full detail)

1. **Financial data is scope-aware.** Moliyaviy entity'lar (Account, Budget, Debt, SavingsGoal)
   **`scope_id` (NOT NULL)** bilan yuradi va so'rovlar scope orqali chegaralanadi. Genealogiya
   (FamilyMember, FamilyUnit) esa ADR-001 bo'yicha ajratilgan: ularning `scope_id`si **nullable
   ixtiyoriy ko'prik** (avtomatik to'ldirilmaydi); genealogik izolyatsiya `family_group_id`
   (tenant marker) orqali. Moliyaviy so'rovlarni `family_group_id` bilan qilmang.
2. **All scoping goes through `ScopeContextService`** — resolve active scope (JWT
   `activeScopeId` → `User.primaryScope` → first ACTIVE membership) and `getVisibleScopeIds()`.
   `FamilyGroup` still exists only as a legacy bridge (`Scope.legacyFamilyGroup`).
3. **Auth is session-backed.** Every endpoint that issues a new access token must create/update
   a DB `Session` (token + refresh-token hashes, rotation) — otherwise `JwtAuthenticationFilter`
   returns 401 and the client enters a refresh loop (V44 fix).
4. **Mutations are permission-guarded** with `@RequiresPermission` (AOP `PermissionAspect`);
   the front mirrors this with `usePermission` / `PermissionGate`.
5. **Soft-delete keeps genealogy consistent** — deleting a `FamilyMember` must not orphan
   `FamilyChild`/`FamilyPartner`; validations check living members only.

## Code standards

- **Backend:** DTOs are `*Request` / `*Response` under `dto/request` & `dto/response`.
  Nullable `String` params in JPQL must be wrapped `CAST(:param AS string)` (else Hibernate
  binds `bytea` → `lower(bytea)` error). New schema = new Flyway `V46+` migration (never edit
  applied ones).
- **Frontend:** PascalCase components/pages, camelCase stores. **daisyUI v4 stores colors as
  `oklch(...)`; for WebGL/three.js use hard-coded hex** — reading theme color via
  `getComputedStyle` + regex turns oklch hue into a blue channel (V1.6.5 bug). Password policy
  has a single source: `src/utils/password.ts`.
- **Both:** SonarQube quality — Cognitive Complexity ≤ 15, DRY, no magic numbers, typed errors.
- **User-facing change?** Prepend an entry to `family-finance-front/src/data/changelog.ts` and
  bump `package.json` version.

## Workflow

- **Git:** `main` is protected — change only via PR (branch → PR → 2 CI checks: Backend/Frontend
  → **squash merge**). Commit messages: clean, no AI/Co-Authored-By trailers.
- **Deploy:** merging to `main` auto-deploys (GitHub Actions → GHCR images → Coolify webhook).
  Production: **https://family-finance.uz**. After each merge, watch the CI/CD run and
  health-check the URL.

## Deeper context

- **Architecture & domain model:** `@docs/architecture.md`
- **Backend module guide:** `family-finance-api/CLAUDE.md`
- **Frontend module guide:** `family-finance-front/CLAUDE.md`
