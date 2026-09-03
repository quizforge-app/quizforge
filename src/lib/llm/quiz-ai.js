import { generateQuiz } from '../quizgen.js'
import { checkTyped } from '../textproc.js'
import { hasApiKey, chatJSON, chatMultimodal } from './gemini.js'
import { listDocImages, saveDocImages, updateDoc } from '../storage.js'
import { renderPdfVisuals } from '../extract/renderPage.js'
import { extractTitleLines, keyTerms, mulberry32, shuffleArr } from '../textproc.js'
import { MCQ_RULES, mcqPrompt, ID_RULES, shortGradePrompt, SHORT_GRADE_RULES, DOC_VISUAL_RULES, VISUAL_Q_RULES, visualQuestionPrompt } from './prompts.js'
import {
  extractJSONArray,
  clean,
  makeBannedCheckerFromTitles,
  validateGeneratedMcq,
  validateGeneratedClue,
  validateGeneratedShort
} from './validate.js'

function blobToDataUrlLocal(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Shrink large stored slide images before uploading to Gemini so the multimodal
// round stays fast and cheap (stored images can be multi-MB PNGs).
async function blobToDataUrlShrunk(blob, maxDim = 1280, quality = 0.8) {
  try {
    const bmp = await createImageBitmap(blob)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    const out = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (out) return await blobToDataUrlLocal(out)
  } catch { /* fall back to original */ }
  return blobToDataUrlLocal(blob)
}

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '')
  if (!m) return null
  return { mimeType: m[1], data: m[2] }
}

// Two-model document analysis.
//
// 1. GEMINI "sees" the document once (cached on the doc): it renders the
//    relevant PDF pages (or reuses already-extracted pptx/docx/photo images) and
//    returns a structured description of each visual element (code/diagram/...).
// 2. GLM authors the actual questions every run from that cached analysis.
//
// Returns { elements, cached } or null when there is nothing visual to analyze.
export async function ensureVisualAnalysis(doc) {
  if (Array.isArray(doc.visualAnalysis) && doc.visualAnalysis.length) {
    return { elements: doc.visualAnalysis, cached: true }
  }

  // Gather candidate images: render PDF pages, or reuse extracted media.
  let raw = [] // { id, page, blob, mime }
  if (doc.type === 'pdf' && doc.original instanceof Blob) {
    try {
      const rendered = await renderPdfVisuals(doc.original, { maxPages: 8 })
      raw = rendered.map(r => ({ id: null, page: r.page, blob: r.blob, mime: r.mime }))
    } catch (e) {
      console.warn('pdf visual render failed', e)
    }
  } else {
    try {
      const stored = await listDocImages(doc.id)
      raw = stored
        .filter(im => im.blob && im.blob.size >= 4096)
        .map(im => ({ id: im.id, page: im.slideNumber || 0, blob: im.blob, mime: im.mime }))
    } catch { /* best-effort */ }
  }
  if (!raw.length) return null

  const parts = []
  const kept = []
  for (const it of raw) {
    const parsed = parseDataUrl(await blobToDataUrlShrunk(it.blob, 1280, 0.8).catch(() => null))
    if (!parsed) continue
    parts.push(parsed)
    kept.push(it)
  }
  if (!parts.length) return null

  const rawAnalysis = await chatMultimodal(DOC_VISUAL_RULES, parts, { maxOutputTokens: 1500 })
  const arr = extractJSONArray(rawAnalysis) || []
  const elements = []
  for (const row of Array.isArray(arr) ? arr : []) {
    const idx = Number(row?.imageIndex)
    if (!Number.isInteger(idx) || idx < 0 || idx >= kept.length) continue
    const it = kept[idx]
    const el = {
      imageIndex: idx,
      page: Number(row.page) || it.page || idx + 1,
      kind: String(row.kind || 'figure'),
      label: clean(row.label),
      content: clean(row.content),
      imageId: it.id || null
    }
    if (!el.content || !el.label) continue
    elements.push(el)
  }
  if (!elements.length) return null

  // Store any pdf-rendered images so the quiz can display them, then map ids.
  const needStore = elements.filter(e => !e.imageId)
  if (needStore.length) {
    const toStore = needStore.map(e => ({ blob: kept[e.imageIndex].blob, mime: kept[e.imageIndex].mime, slideNumber: e.page, index: e.imageIndex }))
    try {
      await saveDocImages(doc.id, toStore)
      const storedAll = await listDocImages(doc.id)
      for (const e of needStore) {
        const match = storedAll.find(im => im.index === e.imageIndex && im.slideNumber === e.page)
        if (match) e.imageId = match.id
      }
    } catch { /* store may fail (e.g. capped); questions simply won't show the image */ }
  }

  try { await updateDoc(doc.id, { visualAnalysis: elements }) } catch { /* cache is best-effort */ }
  return { elements, cached: false }
}

// GLM authors mcq/short questions from the cached visual analysis. Each question
// may reference its source element's `imageIndex`, which we map to the stored
// image id so the renderer can show the figure.
async function authorVisualQuestions(doc, elements, isBanned, weakHint) {
  const prompt = visualQuestionPrompt(elements, weakHint)
  let arr
  try {
    arr = extractJSONArray(await chatJSON(prompt, { maxOutputTokens: 1024 + 128 * elements.length }))
  } catch { return [] }
  if (!Array.isArray(arr)) return []

  const optionRng = mulberry32((elements.length * 40503 + doc.id.length * 7) >>> 0)
  const out = []
  for (const row of arr) {
    const idx = row?.imageIndex != null ? Number(row.imageIndex) : null
    let imageId = null
    if (Number.isInteger(idx)) {
      const el = elements[idx]
      if (el && el.imageId) imageId = el.imageId
    }
    if (row?.kind === 'mcq') {
      const correct = clean(row.correct) || q.meta.term
      const ok = validateGeneratedMcq(row, correct)
      if (!ok) continue
      if (isBanned(ok.stem)) continue
      const options = shuffleArr([correct, ...ok.wrong], optionRng)
      out.push({
        type: 'mcq',
        stem: ok.stem,
        options,
        answerIndex: options.indexOf(correct),
        imageId,
        meta: { sentence: ok.stem, term: correct, docId: doc.id }
      })
    } else if (row?.kind === 'short') {
      const ok = validateGeneratedShort(row, row.answer || '')
      if (!ok) continue
      if (isBanned(ok.prompt)) continue
      out.push({
        type: 'short',
        prompt: ok.prompt,
        answer: ok.answer,
        imageId,
        meta: { sentence: ok.prompt, term: ok.answer, docId: doc.id }
      })
    }
  }
  return out
}

// Map a raw gemini failure to a short user-facing reason.
export function classifyAIError(err) {
  const msg = String(err?.message || err || '')
  if (msg === 'timeout' || msg.includes('timed out')) return 'timeout'
  if (msg === 'network_error' || msg.includes('fetch') || msg.includes('network')) return 'offline'
  if (/429|rate|quota|resource_?exhausted|throttled|all_keys/i.test(msg)) return 'quota'
  if (/api[ _]?key|permission|403|401/i.test(msg)) return 'invalid_key'
  if (/50[03]|overloaded|unavailable/i.test(msg)) return 'server_busy'
  return 'error'
}

async function requestBatch(items, relatedFor, weakHint) {
  const raw = await chatJSON(
    mcqPrompt(items, relatedFor, weakHint),
    { maxOutputTokens: 1024 + 256 * items.length }
  )
  return extractJSONArray(raw) || []
}

async function generateBatch(items, relatedFor, weakHint) {
  const arr = await requestBatch(items, relatedFor, weakHint)
  const out = new Map()
  for (const row of Array.isArray(arr) ? arr : []) {
    const i = Number(row?.i)
    if (!Number.isInteger(i)) continue
    const entry = items.find(([, idx]) => idx === i)
    if (!entry) continue
    const [q] = entry

    if (row?.kind === 'mcq') {
      const correct = clean(row.correct) || q.meta.term
      const ok = validateGeneratedMcq(row, correct)
      if (ok) out.set(i, { stem: ok.stem, wrong: ok.wrong, correct })
    } else if (row?.kind === 'id') {
      const ok = validateGeneratedClue(row, q.meta.term)
      if (ok) out.set(i, { clue: ok.clue })
    } else if (row?.kind === 'short') {
      const ok = validateGeneratedShort(row, q.meta.term)
      if (ok) out.set(i, { prompt: ok.prompt, answer: ok.answer })
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
  // exact blanking mechanics, so those stay heuristic. MCQ, ID and short
  // answers are fully written by the ai from the already-parsed sentences/terms.
  const queue = []
  base.questions.forEach((q, i) => {
    if (q.type === 'mcq' || q.type === 'id' || q.type === 'short') queue.push([q, i])
  })

  // Weakness-aware focus: bias the ai toward the learner's weak terms.
  let weakHint = null
  if (cfg.focusWeak && Array.isArray(cfg.weakTerms) && cfg.weakTerms.length) {
    const terms = cfg.weakTerms.map(w => String(w.term || w)).filter(Boolean).slice(0, 40)
    if (terms.length) {
      weakHint = `PRIORITIZE these learner-weak terms when picking sentences to quiz (use them as the answer where possible): ${terms.join(', ')}.`
    }
  }

  let done = base.questions.length - queue.length
  onProgress?.(done, base.questions.length)

  const optionRng = mulberry32((base.seed ^ 0x7a3f1d9b) >>> 0)
  let aiNote = null
  const results = new Map()
  const BATCH = 6
  for (let g = 0; g < queue.length; g += BATCH) {
    const group = queue.slice(g, g + BATCH)
    try {
      const gen = await generateBatch(group, relatedFor, weakHint)
      group.forEach(([q, i]) => {
        const genItem = gen.get(i)
        if (!genItem) return

        if (genItem.stem != null) {
          if (isBanned(genItem.stem)) return
          const correct = clean(genItem.correct) || q.meta.term
          const options = shuffleArr([correct, ...genItem.wrong], optionRng)
          results.set(i, { ...q, stem: genItem.stem, options, answerIndex: options.indexOf(correct), meta: { ...q.meta, term: correct } })
        } else if (genItem.clue != null) {
          if (isBanned(genItem.clue)) return
          results.set(i, { ...q, clue: genItem.clue })
        } else if (genItem.prompt != null) {
          results.set(i, { ...q, prompt: genItem.prompt, answer: genItem.answer })
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

  // Visual (multimodal) questions. Gemini "sees" the document once (cached on
  // the doc); GLM authors the actual questions every run. Covers code listings,
  // diagrams, charts, tables — anything that needs the visual to be answerable.
  // Best-effort: any failure just yields fewer questions.
  let imageQuestions = []
  if (cfg.deepVisual !== false) {
    try {
      const analysis = await ensureVisualAnalysis(doc)
      if (analysis && analysis.elements.length) {
        imageQuestions = await authorVisualQuestions(doc, analysis.elements, isBanned, weakHint)
      }
    } catch { /* visual round is best-effort */ }
  }

  let final = out
  if (imageQuestions.length) final = final.concat(imageQuestions)

  // Cap to the user-requested count so visual extras don't overflow.
  if (final.length > cfg.count) final = final.slice(0, cfg.count)

  if (cfg.shuffle && (polishedCount > 0 || imageQuestions.length)) {
    final = shuffleArr(final, mulberry32((base.seed ^ 0x5bf03635) >>> 0))
  }

  return {
    questions: final,
    seed: base.seed,
    error: final.length < cfg.count ? 'partial' : null,
    aiPolished: polishedCount > 0 || imageQuestions.length > 0,
    aiNote
  }
}

// Grade a free-text short answer against the reference using the ai. Returns
// true/false, or null when grading is unavailable (caller falls back to a
// local string check). Text-only, so always routes through the free provider.
export async function gradeShortAnswer(userAnswer, q) {
  const answer = (userAnswer || '').trim()
  if (!answer) return false
  const base = (q.answer || '').trim()
  if (!base) return checkTyped(answer, base || q.term || '')
  if (!hasApiKey()) return checkTyped(answer, base)
  try {
    const raw = await chatJSON(shortGradePrompt({ prompt: q.prompt, answer: base, userAnswer: answer }), {
      maxOutputTokens: 64,
      rules: SHORT_GRADE_RULES
    })
    const parsed = extractJSONArray(raw)
    const obj = Array.isArray(parsed) ? parsed[0] : raw
    if (obj && typeof obj === 'object' && typeof obj.ok === 'boolean') return obj.ok
    if (obj && typeof obj.correct === 'boolean') return obj.correct
    return null
  } catch {
    return null
  }
}
