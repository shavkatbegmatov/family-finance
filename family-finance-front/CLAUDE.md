# Frontend — family-finance-front

React 18 + Vite + TypeScript SPA. Runs on **`:5178`** (proxies `/api` → `:8098`). Tailwind +
daisyUI, Lucide icons. See root `../CLAUDE.md` and `../docs/architecture.md` first.

## Run / build

```bash
npm run dev       # Vite dev server :5178 (host:true for mobile/LAN)
npm run build     # tsc -b && vite build  (type-check THEN bundle)
npm run lint      # ESLint
npm run preview   # serve production build
npm run cap:sync  # build + cap sync android   (APK: npm run apk:debug)
```

- Base API URL: `import.meta.env.VITE_API_BASE_URL || '/api'`. No automated tests — verify with
  `npm run build` / `tsc` / `lint` + manual preview.

## src/ structure

```
api/         axios instance (axios.ts) + per-domain modules (*.api.ts)
components/  ui/ (inputs, table)  common/ (modals, gates)  layout/  scope/  family/  points/
pages/       route-level containers (dashboard/, transactions/, accounts/, family/, scope/, ...)
router/      index.tsx — react-router v6 createBrowserRouter, lazy pages, ProtectedRoute
store/       Zustand stores
hooks/       usePermission, useSwitchScope, useScopeChange, ...
types/       scope.types, family-tree.types, persons.types, index
config/      constants.ts (ACCOUNT_TYPES, GENDERS, MONTHS_UZ, formatters)
data/        changelog.ts          utils/  password.ts, ...        i18n/  locales/
```

## State (Zustand) & auth

- `authStore` — user, accessToken, refreshToken, permissions(Set), roles(Set); persisted to
  localStorage; tokens also kept in localStorage for the axios interceptor. `hasPermission`.
- `scopeStore` — `activeScope`, `myScopes` (multi-scope source of truth).
- `familyTreeStore` — tree view state (`viewMode` person|household, `visualMode` 2d|3d,
  `node3dRenderer` galaxy|avatars|hybrid, `colorBy`).
- `notificationsStore` (WebSocket), `uiStore`, `quickEntryStore`.

## API layer (`api/axios.ts`)

- Request interceptor: `Authorization: Bearer <token>` from localStorage.
- Response interceptor: **401 → `/v1/auth/refresh-token`**, queue in-flight requests, retry;
  **403 → toast**. Scope context travels inside the JWT (no `X-Active-Scope-Id` header).
- Domain modules: `scopes.api`, `accounts.api`, `transactions.api`, `family-unit.api`,
  `budgets.api`, `users.api`, `roles.api`, `points.api`, ...

## Multi-scope UI (fully implemented)

`components/scope/ScopeSwitcher.tsx` (header dropdown, grouped by clan), `hooks/useSwitchScope.ts`
(also used by family-tree `HouseholdNode`), `hooks/useScopeChange.ts` (legacy pages react to
`SCOPE_CHANGED_EVENT`), `api/scopes.api.ts`, `store/scopeStore.ts`, `types/scope.types.ts`.
Switching scope updates JWT + authStore + invalidates React Query.

## Reusable UI

- `components/ui/`: `DataTable`, `Select`, `ComboBox`, `CurrencyInput`, `NumberInput`,
  `DatePicker`, `SearchInput`, `PersonSelect`, `CreditCardInput`, `AvatarUploader`,
  **`PasswordInput`** (eye + generate + strength), `PasswordStrengthMeter`,
  **`UsernameInput`** (live availability via `GET /v1/users/check-username`).
- `components/common/`: `BrandLogo`/`BrandMark`, `PermissionGate`/`RoleGate`, `Modal`/portal,
  `SearchCommand` (Cmd-K), `WhatsNewModal`, `QuickEntryFab`, `SessionTimeoutModal`.
- Family tree: `components/family/graph3d/` (3D force graph) & `components/family/flow/` (2D).

## Conventions

- PascalCase components/pages, camelCase stores.
- **Styling:** Tailwind v3.4 + daisyUI v4 themes `family` (light) / `family-dark`, defined in
  `tailwind.config.js`. **daisyUI colors are `oklch`** — for WebGL/three.js use hard-coded hex,
  never parse theme color via `getComputedStyle` (V1.6.5 bug; see `graph3d/color/useGraphTheme`).
- **Password policy single source:** `utils/password.ts` (`PASSWORD_MIN_LENGTH=6`,
  `isPasswordStrong`, `evaluatePasswordStrength`, `generateStrongPassword`).
- **Permissions:** `hooks/usePermission.ts` + `PermissionGate`.
- **User-facing change:** prepend to `data/changelog.ts` + bump `package.json` version.
- **Routing:** `router/index.tsx` — lazy pages, `ProtectedRoute` with permission fallback
  (no DASHBOARD_VIEW → redirect to first accessible feature).
- **APK:** Capacitor (`android/`, `capacitor.config.ts`, appId `uz.familyfinance.app`),
  build with `VITE_API_BASE_URL` set, JDK 21 (override `JAVA_HOME`, not GraalVM).
