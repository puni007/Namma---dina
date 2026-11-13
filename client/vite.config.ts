import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const nativeBuild = mode === 'android';
  return {
    plugins: [
      react(),
      ...(nativeBuild
        ? []
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: [
                'pwa.svg',
                'pwa-192x192.png',
                'pwa-512x512.png',
                'pwa-maskable-512x512.png',
                'apple-touch-icon.png',
                'favicon.png',
                'robots.txt',
                'sitemap.xml',
                'sw-push.js',
              ],
              workbox: {
                importScripts: ['/sw-push.js'],
                navigateFallbackDenylist: [/^\/api/],
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
              },
              manifest: {
                name: 'Namma Dina',
                short_name: 'Dina',
                description: 'A thoughtful space for your plans, habits and wellbeing. Make today meaningful.',
                theme_color: '#02090d',
                background_color: '#02090d',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                icons: [
                  {
                    src: '/pwa.svg',
                    sizes: 'any',
                    type: 'image/svg+xml',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-maskable-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
            }),
          ]),
    ],
    server: { proxy: { '/api': 'http://localhost:4000' } },
    test: { environment: 'node' },
  };
});
