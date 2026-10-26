# Porting into `arc-control-sandbox/ui/`

The canvas connection to `aking-beep/arc-control-sandbox` is a read-only mount, so this design could not be committed into the branch from here. Every file in this bundle is meant to go into `ui/src/` without changes. Only the four files below are new.

```text
arc-control-sandbox/
  src/, tests/, public/      ← unchanged (backend, 17 scenarios, Phase 2, tests)
  ui/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/                     ← copy this bundle here (App.tsx, index.tsx, index.css, lib/, data/, components/, screens/)
```

## ui/package.json

```json
{
  "name": "meridian-validation-lab-ui",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "6.30.2",
    "framer-motion": "11.18.2",
    "lucide-react": "0.577.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.3.1",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "4.3.1",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

The root `package.json` is untouched, so the backend still has zero runtime dependencies.

## ui/vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Same-origin /api/* → Meridian. No backend change needed.
    proxy: { '/api': 'http://127.0.0.1:8890' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
```

## ui/index.html

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Meridian Validation Lab</title></head>
  <body><div id="root"></div><script type="module" src="/src/index.tsx"></script></body>
</html>
```

## ui/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"], "module": "ESNext",
    "moduleResolution": "Bundler", "jsx": "react-jsx", "strict": true, "noEmit": true,
    "skipLibCheck": true, "isolatedModules": true
  },
  "include": ["src"]
}
```

## Running

```bash
npm start                 # terminal 1, unchanged three-server stack
cd ui && npm install && npm run dev   # terminal 2 → http://127.0.0.1:5173
```

The UI checks `/api/health`. If it gets a response, the UI switches to **Live** and enables the run controls. Otherwise it stays in **Design fixture** mode.

Serving `ui/dist` from :8890 directly would need `src/company.mjs`'s three-entry asset map extended. That is a backend change, so it was left out on purpose.
