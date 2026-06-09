# Family Finance

Oilaviy moliyani boshqarish ilovasi — **multi-scope** model bilan: bitta odam *urug'* (Clan),
bir nechta *xonadon* (Household), loyiha/tadbir/fond kabi kontekstlarda qatnasha oladi. Har bir
kontekst alohida byudjet, hisob, qarz va jamg'armaga ega. Qo'shimcha: oila shajarasi (2D/3D),
RBAC, ball tizimi (gamifikatsiya), audit log.

Production: **https://family-finance.uz**

## Stack

- **Backend** (`family-finance-api/`) — Spring Boot 3.5.5, Java 17, PostgreSQL 16 + Flyway. `:8098` (`/api`).
- **Frontend** (`family-finance-front/`) — React 18, Vite, TypeScript, Tailwind + daisyUI. `:5178`.
- **Infra** — Docker (`docker-compose.yml`), GitHub Actions CI/CD → GHCR → Coolify. Mobil: Capacitor (Android APK).

## Quick start

```bash
# 1) PostgreSQL (yoki docker-compose.dev.yml dagi db servisi)
#    .env: DB_PASSWORD, JWT_SECRET, CARD_ENCRYPTION_KEY

# 2) Backend
cd family-finance-api && ./mvnw spring-boot:run          # :8098

# 3) Frontend
cd family-finance-front && npm install && npm run dev    # :5178  -> http://localhost:5178
```

Demo login: `admin / admin123`.

## Documentation

- **`CLAUDE.md`** — loyiha context'i, invariantlar, kod standartlari, workflow (AI agentlar + dasturchilar uchun).
- **`docs/architecture.md`** — scope/clan/household modeli, auth/session, permissions, genealogiya.
- **`family-finance-api/CLAUDE.md`**, **`family-finance-front/CLAUDE.md`** — modul qo'llanmalari.
- **`CHANGELOG.md`** + `family-finance-front/src/data/changelog.ts` — versiya tarixi.
