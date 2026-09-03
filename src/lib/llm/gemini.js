// The app talks to OUR backend relay (the Netlify function at
// /.netlify/functions/gemini) which holds the Gemini API keys and rotates them.
// No API key ever lives in the client.

export const MODEL_LABEL = 'gemini-3.5-flash-lite'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
const PROXY_PATH = '/.netlify/functions/gemini'

function proxyUrl() {
  return (API_BASE || '') + PROXY_PATH
}

async function proxyRequest(body, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res
  try {
    res = await fetch(proxyUrl(), {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    clearTimeout(timer)
    throw new Error(err.name === 'AbortError' ? 'timeout' : 'network_error')
  }
  clearTimeout(timer)
  if (!res.ok) {
    let msg = `relay_http_${res.status}`
    try { const b = await res.json(); msg = b?.error || b?.message || msg } catch { /* keep generic */ }
    throw new Error(msg)
  }
  return await res.text()
}

export async function chatJSON(prompt, { maxOutputTokens = 2048, temperature = 0.4, timeoutMs = 60000 } = {}) {
  return proxyRequest({ prompt, json: true, maxOutputTokens, temperature }, timeoutMs)
}

export async function chatMultimodal(prompt, images = [], { maxOutputTokens = 2048, temperature = 0.4, timeoutMs = 90000, json = true } = {}) {
  return proxyRequest({ prompt, images, json, maxOutputTokens, temperature }, timeoutMs)
}

// AI is always available through the built-in relay.
export function hasApiKey() { return true }
export function getModelPool() { return [MODEL_LABEL] }

export async function testApiKey() {
  try {
    const text = await proxyRequest({ prompt: 'Reply with JSON {"ok":true} only', json: true, maxOutputTokens: 256, temperature: 0.4 }, 20000)
    const ok = /ok"?\s*:\s*true/i.test(text)
    return { ok, working: ok ? 1 : 0, total: ok ? 1 : 0, model: MODEL_LABEL }
  } catch (e) {
    return { ok: false, message: String(e?.message || e), working: 0, total: 0 }
  }
}
