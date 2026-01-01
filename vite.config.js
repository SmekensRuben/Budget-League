// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/', // ← voor subdomeinen!
  plugins: [react()],
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'src/components'),
      layout: path.resolve(__dirname, 'src/components/layout'),
      shared: path.resolve(__dirname, 'src/components/shared'),
      utils: path.resolve(__dirname, 'src/utils'),
      contexts: path.resolve(__dirname, 'src/contexts'),
      pages: path.resolve(__dirname, 'src/components/pages'),
      services: path.resolve(__dirname, 'src/services'),
    },
  },
});
