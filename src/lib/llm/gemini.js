import { loadSettings, saveSettings } from '../storage.js'

export const AI_MODELS = {
  fast: 'gemini-3.5-flash-lite',
  balanced: 'gemini-3.6-flash',
  quality: 'gemini-3.7-flash'
}

const ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export function getApiKey() {
  return (loadSettings().geminiKey || '').trim()
}

export function setApiKey(key) {
  saveSettings({ geminiKey: (key || '').trim() })
}

export function hasApiKey() {
  return !!getApiKey()
}

// 'fast' | 'balanced' | 'quality' (default balanced)
export function getModelChoice() {
  const m = loadSettings().geminiModel
  return AI_MODELS[m] ? m : 'balanced'
}

export function setModelChoice(choice) {
  if (AI_MODELS[choice]) saveSettings({ geminiModel: choice })
}

function endpoint() {
  return `${ENDPOINT_BASE}/${AI_MODELS[getModelChoice()]}:generateContent`
}

// Live-check the stored key with a tiny request.
export async function testApiKey() {
  try {
    await chatJSON('Reply with JSON object {"ok":true} only', { maxOutputTokens: 1024 })
    return { ok: true, model: AI_MODELS[getModelChoice()] }
  } catch (err) {
    return { ok: false, message: String(err?.message || err) }
  }
}

// One JSON-mode call. Returns raw text (valid JSON string) or throws
// Error with a short machine-friendly message.
// Multimodal call: prompt text + inline images (each { mimeType, data } where
// data is raw base64, no data: prefix). Returns raw text (valid JSON string) or throws.
export async function chatMultimodal(prompt, images = [], { maxOutputTokens = 2048, temperature = 0.4, timeoutMs = 90000, json = true } = {}) {
  const key = getApiKey()
  if (!key) throw new Error('no_api_key')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  const parts = [{ text: prompt }]
  for (const im of images) {
    if (im?.data && im?.mimeType) parts.push({ inlineData: { mimeType: im.mimeType, data: im.data } })
  }

  let res
  try {
    res = await fetch(endpoint(), {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(json ? { responseMimeType: 'application/json' } : {})
        }
      })
    })
  } catch (err) {
    clearTimeout(timer)
    throw new Error(err.name === 'AbortError' ? 'timeout' : 'network_error')
  }
  clearTimeout(timer)

  if (!res.ok) {
    let msg = `gemini_http_${res.status}`
    try {
      const body = await res.json()
      msg = body?.error?.message || msg
    } catch { /* keep generic message */ }
    throw new Error(msg)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') ?? ''
}

export async function chatJSON(prompt, { maxOutputTokens = 2048, temperature = 0.4, timeoutMs = 60000 } = {}) {
  const key = getApiKey()
  if (!key) throw new Error('no_api_key')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  let res
  try {
    res = await fetch(endpoint(), {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: 'application/json'
        }
      })
    })
  } catch (err) {
    clearTimeout(timer)
    throw new Error(err.name === 'AbortError' ? 'timeout' : 'network_error')
  }
  clearTimeout(timer)

  if (!res.ok) {
    let msg = `gemini_http_${res.status}`
    try {
      const body = await res.json()
      msg = body?.error?.message || msg
    } catch { /* keep generic message */ }
    throw new Error(msg)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') ?? ''
}
