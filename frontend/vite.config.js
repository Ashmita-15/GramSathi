import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util'
    }
  },
  optimizeDeps: {
    include: [
      'simple-peer',
      'buffer',
      'process',
      'stream-browserify'
    ]
  },
  build: {
    commonjsOptions: {
      include: [/simple-peer/, /node_modules/]
    }
  }
})


