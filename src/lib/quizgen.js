import { sentences, words, termFreq, keyTerms, scoreSentences, stripHeadings, mulberry32, shuffleArr } from './textproc.js'
import { detectTopics } from './topics.js'

export function buildMistakeQuestions(mistakes, docTerms) {
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0)
  return mistakes.map(m => {
    const pool = (docTerms.get(m.docId) || []).filter(t => t.term !== m.term.toLowerCase())
    if (pool.length >= 3) {
      const distractors = pickDistractors({ term: m.term }, pool, rng, 3)
      if (distractors.length === 3) {
        const options = shuffleArr([m.term, ...distractors], rng)
        return {
          type: 'mcq',
          stem: blankTerm(m.sentence, m.term),
          options,
          answerIndex: options.indexOf(m.term),
          meta: { sentence: m.sentence, term: m.term, docId: m.docId }
        }
      }
    }
    const re = new RegExp(m.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    return {
      type: 'id',
      clue: m.sentence.replace(re, '………'),
      answer: m.term,
      meta: { sentence: m.sentence, term: m.term, docId: m.docId }
    }
  }).filter(Boolean)
}

export const TYPE_META = {
  mcq: { name: 'Multiple Choice', short: 'MCQ' },
  tf: { name: 'True or False', short: 'T/F' },
  fib: { name: 'Fill the Blank', short: 'Blank' },
  id: { name: 'Identification', short: 'Identify' }
}

const DIFFICULTY = {
  easy: [0, 0.35],
  medium: [0.3, 0.75],
  hard: [0.65, 1]
}

function findTermInSentence(sentence, terms) {
  const lower = ' ' + sentence.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ') + ' '
  for (const t of terms) {
    const needle = t.phrase ? t.term : ` ${t.term} `
    if (lower.includes(t.phrase ? t.term : needle)) {
      const idx = sentence.toLowerCase().indexOf(t.term)
      const re = new RegExp(t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (idx !== -1 && re.test(sentence)) return t
    }
  }
  return null
}

function blankTerm(sentence, term) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return sentence.replace(re, '\u0000BLANK\u0000')
}

function pickDistractors(term, terms, rng, count = 3) {
  const shape = term.term.split(/[\s-]+/).length
  const len = term.term.length
  const sameShape = terms.filter(t => {
    if (t.term === term.term) return false
    const a = t.term.split(/[\s-]+/).length
    return a === shape || Math.abs(a - shape) <= 1
  })
  sameShape.sort((a, b) => Math.abs(a.term.length - len) - Math.abs(b.term.length - len))
  const pool = sameShape.length >= count ? sameShape : terms.filter(t => t.term !== term.term)
  if (!pool.length) return []
  const out = []
  const bag = shuffleArr(pool, rng)
  for (const cand of bag) {
    if (out.length >= count) break
    if (cand.term !== term.term && !out.some(o => o.term === cand.term)) out.push(cand)
  }
  return out.map(d => d.term)
}

function tweakNumbers(sentence, rng) {
  let changed = false
  const result = sentence.replace(/\b(\d{1,4})(\.\d+)?\b/g, (full, intPart, decPart) => {
    if (changed) return full
    if (['1', '2', '3'].includes(intPart) && rng() < 0.5) return full
    const n = parseInt(intPart, 10)
    const delta = n > 20 ? Math.max(2, Math.round(n * (0.15 + rng() * 0.35))) : 1 + Math.floor(rng() * 3)
    const nn = Math.max(1, n + (rng() < 0.5 ? delta : -delta))
    changed = true
    return String(nn) + (decPart || '')
  })
  return changed ? result : null
}

function allocateCounts(enabledTypes, total) {
  const per = Math.floor(total / enabledTypes.length)
  const counts = {}
  enabledTypes.forEach(t => { counts[t] = per })
  let rem = total - per * enabledTypes.length
  for (let i = 0; rem > 0; i = (i + 1) % enabledTypes.length) {
    counts[enabledTypes[i]]++
    rem--
    if (rem === 0) break
  }
  return counts
}

export function estimateAvailable(doc, config) {
  const probe = { ...config, count: 999 }
  const gen = generateQuiz(doc, probe)
  return gen.questions.length
}

export function generateQuiz(doc, config) {
  const seed = config.fixedSeed != null ? config.fixedSeed : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  const rng = mulberry32(seed ^ require_hash(doc.id))

  // strip heading/title lines BEFORE any term or sentence analysis so
  // questions can never be built from document titles
  const text = stripHeadings(doc.text)
  const sents = sentences(text)
  const tf = termFreq(text)
  const ranked = scoreSentences(sents, tf)
  const terms = keyTerms(text)

  if (!terms.length || ranked.length < 3) {
    return { questions: [], seed, error: 'not_enough_content' }
  }

  const [loPct, hiPct] = DIFFICULTY[config.difficulty] || DIFFICULTY.medium
  const tierStart = Math.floor(terms.length * loPct)
  const tierEnd = Math.max(tierStart + Math.ceil(terms.length * 0.25), Math.floor(terms.length * hiPct))
  const tierTerms = terms.slice(tierStart, tierEnd)

  const poolSize = Math.min(ranked.length, Math.max(config.count * 3, 30))
  let sentPool = ranked.slice(0, poolSize)

  if (Array.isArray(config.topics) && config.topics.length) {
    const { membership } = detectTopics(text)
    const wanted = new Set(config.topics.map(t => t.toLowerCase()))
    const scoped = ranked.filter(s => {
      const t = membership.get(s.text)
      return t && wanted.has(t.toLowerCase())
    })
    if (scoped.length >= 3) {
      sentPool = scoped
      const scopedTf = termFreq(scoped.map(s => s.text).join(' '))
      const scopedTerms = keyTerms(scoped.map(s => s.text).join(' '))
      terms.length = 0
      terms.push(...scopedTerms)
      for (const k of Object.keys(tf)) delete tf[k]
      for (const [k, v] of scopedTf) tf.set(k, v)
    }
  }

  const enabled = Object.entries(config.mix || {}).filter(([, on]) => on).map(([t]) => t)
  if (!enabled.length) return { questions: [], seed, error: 'no_types' }
  const counts = allocateCounts(enabled, config.count)

  const questions = []
  const usedSentences = new Set()
  const usedTerms = new Set()

  function takeCandidate() {
    for (let i = 0; i < sentPool.length; i++) {
      const s = sentPool[i]
      if (usedSentences.has(s.text)) continue
      const term = findTermInSentence(s.text, terms.filter(t => !usedTerms.has(t.term)).concat(tierTerms))
      if (!term) continue
      usedSentences.add(s.text)
      return { ...s, term }
    }
    return null
  }

  const queue = []
  for (const t of enabled) {
    for (let i = 0; i < counts[t]; i++) queue.push(t)
  }
  const typeOrder = shuffleArr(queue, rng)

  for (const type of typeOrder) {
    if (questions.length >= config.count) break
    const cand = takeCandidate()
    if (!cand) break
    const q = buildQuestion(type, cand, terms, tierTerms, rng)
    if (!q) continue
    usedTerms.add(cand.term.term)
    q.meta = { sentence: cand.text, term: cand.term.term }
    questions.push(q)
  }

  let final = questions
  if (config.shuffle) final = shuffleArr(final, rng)

  return {
    questions: final,
    seed,
    error: final.length < config.count ? 'partial' : null
  }
}

function buildQuestion(type, cand, allTerms, tierTerms, rng) {
  const term = cand.term
  switch (type) {
    case 'mcq': {
      const distractors = pickDistractors(term, allTerms.concat(tierTerms.filter(t => !allTerms.includes(t))), rng, 3)
      if (distractors.length < 3) return null
      const options = shuffleArr([term.term, ...distractors], rng)
      return {
        type,
        stem: blankTerm(cand.text, term.term),
        options,
        answerIndex: options.indexOf(term.term)
      }
    }
    case 'tf': {
      const makeFalse = rng() < 0.55
      if (makeFalse) {
        const swapped = swapWithDistractor(cand.text, term, allTerms, rng)
        if (swapped) return { type, statement: swapped, answer: false }
        const tweaked = tweakNumbers(cand.text, rng)
        if (tweaked) return { type, statement: tweaked, answer: false }
      }
      return { type, statement: cand.text, answer: true }
    }
    case 'fib': {
      const distractors = pickDistractors(term, allTerms, rng, 3)
      if (distractors.length < 3) return null
      const choices = shuffleArr([term.term, ...distractors], rng)
      return { type, stem: blankTerm(cand.text, term.term), choices, answerIndex: choices.indexOf(term.term) }
    }
    case 'id': {
      return { type, clue: cand.text.replace(new RegExp(term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '………'), answer: term.term }
    }
    default:
      return null
  }
}

function matchCase(replacement, original) {
  if (original[0] >= 'A' && original[0] <= 'Z') {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}

function swapWithDistractor(sentence, term, allTerms, rng) {
  if (!term.proper && !term.phrase) return null
  const properPool = allTerms.filter(t => t.proper || t.phrase)
  const distractors = pickDistractors(term, properPool.length >= 4 ? properPool : allTerms, rng, 4)
  const usable = distractors.find(d => !sentence.toLowerCase().includes(d))
  if (!usable) return null
  const re = new RegExp(term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (!re.test(sentence)) return null
  const original = sentence.match(re)[0]
  return sentence.replace(re, matchCase(usable, original))
}

function require_hash(str) {
  let h = 5381 >>> 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return h >>> 0
}
