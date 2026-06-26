# Backend — family-finance-api

Spring Boot 3.5.5, Java 17. Base package **`uz.familyfinance.api`**. Runs on **`:8098`**,
context path **`/api`**. See root `../CLAUDE.md` and `../docs/architecture.md` first.

## Run / build

```bash
./mvnw spring-boot:run                 # local (profile: dev), :8098
./mvnw clean compile -DskipTests -q    # compile check (what CI runs)
./mvnw clean package -DskipTests       # build jar -> target/family_finance_api.jar
```

- DB: PostgreSQL `family_finance_db` (user `family_finance_user`). Config in
  `src/main/resources/application-dev.yml` (`DB_HOST/PORT/NAME/SCHEMA` env vars).
- Hibernate dialect `org.hibernate.dialect.PostgreSQLDialect`, `ddl-auto=validate`
  (schema changes ONLY via Flyway). Timezone `Asia/Tashkent`. Swagger at `/api/swagger-ui.html`.
- Needs env: `JWT_SECRET` (base64), `CARD_ENCRYPTION_KEY` (AES), DB creds. **Tests (G6):** JUnit5
  unit (`PasswordPolicyTest`, `TransactionCurrencyValidationTest`, `JwtTokenProviderTest`) +
  Testcontainers integration (`AuthSessionIntegrationTest`, `FlywayMigrationIntegrationTest` — real PG,
  CI'da) — `./mvnw test`.

## Package layout (under `uz/familyfinance/api/`)

```
controller/   REST controllers (e.g. AuthController, ScopeController, AccountController)
service/      business logic (+ service/export for Excel/PDF)
repository/   Spring Data JPA
entity/       JPA entities (+ entity/base/BaseEntity)
dto/request/  *Request DTOs        dto/response/  *Response DTOs       dto/websocket/  WS msgs
enums/        ScopeType, ScopeRole, MembershipStatus, PermissionCode, AccountType, ...
security/     JwtTokenProvider, JwtAuthenticationFilter, CustomUserDetails, PermissionAspect
audit/        Auditable, AuditEntityListener, SensitiveDataMasker
config/  scheduler/  util/  annotation/  exception/
```

## Conventions

- **DTOs:** suffix `*Request` / `*Response`, split into `dto/request` & `dto/response`.
- **Permissions:** guard mutations with `@RequiresPermission({PermissionCode.X}, requireAll=…)`;
  AOP `PermissionAspect` enforces via `PermissionService`. (Codes: see `enums/PermissionCode`.)
- **Flyway:** new schema = new file `src/main/resources/db/migration/V49__*.sql` (latest is
  **V48**, D1a transactions scope_id). Never edit an applied migration.
- **Nullable `String` in JPQL:** wrap `CAST(:param AS string)` — otherwise Hibernate binds
  `bytea` and `lower(bytea)` fails.
- **Auditing:** entities implement `Auditable` (`getEntityName`, `toAuditMap`,
  `getSensitiveFields`); `AuditEntityListener` writes to `AuditLog`, sensitive fields masked.
- **Scoping:** resolve via `ScopeContextService` (never raw `family_group_id`). See
  `../docs/architecture.md`.

## Key entities & services

- **Financial:** `Account`, `Transaction`, `Budget`, `Debt`+`DebtPayment`, `SavingsGoal`,
  `Category`, `Card` (AES-encrypted), `BalanceSnapshot`, `TransactionSplit`, `Tag`.
- **Scope/family:** `Scope`, `ScopeMembership`, `FamilyGroup` (legacy), `FamilyMember`,
  `FamilyChild`, `FamilyPartner`, `FamilyUnit`.
- **Auth:** `User` (`isSuperAdmin`, `primaryScope`), `Session` (V44), `RoleEntity`, `Permission`,
  `LoginAttempt`.
- **Points (gamification):** `Point*` (Config, Balance, Task, Transaction, Challenge,
  Achievement, Conversion, Shop, ...).
- **Other:** `AuditLog`, `StaffNotification`, `AppSetting`, `Bank`/`BankBin`.
- **Core services:** `AuthService`, `ScopeContextService`, `ScopeService`,
  `ScopeMembershipService`, `HouseholdProvisioningService`, `SessionService`,
  `PermissionService`, `AuditLogService`, `Excel/PdfExportService`.
