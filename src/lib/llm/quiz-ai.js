import { generateQuiz } from '../quizgen.js'
import { hasApiKey, chatJSON, chatMultimodal } from './gemini.js'
import { listDocImages } from '../storage.js'
import { extractTitleLines, keyTerms, mulberry32, shuffleArr } from '../textproc.js'
import { MCQ_RULES, IMAGE_RULES, mcqPrompt } from './prompts.js'
import {
  extractJSONArray,
  clean,
  makeBannedCheckerFromTitles,
  validateGeneratedMcq,
  validateGeneratedClue
} from './validate.js'

function blobToDataUrlLocal(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '')
  if (!m) return null
  return { mimeType: m[1], data: m[2] }
}

// Build image-grounded mcq questions from the document's stored images.
// Returns quiz-question objects carrying `imageId` (the stored image id).
async function generateImageQuestions(doc, sentImages, isBanned) {
  const raw = await chatMultimodal(
    IMAGE_RULES,
    sentImages.map(s => s.part),
    { maxOutputTokens: 1024 + 300 * sentImages.length }
  )
  const arr = extractJSONArray(raw) || []
  const rng = mulberry32((sentImages.length * 2654435761) >>> 0)
  const out = []
  for (const row of Array.isArray(arr) ? arr : []) {
    const idx = Number(row?.imageIndex)
    if (!Number.isInteger(idx) || idx < 0 || idx >= sentImages.length) continue
    const correct = clean(row.correct)
    const ok = validateGeneratedMcq({ stem: row.stem, wrong: row.wrong }, correct)
    if (!ok) continue
    if (isBanned(ok.stem)) continue
    const options = shuffleArr([correct, ...ok.wrong], rng)
    out.push({
      type: 'mcq',
      stem: ok.stem,
      options,
      answerIndex: options.indexOf(correct),
      imageId: sentImages[idx].id,
      meta: { sentence: ok.stem, term: correct, docId: doc.id }
    })
  }
  return out
}

// Map a raw gemini failure to a short user-facing reason.
export function classifyAIError(err) {
  const msg = String(err?.message || err || '')
  if (msg === 'timeout' || msg.includes('timed out')) return 'timeout'
  if (msg === 'network_error' || msg.includes('fetch') || msg.includes('network')) return 'offline'
  if (/429|rate|quota|resource_?exhausted/i.test(msg)) return 'quota'
  if (/api[ _]?key|permission|403|401/i.test(msg)) return 'invalid_key'
  if (/50[03]|overloaded|unavailable/i.test(msg)) return 'server_busy'
  return 'error'
}

async function requestBatch(items, relatedFor) {
  const raw = await chatJSON(
    mcqPrompt(items, relatedFor),
    { maxOutputTokens: 1024 + 256 * items.length }
  )
  return extractJSONArray(raw) || []
}

async function generateBatch(items, relatedFor) {
  const arr = await requestBatch(items, relatedFor)
  const out = new Map()
  for (const row of Array.isArray(arr) ? arr : []) {
    const i = Number(row?.i)
    if (!Number.isInteger(i)) continue
    const entry = items.find(([, idx]) => idx === i)
    if (!entry) continue
    const [q] = entry

    if (row?.kind === 'mcq') {
      const ok = validateGeneratedMcq(row, q.meta.term)
      if (ok) out.set(i, { stem: ok.stem, wrong: ok.wrong })
    } else if (row?.kind === 'id') {
      const ok = validateGeneratedClue(row, q.meta.term)
      if (ok) out.set(i, { clue: ok.clue })
    }
  }
  return out
}

export async function generateQuizAI(doc, cfg, onProgress) {
  const base = generateQuiz(doc, cfg)
  if (base.error === 'not_enough_content' || !base.questions.length) return base

  if (!hasApiKey()) {
    return { ...base, aiPolished: false, aiError: true, aiNote: 'no_key' }
  }

  const isBanned = makeBannedCheckerFromTitles(doc.name, extractTitleLines(doc.text))

  // Build a bank of the document's real key terms so the ai can ground its
  // distractors in THIS pdf's subject matter rather than inventing generic ones.
  const termBank = keyTerms(doc.text).map(r => r.term.toLowerCase())
  const stTok = s => new Set((String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []))
  const relatedFor = q => {
    const st = stTok(q.meta.sentence + ' ' + q.meta.term)
    const term = String(q.meta.term).toLowerCase()
    const scored = termBank
      .filter(t => t !== term)
      .map(t => {
        const tt = stTok(t)
        let overlap = 0
        for (const w of tt) if (st.has(w)) overlap++
        return [t, overlap]
      })
      .sort((a, b) => b[1] - a[1] || (optionRng() - 0.5))
    return scored.slice(0, 10).map(s => s[0])
  }

  // TF statements come verbatim from source sentences and FIB relies on
  // exact blanking mechanics, so those stay heuristic. MCQ and ID are
  // fully written by the ai from the already-parsed sentences/terms.
  const queue = []
  base.questions.forEach((q, i) => {
    if (q.type === 'mcq' || q.type === 'id') queue.push([q, i])
  })

  let done = base.questions.length - queue.length
  onProgress?.(done, base.questions.length)

  const optionRng = mulberry32((base.seed ^ 0x7a3f1d9b) >>> 0)
  let aiNote = null
  const results = new Map()
  const BATCH = 6
  for (let g = 0; g < queue.length; g += BATCH) {
    const group = queue.slice(g, g + BATCH)
    try {
      const gen = await generateBatch(group, relatedFor)
      group.forEach(([q, i]) => {
        const genItem = gen.get(i)
        if (!genItem) return

        if (genItem.stem != null) {
          if (isBanned(genItem.stem)) return
          const options = shuffleArr([q.meta.term, ...genItem.wrong], optionRng)
          results.set(i, { ...q, stem: genItem.stem, options, answerIndex: options.indexOf(q.meta.term) })
        } else if (genItem.clue != null) {
          if (isBanned(genItem.clue)) return
          results.set(i, { ...q, clue: genItem.clue })
        }
      })
    } catch (err) {
      if (!aiNote) aiNote = classifyAIError(err)
    }
    done = Math.min(base.questions.length, done + group.length)
    onProgress?.(done, base.questions.length)
  }

  let polishedCount = 0
  const out = base.questions.map((q, i) => {
    const next = results.get(i)
    if (!next) return q
    polishedCount++
    return next
  })

  // Image-grounded questions: best-effort, only when the document has slides.
  let imageQuestions = []
  try {
    const stored = await listDocImages(doc.id)
    const usable = stored.filter(im => im.blob && im.blob.size >= 4096).slice(0, 6)
    if (usable.length) {
      const sentImages = []
      for (const im of usable) {
        const parsed = parseDataUrl(await blobToDataUrlLocal(im.blob).catch(() => null))
        if (parsed) sentImages.push({ id: im.id, part: parsed })
      }
      if (sentImages.length) imageQuestions = await generateImageQuestions(doc, sentImages, isBanned)
    }
  } catch { /* image round is best-effort */ }

  let final = out
  if (imageQuestions.length) final = final.concat(imageQuestions)
  if (cfg.shuffle && (polishedCount > 0 || imageQuestions.length)) {
    final = shuffleArr(final, mulberry32((base.seed ^ 0x5bf03635) >>> 0))
  }

  return {
    questions: final,
    seed: base.seed,
    error: base.error,
    aiPolished: polishedCount > 0 || imageQuestions.length > 0,
    aiNote
  }
}
