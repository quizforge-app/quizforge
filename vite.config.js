import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// When building for the Capacitor APK, skip the service worker — assets are
// already bundled inside the app (truly offline) and the SW throws on the
// capacitor:// origin. Set VITE_TARGET=capacitor for the APK build.
const isCapacitor = process.env.VITE_TARGET === 'capacitor'

// Base path. GitHub Pages project sites are served under /<repo>/, so set
// VITE_BASE=/quizforge/ when building for Pages. Local dev and the APK keep '/'.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    !isCapacitor && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'QuizForge',
        short_name: 'QuizForge',
        description: 'Turn your PDF, PPTX and DOCX documents into quizzes. Offline, private, 100% local.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0d14',
        theme_color: '#0b0d14',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,mjs}'],
        maximumFileSizeToCacheInBytes: 4000000
      }
    })
  ].filter(Boolean),
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600
  }
})
