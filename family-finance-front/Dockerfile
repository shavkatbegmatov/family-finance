# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_IMGBB_API_KEY
ARG VITE_API_BASE_URL
ENV VITE_IMGBB_API_KEY=$VITE_IMGBB_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# DIQQAT: frontend HEALTHCHECK ataylab QO'YILMAGAN. G4'da qo'shilgan
# `HEALTHCHECK wget http://localhost/` Coolify/Traefik'da konteynerni
# "unhealthy" deb belgilab, butun frontend'ni 503 ga tushirgan edi (prod
# outage). Sabab: Coolify health-gating + nginx:alpine'da wget xulqi.
# Frontend statik SPA — Coolify port-ulanish bo'yicha o'zi kuzatadi.
CMD ["nginx", "-g", "daemon off;"]
