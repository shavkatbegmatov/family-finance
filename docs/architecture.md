# Architecture & Domain Model

Grounded in the **actual code** (Flyway V45, June 2026), not the original plan. The legacy
roadmap lives in [`docs/multi-scope-plan-original.txt`](./multi-scope-plan-original.txt) —
useful history, but the code is ahead of it.

Domain terms (ADR-001 decoupling): **Group** = ixtiyoriy moliyaviy aggregation (eski "Clan"/urug'
da'vosi olib tashlandi — "urug'" endi genealogiya grafidan hosil bo'ladi, jadval emas),
**Household** = xonadon (byudjet birligi, mustaqil root bo'la oladi). Genealogiya (graf) va moliya
(daraxt) ajratilgan. To'liq qaror: [`adr-001`](./adr-001-genealogy-finance-decoupling.md).

## 1. Scope model (multi-scope core)

A single universal `Scope` entity models every context type via a `type` enum + `metadata`
(JSONB). Hierarchy is `parentScope` (GROUP is the root, `parentScope = null`).

- **`entity/Scope.java`** — `type`, `name`, `parentScope`, `ownerUser`, `uniqueCode`,
  `displayCode`, `metadata` (JSONB), `startsAt`/`endsAt`, `isActive`, **`legacyFamilyGroup`**.
- **`enums/ScopeType`** — `GROUP, HOUSEHOLD, PROJECT, EVENT, FUND, TRUSTEE, PROPERTY`
  (helpers `requiresParent()`, `canContainHousehold()`).
- **`entity/ScopeMembership.java`** + **`enums/ScopeRole`** (`OWNER, ADMIN, MEMBER, VIEWER,
  GUEST`) + **`enums/MembershipStatus`** (`ACTIVE, LEFT, EXPELLED, PENDING`).
  Unique constraint: one membership per (scope, user).

A user can be a member of scopes across **multiple groups/households** with different roles (e.g. a
bride is MEMBER in both her parents' and her husband's households — two membership rows).

### `ScopeContextService` — the single source of truth for scoping

- **Active scope resolution (fallback chain):** JWT `activeScopeId` → `User.primaryScope` →
  first ACTIVE membership.
- `getActiveScope()`, `getActiveHousehold()`, `getActiveGroup()`, `getActiveScopeId()`.
- **Visibility:** `getVisibleScopeIds()` (own ACTIVE memberships + parent GROUP), `canViewScope()`,
  `canWriteToScope()`, `canManageScope()`.
- **SUPER_ADMIN** (`User.isSuperAdmin`) bypasses membership but every cross-scope access is
  written to the audit log.

> **Rule:** repositories filter `WHERE scope_id IN (:visibleScopeIds)`, never a raw
> `family_group_id`. New scope-aware queries must go through `ScopeContextService`.

## 2. Genealogik tenant (FamilyGroup) — ADR-001 F5'dan keyin

`FamilyGroup` jadvali sof **genealogik tenant**: `family_members.family_group_id` izolyatsiya
markeri va Points tizimining ichki kaliti. Moliyaviy `Scope` unga FK **saqlamaydi** (V55 DROP);
aktiv scope'ning tenant'i EGALIK orqali aniqlanadi — `scope.ownerUser.familyGroup`
(`ScopeContextService.resolveFamilyGroup`, parent-owner fallback bilan). Eski chaqiruvchilar
(`PointConfigService.getCurrentFamilyGroup()` va 25+ iste'molchisi) shu resolution orqali
signature o'zgarishisiz ishlaydi. New code should use scopes directly.

## 3. Financial scoping

`scope_id` was added + backfilled and made **NOT NULL** on the core entities:

| Entity | scope_id |
|--------|----------|
| `Account`, `Budget`, `Debt`, `SavingsGoal` | NOT NULL (V35 add → V36 backfill → V39 not-null) |
| `FamilyMember` | **YO'Q** (V54 DROP — ADR-001 F4: a'zoning xonadoni `FamilyUnit.scope` ko'prigidan; `family_group_id` = genealogik tenant) |
| `FamilyUnit` | **nullable** ko'prik + `display_code` (V40 add → V41 backfill; ADR-001: avtomatik to'ldirilmaydi) |
| `Category` | global (no scope) |
| `Point*` | resolved via legacy bridge during transition |

## 4. Auth, JWT & sessions

- **`security/JwtTokenProvider`** — access token (1h) claims: `subject`, `type=STAFF`, `userId`,
  `roles[]`, `permissions[]`, **`activeScopeId`**. Refresh token (1d). HMAC-SHA from base64
  `JWT_SECRET`. `generateStaffTokenWithPermissions(..., activeScopeId)`,
  `getActiveScopeIdFromToken()`.
- **`security/JwtAuthenticationFilter`** → loads `CustomUserDetails` (carries mutable
  `activeScopeId`); authorities are `ROLE_*` + `PERM_*`.
- **`entity/Session`** (V44) — DB-backed: `tokenHash` + `refreshTokenHash` (SHA-256, unique),
  device info (ip/agent/browser/os), `expiresAt`, `lastActivityAt`, `isActive`, revoke fields.
  Enables token **rotation**, revocation ("log out all devices"), multi-device tracking.
- **`POST /v1/auth/switch-scope`** — issues a new token with a different `activeScopeId`.
- **401 → refresh flow** (front `api/axios.ts`): on 401, call `/v1/auth/refresh-token`, queue
  in-flight requests, retry after refresh.

> **Invariant:** any endpoint issuing a new access token MUST create/update a `Session`
> (with refresh-token hash), or the filter rejects the next request → refresh loop.

## 5. Permissions (RBAC)

- **`enums/PermissionCode`** — 40+ codes across ~13 modules (TRANSACTIONS_*, ACCOUNTS_*,
  BUDGETS_*, DEBTS_*, SAVINGS_*, FAMILY_*, USERS_*, ROLES_*, POINTS_*, ...).
- **Enforcement:** `@RequiresPermission({...}, requireAll=…)` on methods/classes →
  `security/PermissionAspect` (AOP) → `PermissionService.hasAll/AnyPermissions`. Permissions
  ride in JWT claims + DB `RoleEntity`.
- **Frontend mirror:** `hooks/usePermission.ts` (`hasPermission`, memoized `can*` booleans) +
  `PermissionGate` / `RoleGate` components. Source of truth: `authStore.permissions`.

## 6. Genealogy (family tree)

- **`FamilyMember`** (person), **`FamilyChild`** (parent→child), **`FamilyPartner`**
  (spouse/partner), **`FamilyUnit`** (household composition: parents + children, `display_code`).
- **Soft-delete invariant:** removing a member must not leave orphan `FamilyChild`/
  `FamilyPartner`; validations consider **living** members only.
- **Tree consistency (V1.6.4):** the "Xonadonlar" (households) and "Shaxslar" (persons) views
  use the **same genealogical traversal** (not scope-visibility) — a parent in a different GROUP
  still appears. Frontend: `components/family/flow/` (2D React-Flow) and
  `components/family/graph3d/` (3D force graph).

## 7. System boundaries / invariants (quick reference)

1. No financial row exists without a `scope_id`; reads are bounded by `getVisibleScopeIds()`.
2. Active scope comes from the JWT, switched only via `/v1/auth/switch-scope` (new token).
3. New access token ⇒ new/updated `Session` row (rotation), else 401 loop.
4. Every mutation passes a `@RequiresPermission` check; SUPER_ADMIN cross-scope reads are audited.
5. `FamilyGroup` is legacy-bridge only — new logic targets `Scope`.
6. Genealogy traversal is independent of financial scope visibility.
7. daisyUI theme colors are `oklch`; WebGL renderers must use hard-coded hex (not parsed theme).
