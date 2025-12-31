import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Allow ngrok, cloudflare tunnel and other tunnel services
    allowedHosts: [
      'localhost',
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.trycloudflare.com',
    ],
    // Proxy API requests to backend to avoid CORS issues during development
    // For local dev: use http://localhost:3005
    // For testing with VPS: use https://magiamhot.io.vn
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
      },
      '/public': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
