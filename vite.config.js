import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The site lives in site/, the compiled designs (dist/) are served as static files next to it.
export default defineConfig({
  root: 'site',
  base: './',
  publicDir: resolve('dist'),
  build: {
    outDir: resolve('_site'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve('site/index.html'),
        preview: resolve('site/preview.html'),
        states: resolve('site/states.html'),
      },
    },
  },
});
