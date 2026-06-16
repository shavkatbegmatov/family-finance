# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---- Run stage ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/family_finance_api.jar app.jar
# Non-root foydalanuvchi (root'da ishlash xavfsizlik xavfi)
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 8098
ENV SPRING_PROFILES_ACTIVE=prod
# Konteyner limitiga moslab heap (default 25% — limit qo'yilsa OOM yoki isrof)
# Health: Coolify/Docker konteyner sog'ligini bilishi uchun (actuator/health ochiq)
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:8098/api/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
