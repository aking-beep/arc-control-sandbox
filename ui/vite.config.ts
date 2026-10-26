import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Meridian sandbox server owns every credential (operator token, agent API
// keys, connector token). The browser only ever talks to Meridian's /api/*.
const MERIDIAN = process.env.MERIDIAN_BASE || 'http://127.0.0.1:8890'

export default defineConfig({
  // Built assets are served by company.mjs under /ui/ on the Meridian port.
  base: '/ui/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Same-origin /api/* -> Meridian. No backend change needed for dev.
    proxy: { '/api': MERIDIAN },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
