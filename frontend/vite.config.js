import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Під час розробки запити /api проксуються на Laravel (php artisan serve),
// тому CORS налаштовувати не потрібно.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
