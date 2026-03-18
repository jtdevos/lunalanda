import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        mobileA:   resolve(__dirname, 'index-mobile-a.html'),
        mobileB:   resolve(__dirname, 'index-mobile-b.html'),
        mobileC:   resolve(__dirname, 'index-mobile-c.html'),
      },
    },
  },
});
