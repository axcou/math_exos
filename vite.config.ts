/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Chemins relatifs : le build fonctionne sur GitHub Pages comme en local.
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
