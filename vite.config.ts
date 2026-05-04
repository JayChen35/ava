import { defineConfig } from 'vite';

// If deploying to https://<user>.github.io/ldr/ keep base as '/ldr/'.
// If you ever deploy this at the domain root, change to '/'.
export default defineConfig({
  base: '/ldr/',
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
});
