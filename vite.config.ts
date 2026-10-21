import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { aiPlugin } from './server/aiPlugin.ts'

// https://vite.dev/config/
// Server secrets (GEMINI_API_KEY, APP_SECRET) are read by server/api from .env / .env.local; only
// VITE_-prefixed variables can reach the client bundle, and none are used.
export default defineConfig({
  plugins: [react(), aiPlugin()],
})
