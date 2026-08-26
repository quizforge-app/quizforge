// Client-side encoding for shareable quiz links.
// The entire quiz (questions + config) is baked into the link so a recipient
// needs ZERO API calls and ZERO Gemini key to play it. Uses native gzip when
// available (CompressionStream) and falls back to a raw base64url payload.

function bytesToB64url(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function gzip(bytes) {
  if (typeof CompressionStream === 'undefined') throw new Error('no-compress')
  const cs = new CompressionStream('gzip')
  const w = cs.writable.getWriter()
  w.write(bytes)
  w.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  return new Uint8Array(buf)
}

async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('no-decompress')
  const ds = new DecompressionStream('gzip')
  const w = ds.writable.getWriter()
  w.write(bytes)
  w.close()
  const buf = await new Response(ds.readable).arrayBuffer()
  return new Uint8Array(buf)
}

// Keep only the fields the quiz renderer needs; drop image refs (recipients
// have no local image) and explanations (saved space; re-derivable if needed).
const KEEP = ['type', 'stem', 'clue', 'statement', 'options', 'choices', 'answerIndex', 'meta', 'difficulty']

function cleanQuestion(q) {
  const o = {}
  for (const k of KEEP) if (k in q) o[k] = q[k]
  return o
}

export function buildQuizPayload(title, questions, opts = {}) {
  const qs = (questions || []).filter(q => !q.imageId).map(cleanQuestion)
  return { v: 1, t: title || 'Shared Quiz', ts: opts.timerSec || 0, q: qs }
}

export function buildChallengePayload(title, questions, challenger, opts = {}) {
  const p = buildQuizPayload(title, questions, opts)
  p.c = {
    n: challenger.name || 'Friend',
    p: challenger.percent || 0,
    c: challenger.correct || 0,
    t: challenger.total || 0
  }
  return p
}

export async function encodeShare(payload) {
  const json = JSON.stringify(payload)
  const data = new TextEncoder().encode(json)
  try {
    const gz = await gzip(data)
    return 'qf1:' + bytesToB64url(gz)
  } catch {
    return 'qf0:' + bytesToB64url(data)
  }
}

export async function decodeShare(str) {
  str = (str || '').trim()
  if (str.startsWith('qf1:')) {
    const bytes = b64urlToBytes(str.slice(4))
    try {
      const out = await gunzip(bytes)
      return JSON.parse(new TextDecoder().decode(out))
    } catch {
      throw new Error('This quiz link looks corrupted or was cut off.')
    }
  }
  if (str.startsWith('qf0:')) {
    const bytes = b64urlToBytes(str.slice(4))
    return JSON.parse(new TextDecoder().decode(bytes))
  }
  throw new Error('This is not a valid quiz link.')
}

// The base URL baked into share links. For a deployed web app this should be
// the public site URL so any recipient can open the link. Inside a standalone
// Android APK, `location.origin` is `capacitor://localhost` (not reachable),
// so we allow overriding it via VITE_SHARE_BASE_URL at build time. When unset,
// we fall back to the current origin (correct for the web build / recipient).
function shareBase() {
  const env = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SHARE_BASE_URL) || ''
  if (env) return env.replace(/\/+$/, '') + '/'
  if (typeof location !== 'undefined') return location.origin + location.pathname
  return ''
}

export function linkFromEncoded(encoded) {
  return shareBase() + '#quiz=' + encoded
}
