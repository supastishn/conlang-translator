import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/conlang-translator/',
  plugins: [react()],
  server: {
    proxy: {
      '/v1': {
        target: 'https://fra.cloud.appwrite.io/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, ''),
      }
    }
  }
})
