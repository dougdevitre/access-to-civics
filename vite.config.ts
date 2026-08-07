import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Offline-first: the state bundle is a static asset. No API calls at runtime.
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', sourcemap: true },
});
