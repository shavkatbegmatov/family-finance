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
        name: 'Family Finance',
        short_name: 'FF',
        description: 'Oilaviy moliya boshqaruvi',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
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
        },
      },
    },
  },
  server: {
    port: 5178,
    host: true, // SHU QATORNI QO'SHING - teldan kirish uchun shart!
    strictPort: true, // Agar 5175 band bo'lsa, boshqa portga o'tib ketmasligi uchun
    // Port removed - Vite will use any available port (default 5173)
    // This allows flexibility when multiple dev servers are running
    proxy: {
      '/api': {
        target: 'http://localhost:8098',
        // target: 'http://192.168.1.33:8080',
        changeOrigin: true,
        ws: true, // WebSocket support
      },
    },
  },
})
