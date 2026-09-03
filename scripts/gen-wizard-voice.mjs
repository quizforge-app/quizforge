// Generates the wizard tutorial voice clips with Fish Audio (free tier).
//
//   1. Get a key: https://fish.audio/app/api-keys/
//   2. (optional) Design a voice in the UI and copy its model id, then:
//        set FISH_VOICE_ID=xxxx   # skips voice-design
//      Otherwise this script designs a "wise old wizard" voice from a prompt.
//   3. Run:
//        FISH_API_KEY=xxxxx node scripts/gen-wizard-voice.mjs
//
// Output: public/wizard/tut-<step>.mp3  (one per tutorial step)
// The web app plays these during the tour; missing files simply fall back to text.

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'wizard')

const API = 'https://api.fish.audio'
const KEY = process.env.FISH_API_KEY
if (!KEY) {
  console.error('Set FISH_API_KEY (and optionally FISH_VOICE_ID) first.')
  process.exit(1)
}

const VOICE_PROMPT = 'A powerful ancient wizard — deep booming voice, commanding and mysterious, dark theatrical gravitas, slow deliberate cadence, like a grand sorcerer casting an enchantment in a vast stone hall'

// Step id -> narration. Filenames become tut-<id>.mp3.
const LINES = [
  ['library-empty', "Welcome! Tap the plus to add your first PDF, Word or text file — I will turn its pages into instant practice quizzes."],
  ['library-tour', "This is your Library — tap plus to add a document, or open one to start a quiz. Let me walk you through the app."],
  ['import', "Drop a file or paste text here. Your document never leaves this device — I read it and craft questions from the key ideas."],
  ['setup', "Pick how many questions and which styles fit your goal, then hit Start Quiz. You can tweak difficulty and focus your weak spots anytime."],
  ['quiz-first', "Read each question carefully and choose the best answer — I will show you why afterwards."],
  ['quiz-correct', "Well reasoned — that is the right one!"],
  ['quiz-wrong', "Not quite — here is the reasoning so it sticks next time."],
  ['progress-first', "This is your progress map — streaks, scores and the terms you stumble on. Revisit weak spots to master the subject."],
  ['quiz-done', "First trial complete! Practice these and the weak spots fade. You can replay this tour anytime in Settings."]
]

async function designVoice() {
  if (process.env.FISH_VOICE_ID) return process.env.FISH_VOICE_ID
  const res = await fetch(`${API}/v1/voice-design`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: VOICE_PROMPT })
  })
  if (!res.ok) throw new Error(`voice-design failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const id = data.id || data._id || data.voice_id || data.model_id
  if (!id) throw new Error('voice-design returned no id: ' + JSON.stringify(data).slice(0, 300))
  console.log('Designed voice id:', id)
  return id
}

async function speak(referenceId, text, outFile) {
  const res = await fetch(`${API}/v1/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      model: process.env.FISH_MODEL || 's2.1-pro-free'
    },
    body: JSON.stringify({
      text,
      reference_id: referenceId,
      format: 'mp3',
      prosody: { speed: 0.95, volume: 0 }
    })
  })
  if (!res.ok) throw new Error(`tts failed (${res.status}): ${await res.text().catch(() => '')}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(outFile, buf)
  console.log('  wrote', outFile, `(${(buf.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const voiceId = await designVoice()
  // Persist the voice id so the reviewer's TTS relay can reuse it —
  // put FISH_API_KEY + FISH_VOICE_ID in your .env (dev) and in the
  // Netlify environment variables (production).
  console.log('\nAdd these to your .env and to Netlify → Environment variables:')
  console.log(`FISH_API_KEY=${KEY}`)
  console.log(`FISH_VOICE_ID=${voiceId}\n`)
  try {
    const envLines = [
      `FISH_API_KEY=${KEY}`,
      `FISH_VOICE_ID=${voiceId}`,
      ''
    ].join('\n')
    await writeFile(new URL('../.env', import.meta.url), envLines)
    console.log('Wrote them to .env for local dev as well.')
  } catch {}
  for (const [id, text] of LINES) {
    const out = join(OUT_DIR, `tut-${id}.mp3`)
    console.log(`Generating ${id}…`)
    // Small retry for transient 503s.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await speak(voiceId, text, out)
        break
      } catch (e) {
        if (attempt === 3) throw e
        console.warn(`  retry (${attempt}): ${e.message}`)
        await new Promise(r => setTimeout(r, 1200 * attempt))
      }
    }
  }
  console.log('Done. Drop these next to the app; the tour will play them automatically.')
}

main().catch(e => { console.error(e.message || e); process.exit(1) })
