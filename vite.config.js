import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/FenceRail_RJP/',
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
