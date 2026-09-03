// Netlify Function: Fish Audio text-to-speech relay for the reviewer's
// "wizard voice". Holds the API key server-side; the client never sees it.
//
//   POST { text, speed }  ->  audio/mpeg stream
//
// Env (set in Netlify → Site settings → Environment variables):
//   FISH_API_KEY   https://fish.audio/app/api-keys/
//   FISH_VOICE_ID  the designed "wise old wizard" voice model id — the same
//                  voice used by scripts/gen-wizard-voice.mjs (FISH_VOICE_ID).
//   FISH_MODEL     optional, defaults to s2.1-pro-free
//
// If not configured the function answers 503 {error:'fish_not_configured'}
// and the app falls back to the on-device synthesis voice.

const API = 'https://api.fish.audio'

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const key = (process.env.FISH_API_KEY || '').trim()
  const voiceId = (process.env.FISH_VOICE_ID || '').trim()
  if (!key || !voiceId) {
    return new Response(JSON.stringify({ error: 'fish_not_configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response('invalid_json', { status: 400 })
  }
  const text = String(body.text || '').slice(0, 2000).trim()
  if (!text) return new Response('empty_text', { status: 400 })
  const speed = Math.min(2, Math.max(0.5, Number(body.speed) || 0.95))

  // Fish Audio's free tier occasionally answers 503/429 — retry briefly.
  let res = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(`${API}/v1/tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          model: process.env.FISH_MODEL || 's2.1-pro-free'
        },
        body: JSON.stringify({
          text,
          reference_id: voiceId,
          format: 'mp3',
          prosody: { speed, volume: 0 }
        })
      })
      if (res.ok) break
      if (attempt < 3 && (res.status === 503 || res.status === 429)) {
        await new Promise(r => setTimeout(r, 900 * attempt))
        continue
      }
      return new Response(JSON.stringify({ error: 'fish_error', status: res.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch {
      if (attempt === 3) {
        return new Response(JSON.stringify({ error: 'fish_unreachable' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      await new Promise(r => setTimeout(r, 900 * attempt))
    }
  }

  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' }
  })
}
