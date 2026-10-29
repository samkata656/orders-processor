import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://<username>.github.io/orders-processor/,
// so every asset URL needs that folder prefix. Change this if you rename the repo.
export default defineConfig({
  base: '/orders-processor/',
  plugins: [react()],
});
