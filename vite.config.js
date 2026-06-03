import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages repo subpath: /<repo>/
export default defineConfig({
  base: '/clinic/',
  plugins: [react()],
  server: { port: 5173 },
});
