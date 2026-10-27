import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The UI only ever calls same-origin /api/*. In development Vite proxies those
// calls to the Meridian server; in production Meridian serves ui/dist itself.
// No ARC operator token, agent key or connector token is available to this build.
const meridian = process.env.MERIDIAN_BASE || 'http://127.0.0.1:8890'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': meridian },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
