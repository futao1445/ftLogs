import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3333,
    proxy: {
      '/api': 'http://localhost:1111',
      '/uploads': 'http://localhost:1111',
    },
  },
})
