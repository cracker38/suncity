import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SUN CITY NYAKARAMBI Hotel',
        short_name: 'SUN CITY',
        description: 'Enterprise Hotel Management & Reservation System',
        theme_color: '#114B3A',
        background_color: '#F8F8F8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],

  server: {
    host: '0.0.0.0', // Allow access from other devices on the network
    port: 5173,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});