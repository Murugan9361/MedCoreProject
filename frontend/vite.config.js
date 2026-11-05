import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/users': 'http://127.0.0.1:8000',
      '/admins': 'http://127.0.0.1:8000',
      '/doctors': 'http://127.0.0.1:8000',
      '/attenders': 'http://127.0.0.1:8000',
      '/patients': 'http://127.0.0.1:8000',
      '/hospitals': 'http://127.0.0.1:8000',
      '/appointments': 'http://127.0.0.1:8000',
      '/audit-logs': 'http://127.0.0.1:8000',
      '/lab-files': 'http://127.0.0.1:8000',
      '/billing': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/directory': 'http://127.0.0.1:8000',
      '/dictation': 'http://127.0.0.1:8000',
    },
  },
});
