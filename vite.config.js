import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Vedacoes/',
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
