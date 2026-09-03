// Netlify Function: multi-provider LLM relay.
// Holds provider API keys (env GEMINI_KEYS, GLM_KEYS), rotates across them on
// 429/quota, and never exposes keys to the client.
// Served at /api/gemini (see `config.path` below).
//
// Routing:
//  - Text-only: prefer Cloudflare Workers AI (free, when CF_* env set), then
//    free GLM (glm-4.7-flash), then Gemini.
//  - Multimodal: prefer Cloudflare (if CF_VISION_MODEL set), else Gemini.
//
// Cloudflare Workers AI is a free (10k Neurons/day) provider. Enable by setting
// CF_ACCOUNT_ID + CF_API_TOKEN. Text model defaults to @cf/zai-org/glm-4.7-flash.
// Set CF_VISION_MODEL to route images to a Cloudflare multimodal model.

const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GLM_ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions'
const THROTTLE_MS = 60 * 1000

// ── Gemini key state ──
const gemThrottled = new Map()
let gemRr = 0

function getGemKeys() {
  const raw = process.env.GEMINI_KEYS || ''
  return raw.split(/[\n,]/).map(k => k.trim()).filter(Boolean)
}
function getGemModel() {
  return (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim()
}
function gemIsThrottled(key) {
  const exp = gemThrottled.get(key)
  if (!exp) return false
  if (Date.now() > exp) { gemThrottled.delete(key); return false }
  return true
}
function gemMarkThrottled(key) { gemThrottled.set(key, Date.now() + THROTTLE_MS) }
function gemCombo(keys, model) {
  const combos = keys.map(k => [model, k])
  const n = combos.length
  if (!n) return []
  const ordered = []
  for (let i = 0; i < n; i++) ordered.push(combos[(gemRr + i) % n])
  gemRr = (gemRr + 1) % n
  const live = ordered.filter(([, k]) => !gemIsThrottled(k))
  return live.length ? live : ordered
}

// ── GLM key state ──
const glmThrottled = new Map()
let glmRr = 0
function getGlmKeys() {
  const raw = process.env.GLM_KEYS || ''
  return raw.split(/[\n,]/).map(k => k.trim()).filter(Boolean)
}
function getGlmModel() {
  return (process.env.GLM_MODEL || 'glm-4.7-flash').trim()
}
function glmIsThrottled(key) {
  const exp = glmThrottled.get(key)
  if (!exp) return false
  if (Date.now() > exp) { glmThrottled.delete(key); return false }
  return true
}
function glmMarkThrottled(key) { glmThrottled.set(key, Date.now() + THROTTLE_MS) }
function glmCombo(keys, model) {
  const combos = keys.map(k => [model, k])
  const n = combos.length
  if (!n) return []
  const ordered = []
  for (let i = 0; i < n; i++) ordered.push(combos[(glmRr + i) % n])
  glmRr = (glmRr + 1) % n
  const live = ordered.filter(([, k]) => !glmIsThrottled(k))
  return live.length ? live : ordered
}

function isQuota(msg, status) {
  if (status === 429) return true
  const m = (msg || '').toLowerCase()
  return /quota|rate[\s_-]?limit|resource_exhausted|exceeded.*limit|too many requests/.test(m)
}

async function callGemini(model, key, payload) {
  let res
  try {
    res = await fetch(`${GEMINI_ENDPOINT_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    return { networkError: String(err?.message || err) }
  }
  if (!res.ok) {
    let msg = `gemini_http_${res.status}`
    try { const b = await res.json(); msg = b?.error?.message || msg } catch { /* keep */ }
    if (isQuota(msg, res.status)) { gemMarkThrottled(key); return { error: msg } }
    return { fatal: msg }
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') ?? ''
  return { text }
}

async function callGlm(model, key, { prompt, json, temperature, maxOutputTokens }) {
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxOutputTokens
  }
  if (json) body.response_format = { type: 'json_object' }
  let res
  try {
    res = await fetch(GLM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body)
    })
  } catch (err) {
    return { networkError: String(err?.message || err) }
  }
  if (!res.ok) {
    let msg = `glm_http_${res.status}`
    try { const b = await res.json(); msg = b?.error?.message || b?.message || msg } catch { /* keep */ }
    if (isQuota(msg, res.status)) { glmMarkThrottled(key); return { error: msg } }
    return { fatal: msg }
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content ?? ''
  return { text }
}

// ── Cloudflare Workers AI provider (free tier) ──
const CF_ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts'
let cfThrottledUntil = 0
function cfEnabled(model) {
  const account = process.env.CF_ACCOUNT_ID
  const token = process.env.CF_API_TOKEN
  if (!account || !token || !model) return false
  if (Date.now() < cfThrottledUntil) return false
  return true
}
function cfMarkThrottled() { cfThrottledUntil = Date.now() + THROTTLE_MS }

async function callCloudflare(model, { messages, json, temperature, maxOutputTokens }) {
  const account = process.env.CF_ACCOUNT_ID
  const token = process.env.CF_API_TOKEN
  const body = { messages, temperature, max_tokens: maxOutputTokens }
  if (json) body.response_format = { type: 'json_object' }
  let res
  try {
    res = await fetch(`${CF_ENDPOINT}/${account}/ai/run/${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    })
  } catch (err) {
    return { networkError: String(err?.message || err) }
  }
  if (!res.ok) {
    let msg = `cf_http_${res.status}`
    try { const b = await res.json(); msg = b?.errors?.[0]?.message || b?.error?.message || msg } catch { /* keep */ }
    if (isQuota(msg, res.status)) { cfMarkThrottled(); return { error: msg } }
    return { fatal: msg }
  }
  const data = await res.json()
  const text = data?.result?.response ?? data?.result?.choices?.[0]?.message?.content ?? ''
  return { text }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

function ok(text) {
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } })
}
function fail(status, msg) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return fail(400, 'invalid_json')
  }

  const prompt = body.prompt
  const images = Array.isArray(body.images) ? body.images : []
  const json = body.json !== false
  const maxOutputTokens = Number(body.maxOutputTokens) || 2048
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.4

  const parts = [{ text: prompt }]
  for (const im of images) {
    if (im?.data && im?.mimeType) parts.push({ inlineData: { mimeType: im.mimeType, data: im.data } })
  }
  const gemPayload = {
    contents: [{ parts }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(json ? { responseMimeType: 'application/json' } : {})
    }
  }

  // Multimodal: prefer Cloudflare (if configured), else Gemini.
  if (images.length > 0) {
    const cfVisionModel = process.env.CF_VISION_MODEL || ''
    if (cfEnabled(cfVisionModel)) {
      const content = [{ type: 'text', text: prompt }]
      for (const im of images) {
        if (im?.data && im?.mimeType) {
          content.push({ type: 'image_url', image_url: { url: `data:${im.mimeType};base64,${im.data}` } })
        }
      }
      const r = await callCloudflare(cfVisionModel, {
        messages: [{ role: 'user', content }],
        json, temperature, maxOutputTokens
      })
      if (r.text != null && r.text !== '') return ok(r.text)
      cfMarkThrottled()
    }
    const model = getGemModel()
    const combos = gemCombo(getGemKeys(), model)
    let lastErr = null
    for (const [, key] of combos) {
      if (gemIsThrottled(key)) continue
      const r = await callGemini(model, key, gemPayload)
      if (r.networkError) { lastErr = r.networkError; continue }
      if (r.fatal) return fail(502, r.fatal)
      if (r.error) { lastErr = r.error; continue }
      return ok(r.text)
    }
    return fail(429, lastErr || 'all_keys_throttled')
  }

  // Text-only: prefer Cloudflare Workers AI (free), then GLM, then Gemini.
  const cfTextModel = process.env.CF_TEXT_MODEL || '@cf/zai-org/glm-4.7-flash'
  if (cfEnabled(cfTextModel)) {
    const r = await callCloudflare(cfTextModel, {
      messages: [{ role: 'user', content: prompt }],
      json, temperature, maxOutputTokens
    })
    if (r.text != null && r.text !== '') return ok(r.text)
    cfMarkThrottled()
  }

  const glmKeys = getGlmKeys()
  if (glmKeys.length) {
    const model = getGlmModel()
    const combos = glmCombo(glmKeys, model)
    for (const [, key] of combos) {
      if (glmIsThrottled(key)) continue
      const r = await callGlm(model, key, { prompt, json, temperature, maxOutputTokens })
      if (r.networkError || r.error || r.fatal) continue
      return ok(r.text)
    }
    // fall through to Gemini
  }

  const model = getGemModel()
  const combos = gemCombo(getGemKeys(), model)
  if (!combos.length) return fail(503, 'no_keys_configured')
  let lastErr = null
  for (const [, key] of combos) {
    if (gemIsThrottled(key)) continue
    const r = await callGemini(model, key, gemPayload)
    if (r.networkError) { lastErr = r.networkError; continue }
    if (r.fatal) return fail(502, r.fatal)
    if (r.error) { lastErr = r.error; continue }
  return ok(r.text)
}
  return fail(429, lastErr || 'all_keys_throttled')
}
