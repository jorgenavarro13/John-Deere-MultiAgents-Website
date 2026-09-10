import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  publicDir: '../Build',
  plugins: [
    react(),
    tailwindcss()
  ],
  base: '/John-Deere-MultiAgents-Website/',
})
