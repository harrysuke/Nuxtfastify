import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Fastify backend lives on port 3001. Proxying /api keeps requests
// same-origin, so the session cookie works without CORS configuration.
const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
