import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// `npm run phone`: telefondan aynı Wi-Fi ile açmak için HTTPS (kamera/mikrofon HTTPS ister)
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'https' && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'SürüCep',
        short_name: 'SürüCep',
        description: 'Aile işletmeleri için sürü takip asistanı',
        lang: 'tr',
        theme_color: '#2E7D32',
        background_color: '#F5F2EA',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'], navigateFallback: 'index.html', importScripts: ['sw-notify.js'] },
    }),
  ],
}));
