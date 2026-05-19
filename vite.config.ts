import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'RoadSOS — Emergency Road Help',
        short_name: 'RoadSOS',
        description: 'Fast emergency help during road accidents. Connect to ambulance, police, and rescue services instantly.',
        theme_color: '#DC2626',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        // FIX: split into 4 entries — 'any' and 'maskable' must be separate
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['medical', 'utilities', 'navigation'],
        shortcuts: [
          {
            name: 'Send SOS',
            short_name: 'SOS',
            description: 'Immediately send emergency SOS alert',
            url: '/sos',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Nearby Help',
            short_name: 'Nearby',
            description: 'Find nearest emergency services',
            url: '/nearby',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'overpass-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 8,
            }
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nominatim-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
            }
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            }
          },
          {
            // Cache Gemini API responses briefly
            urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gemini-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 },
              networkTimeoutSeconds: 10,
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    outDir: 'dist',
  },
})