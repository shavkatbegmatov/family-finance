import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Family Finance — Oilaviy moliya',
        short_name: 'Family Finance',
        description: 'Oilaviy byudjet, hisoblar, jamg\'arma va qarzlarni bir joyda boshqaring.',
        lang: 'uz',
        dir: 'ltr',
        categories: ['finance', 'productivity'],
        theme_color: '#0f766e',
        background_color: '#0c6e64',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/(?!api)/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: {
    // SockJS uchun global polyfill
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management & data fetching
          'vendor-state': ['zustand', 'axios'],
          // UI libraries
          'vendor-ui': ['lucide-react', 'clsx'],
          // Charts (heavy)
          'vendor-charts': ['recharts'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Form handling
          'vendor-form': ['react-hook-form'],
          // PDF & export utilities
          'vendor-export': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          // WebSocket
          'vendor-websocket': ['sockjs-client', '@stomp/stompjs'],
          // 3D force-graph (heavy — faqat 3D ko'rinish ochilganda lazy yuklanadi)
          'vendor-graph3d': ['react-force-graph-3d', 'three', 'three-spritetext'],
        },
      },
    },
  },
  server: {
    port: 5178, // CLAUDE.md va preview-tooling shu portga bog'langan
    host: true, // LAN/telefondan kirish uchun (0.0.0.0)
    strictPort: true, // Port band bo'lsa boshqasiga o'tmasin (ataylab)
    proxy: {
      '/api': {
        target: 'http://localhost:8098', // dev backend
        changeOrigin: true,
        ws: true, // WebSocket support
      },
    },
  },
})
