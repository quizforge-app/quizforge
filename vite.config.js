import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

// Dev-only stand-in for the Netlify TTS relay: serves /.netlify/functions/tts
// straight from the Fish Audio API when FISH_API_KEY + FISH_VOICE_ID are set
// (in the environment or a local .env). Without them it answers 503 and the
// app falls back to the on-device synthesis voice.
function fishTtsDev(env) {
  return {
    name: 'fish-tts-dev',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/tts', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        let raw = ''
        req.on('data', c => { raw += c })
        req.on('end', async () => {
          const key = (env.FISH_API_KEY || '').trim()
          const voiceId = (env.FISH_VOICE_ID || '').trim()
          if (!key || !voiceId) {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ error: 'fish_not_configured' }))
          }
          let text = '', speed = 0.95
          try {
            const j = JSON.parse(raw || '{}')
            text = String(j.text || '').slice(0, 2000).trim()
            speed = Math.min(2, Math.max(0.5, Number(j.speed) || 0.95))
          } catch {}
          if (!text) { res.statusCode = 400; return res.end('empty_text') }
          try {
            const r = await fetch('https://api.fish.audio/v1/tts', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                model: env.FISH_MODEL || 's2.1-pro-free'
              },
              body: JSON.stringify({ text, reference_id: voiceId, format: 'mp3', prosody: { speed, volume: 0 } })
            })
            if (!r.ok) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify({ error: 'fish_error', status: r.status }))
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'audio/mpeg')
            res.end(Buffer.from(await r.arrayBuffer()))
          } catch {
            res.statusCode = 502
            res.end('fish_unreachable')
          }
        })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // When building for the Capacitor APK, skip the service worker — assets are
  // already bundled inside the app (truly offline) and the SW throws on the
  // capacitor:// origin. Set VITE_TARGET=capacitor for the APK build.
  const isCapacitor = process.env.VITE_TARGET === 'capacitor'

  return {
    base: process.env.VITE_BASE || '/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [
      fishTtsDev(env),
      !isCapacitor && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'llms.txt'],
      manifest: {
        name: 'Quizard',
        short_name: 'Quizard',
        description: 'Turn your PDF, PPTX and DOCX documents into quizzes. Offline, private, 100% local.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0d14',
        theme_color: '#0b0d14',
        icons: [
          // Relative paths so the manifest works at the server root (Netlify,
          // Capacitor) and under a subpath (GitHub Pages project sites).
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Base-aware so offline fallback works under a subpath (GitHub Pages).
        // VITE_BASE may or may not carry a trailing slash — normalize it.
        navigateFallback: `${(process.env.VITE_BASE || '').replace(/\/+$/, '')}/index.html`,
        // The pdf.js worker is a multi-MB .mjs that's now loaded lazily via a
        // dynamic import — excluding it from the precache manifest is what keeps
        // the build (and the generated SW) fast.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,jpg}'],
        maximumFileSizeToCacheInBytes: 4000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600
  }
  }
})
