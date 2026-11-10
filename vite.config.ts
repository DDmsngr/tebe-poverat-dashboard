import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/tebe-poverat-dashboard/',
  plugins: [react(), tailwindcss()],
});
