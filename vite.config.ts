import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first: the state bundle is a static asset precached by the service worker.
// No API calls at runtime.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        id: '/',
        name: 'Charter — a constitutional convention',
        short_name: 'Charter',
        description:
          'A civic education game built on the primary text of U.S. state constitutions.',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        lang: 'en-US',
        categories: ['education'],
        background_color: '#EDE8DC',
        theme_color: '#1B1E24',
        icons: [
          // SVG first for platforms that take it; PNGs because many still do not. The maskable
          // entry is a separate drawing with a 22% safe-zone inset — Android crops adaptive icons
          // to a circle, and the previous single icon put the seal inside the part that gets cut.
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,woff2}'],
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: true },
});
