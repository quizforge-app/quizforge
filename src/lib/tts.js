// Reviewer read-aloud: a powerful wizard's voice.
//
// Primary  — Fish Audio "wise old wizard" voice, fetched from the server
//            relay (/.netlify/functions/tts) and played through a Web Audio
//            hall-reverb graph so the voice itself echoes.
// Fallback — on-device speech synthesis pitched deep, with a soft reverb-soaked
//            drone underneath (used in offline/dev when the relay isn't set up).

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
const TTS_URL = API_BASE + '/.netlify/functions/tts'

let onIndexCallback = null
let onEndCallback = null
let stopped = false
let playMode = null // 'fish' | 'local' | null

// ── shared speech-synthesis state (fallback voice) ──
let currentUtterances = []
let chosenVoice = null

// Names ranked from most "deep storyteller" to acceptable fallback.
const WIZARD_VOICE_HINTS = [
  'google uk english male',
  'daniel', 'arthur', 'oliver', 'george',
  'microsoft guy', 'microsoft davis', 'microsoft george', 'microsoft ryan',
  'microsoft david', 'en-gb', 'alex', 'aaron', 'fred', 'male'
]

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickWizardVoice() {
  if (!isSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const en = voices.filter(v => /^en/i.test(v.lang))
  const pool = en.length ? en : voices
  for (const hint of WIZARD_VOICE_HINTS) {
    const hit = pool.find(v => v.name.toLowerCase().includes(hint) || v.lang.toLowerCase().includes(hint))
    if (hit) return hit
  }
  return pool.find(v => v.default) || pool[0]
}

if (isSupported()) {
  window.speechSynthesis.onvoiceschanged = () => { chosenVoice = pickWizardVoice() }
}

// Punctuation that makes engines linger: ellipses read as heavy pauses.
function dramaticize(text) {
  return text
    .replace(/([.!?])\s+/g, '$1 … ')
    .replace(/\s+—\s+/g, ' … ')
}

/* ── Web Audio helpers ── */
function makeImpulse(ac, seconds, decay) {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

let audioCtx = null
function ctx() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// ── Fish Audio path: hidden <audio> through a convolver reverb ──
let fish = null // { el, ac, urls: [], abort: null }
function fishGraph() {
  if (fish) return fish
  const el = document.createElement('audio')
  el.preload = 'auto'
  el.style.display = 'none'
  document.body.appendChild(el)
  const ac = ctx()
  const src = ac.createMediaElementSource(el)
  const dry = ac.createGain(); dry.gain.value = 0.85
  const wet = ac.createGain(); wet.gain.value = 0.5
  const conv = ac.createConvolver()
  conv.buffer = makeImpulse(ac, 2.8, 2.6)
  src.connect(dry); dry.connect(ac.destination)
  src.connect(conv); conv.connect(wet); wet.connect(ac.destination)
  fish = { el, ac, urls: [], abort: null }
  return fish
}

async function fetchFishChunk(text, speed, signal) {
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed }),
    signal
  })
  if (!res.ok) throw new Error('fish_unavailable')
  return URL.createObjectURL(await res.blob())
}

function playFish(textList, speed, firstUrl) {
  playMode = 'fish'
  const g = fishGraph()
  const urls = [firstUrl, ...textList.slice(1).map(() => null)]
  g.urls = urls

  // prefetch the remaining paragraphs one by one (gentle on the free tier)
  const prefetch = async () => {
    for (let i = 1; i < textList.length; i++) {
      if (stopped) return
      try {
        urls[i] = await fetchFishChunk(textList[i], speed, g.abort.signal)
      } catch { return } // network lost mid-read → let playback finish what's left
    }
  }
  prefetch()

  let idx = 0
  const playNext = () => {
    if (stopped) return
    if (idx >= textList.length) {
      onEndCallback?.()
      return
    }
    const url = urls[idx]
    if (!url) { setTimeout(playNext, 500); return } // still generating
    g.el.src = url
    g.el.onplay = () => { if (!stopped) onIndexCallback?.(idx) }
    g.el.onended = () => {
      if (stopped) return
      idx++
      setTimeout(playNext, 420) // a breath between paragraphs
    }
    g.el.onerror = () => {
      if (stopped) return
      idx++
      playNext()
    }
    g.el.play().catch(() => {})
  }
  playNext()
}

/* ── Local fallback: deep synthesis voice + soft drone ── */
let localUtterances = []
let ambience = null

function startAmbience() {
  try {
    const ac = ctx()
    const conv = ac.createConvolver()
    conv.buffer = makeImpulse(ac, 2.8, 2.6)
    const master = ac.createGain()
    master.gain.value = 0
    master.gain.setTargetAtTime(0.05, ac.currentTime, 1.3)
    const oscs = [55, 82.41, 110.0].map((f, i) => {
      const o = ac.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      o.detune.value = i * 4 - 4
      const g = ac.createGain()
      g.gain.value = i === 0 ? 0.5 : 0.2
      o.connect(g)
      g.connect(conv)
      o.start()
      return o
    })
    conv.connect(master)
    master.connect(ac.destination)
    ambience = { oscs, master }
  } catch { /* audio is optional polish */ }
}

function stopAmbience() {
  if (!ambience) return
  try {
    const { oscs, master } = ambience
    master.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.5)
    setTimeout(() => { oscs.forEach(o => { try { o.stop() } catch {} }) }, 1800)
  } catch {}
  ambience = null
}

function speakLocal(textList, { rate = 1 } = {}) {
  playMode = 'local'
  startAmbience()
  if (!chosenVoice) chosenVoice = pickWizardVoice()
  const pauseBetween = 420
  const speakRate = Math.max(0.5, rate * 0.92)

  currentUtterances = textList.map(text => {
    const u = new SpeechSynthesisUtterance(dramaticize(text))
    u.rate = speakRate
    u.pitch = 0.6
    u.volume = 1
    if (chosenVoice) {
      u.voice = chosenVoice
      u.lang = chosenVoice.lang
    } else {
      u.lang = navigator.language || 'en-US'
    }
    return u
  })

  let next = 0
  const speakNext = () => {
    if (stopped) return
    if (next >= currentUtterances.length) {
      stopAmbience()
      onEndCallback?.()
      return
    }
    const u = currentUtterances[next]
    const idx = next
    next++
    u.addEventListener('start', () => { if (!stopped) onIndexCallback?.(idx) })
    const advance = () => {
      if (stopped) return
      if (idx >= currentUtterances.length - 1) onEndCallback?.()
      else setTimeout(speakNext, pauseBetween)
    }
    u.addEventListener('end', advance)
    u.addEventListener('error', advance)
    window.speechSynthesis.speak(u)
  }
  speakNext()
}

/* ── Public API ── */
export async function speak(textList, { rate = 1, onindex = null, onend = null } = {}) {
  stop()
  stopped = false
  onIndexCallback = onindex
  onEndCallback = onend
  if (!textList.length) { onEndCallback?.(); return }

  const speed = Math.min(2, Math.max(0.5, rate * 0.95))
  const abort = new AbortController()
  fishGraph().abort = abort

  try {
    // Probe with the first paragraph — if the relay isn't configured this
    // throws immediately and we fall back to the on-device wizard voice.
    const firstUrl = await fetchFishChunk(textList[0], speed, abort.signal)
    if (stopped) { URL.revokeObjectURL(firstUrl); return }
    playFish(textList, speed, firstUrl)
  } catch {
    if (stopped) return
    speakLocal(textList, { rate })
  }
}

export function pause() {
  if (playMode === 'fish' && fish) fish.el.pause()
  else if (isSupported()) window.speechSynthesis.pause()
}

export function resume() {
  if (playMode === 'fish' && fish) fish.el.play().catch(() => {})
  else if (isSupported()) window.speechSynthesis.resume()
}

export function stop() {
  stopped = true
  playMode = null
  if (fish) {
    fish.abort?.abort()
    try { fish.el.pause() } catch {}
    fish.el.removeAttribute('src')
    fish.urls.forEach(u => { if (u) URL.revokeObjectURL(u) })
    fish.urls = []
  }
  if (isSupported()) {
    window.speechSynthesis.cancel()
    currentUtterances = []
  }
  stopAmbience()
}
