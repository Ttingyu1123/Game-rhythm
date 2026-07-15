import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: {
        name: '月影祕律 Moonlit Arcana',
        short_name: '月影祕律',
        description: '原創四軌奇幻節奏遊戲——跟隨月光，讓每一道符文準時甦醒。',
        lang: 'zh-Hant',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#080917',
        theme_color: '#0b0c20',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Shell only. The seven MP3s (~18MB) are deliberately NOT precached — forcing
        // them all onto a first-time visitor on mobile data would be rude. Instead each
        // song is cached the first time it is played (CacheFirst below), after which it
        // works offline. Hashed filenames make stale audio impossible.
        globPatterns: ['**/*.{js,css,html,png}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'moonlit-music',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
