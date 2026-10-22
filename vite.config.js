import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ВАЖНО: здесь должно быть имя твоего будущего репозитория на GitHub
export default defineConfig({
  plugins: [react()],
  base: '/kinoteka-react/', 
})