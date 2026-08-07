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
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Charter — a constitutional convention',
        short_name: 'Charter',
        description:
          'A civic education game built on the primary text of U.S. state constitutions.',
        start_url: '/',
        display: 'standalone',
        background_color: '#EDE8DC',
        theme_color: '#1B1E24',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,woff2}'],
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: true },
});
