// Resolve a root-relative asset path against the deploy base. Vite rewrites
// base-relative URLs in HTML/CSS for us, but runtime-built strings (img src
// templates, Audio src) bypass the bundler — these must go through assetUrl()
// so the app works both at the server root (Netlify, Capacitor) and under a
// subpath (GitHub Pages project sites).
export function assetUrl(path) {
  if (/^(https?:|data:|blob:|capacitor:)/i.test(path)) return path
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : base + '/'
  const clean = path.startsWith('/') ? path.slice(1) : path
  return prefix + clean
}
