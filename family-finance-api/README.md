# family-finance-api

Family Finance backend — Spring Boot 3.5.5, Java 17 (pkg `uz.familyfinance.api`).
Port **`:8098`**, context path **`/api`**, PostgreSQL 16 + Flyway.

```bash
./mvnw spring-boot:run                 # dev (profil: dev), :8098
./mvnw clean compile -DskipTests -q    # CI compile-check
./mvnw clean package -DskipTests       # jar -> target/family_finance_api.jar
```

To'liq qo'llanma (arxitektura, konventsiyalar, entity/service xaritasi):
**[`CLAUDE.md`](./CLAUDE.md)**. Umumiy kontekst: [`../docs/architecture.md`](../docs/architecture.md).
