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
# Health: konteyner SPA'ni servis qila olishini tekshiradi
# (non-root: nginx:alpine 80-portni bog'lash uchun root talab qiladi — port
# o'zgartirish Coolify config'iga ta'sir qilgani uchun ataylab qoldirildi)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
