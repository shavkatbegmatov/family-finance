# Family Finance

Oilaviy moliyani boshqarish ilovasi — **multi-scope** model bilan: bitta odam bir yoki
bir nechta mustaqil *xonadon* (Household) hamda *maktab/sinf* kontekstlarida qatnasha oladi.
Moliya xonadon scope'i bilan, sinf ballari esa CLASS scope'i bilan alohida yuradi. Genealogiya
(oila shajarasi 2D/3D) moliyadan ajratilgan. Qo'shimcha: RBAC, ball tizimi (gamifikatsiya),
audit log.

Production: **https://family-finance.uz**

## Stack

- **Backend** (`family-finance-api/`) — Spring Boot 4.1.0, Java 21, PostgreSQL 16 + Flyway. `:8098` (`/api`).
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
- **`docs/architecture.md`** — scope/household/school modeli, auth/session, permissions, genealogiya.
- **`family-finance-api/CLAUDE.md`**, **`family-finance-front/CLAUDE.md`** — modul qo'llanmalari.
- **`CHANGELOG.md`** + `family-finance-front/src/data/changelog.ts` — versiya tarixi.
