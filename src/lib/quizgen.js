/**
 * @typedef {Object} DocMeta - Document metadata (from storage)
 * @property {string} id
 * @property {string} name
 * @property {string} text
 * @property {string} [folder]
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} QuizConfig
 * @property {number} count - Number of questions to generate
 * @property {{ mcq?: boolean, tf?: boolean, fib?: boolean, id?: boolean, matching?: boolean, ordering?: boolean, short?: boolean }} mix - Enabled question types
 * @property {'easy' | 'medium' | 'hard'} difficulty
 * @property {boolean} shuffle - Whether to shuffle final questions
 * @property {number} [timerSec] - Timer in seconds (0 = off)
 * @property {boolean} [fresh] - Prefer unused sentences
 * @property {string[]} [topics] - Topic filter
 * @property {number} [fixedSeed] - Deterministic seed
 * @property {boolean} [focusWeak] - Bias toward weak terms
 * @property {Array<{term: string}>} [weakTerms] - Weak terms for biasing
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {'mcq' | 'tf' | 'fib' | 'id' | 'matching' | 'ordering' | 'short'} type
 * @property {string} [stem] - Question stem (mcq, fib)
 * @property {string} [statement] - Statement for TF questions
 * @property {string} [clue] - Clue for ID questions
 * @property {string} [prompt] - Prompt for short/matching/ordering
 * @property {string[]} [options] - MCQ options
 * @property {string[]} [choices] - FIB choices
 * @property {number} [answerIndex] - Correct option index (mcq, fib)
 * @property {boolean} [answer] - TF answer
 * @property {string} [answer] - ID/short answer
 * @property {{ sentence: string, term: string, docId?: string }} [meta]
 */

/**
 * @typedef {Object} QuizResult
 * @property {QuizQuestion[]} questions
 * @property {number} seed
 * @property {'partial' | 'not_enough_content' | 'no_types' | null} error
 */

import { sentences, termFreq, keyTerms, scoreSentences, stripHeadings, mulberry32, shuffleArr } from './textproc.js'
import { detectTopics } from './topics.js'
import { pickDistractors as pickImprovedDistractors, buildCooccurrence, buildMcqStem, buildShortPrompt, formatOption } from './questionForms.js'

/**
 * Build MCQ/ID questions from previously banked mistakes.
 * @param {Array<{docId: string, sentence: string, term: string, type: string}>} mistakes
 * @param {Map<string, Array<{term: string, freq: number}>>} docTerms - Per-doc term map
 * @returns {QuizQuestion[]}
 */
export function buildMistakeQuestions(mistakes, docTerms) {
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0)
  return mistakes.map(m => {
    const pool = (docTerms.get(m.docId) || []).filter(t => t.term !== m.term.toLowerCase())
    if (pool.length >= 3) {
      const distractors = pickImprovedDistractors({ term: m.term, proper: false, phrase: false }, pool, rng, 3)
      if (distractors.length === 3) {
        const options = shuffleArr([m.term, ...distractors], rng).map(formatOption)
        return {
          type: 'mcq',
          stem: blankTerm(m.sentence, m.term),
          options,
          answerIndex: options.findIndex(o => o.toLowerCase() === m.term.toLowerCase()),
          meta: { sentence: m.sentence, term: m.term, docId: m.docId }
        }
      }
    }
    const re = new RegExp(m.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    return {
      type: 'id',
      clue: m.sentence.replace(re, '\u2026\u2026\u2026'),
      answer: m.term,
      meta: { sentence: m.sentence, term: m.term, docId: m.docId }
    }
  }).filter(Boolean)
}

export const TYPE_META = {
  mcq: { name: 'Multiple Choice', short: 'MCQ' },
  tf: { name: 'True or False', short: 'T/F' },
  fib: { name: 'Fill the Blank', short: 'Blank' },
  id: { name: 'Identification', short: 'Identify' },
  matching: { name: 'Matching', short: 'Match' },
  ordering: { name: 'Ordering', short: 'Order' },
  short: { name: 'Short Answer', short: 'Short' }
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
      const re = new RegExp(t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (re.test(sentence)) return t
    }
  }
  return null
}

function blankTerm(sentence, term) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return sentence.replace(re, '\u0000BLANK\u0000')
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

/**
 * Estimate how many questions can be generated from a document.
 * @param {DocMeta} doc
 * @param {QuizConfig} config
 * @returns {number}
 */
export function estimateAvailable(doc, config) {
  const probe = { ...config, count: 999 }
  const gen = generateQuiz(doc, probe)
  return gen.questions.length
}

/**
 * Generate a quiz from a document's text.
 * @param {DocMeta} doc
 * @param {QuizConfig} config
 * @returns {QuizResult}
 */
export function generateQuiz(doc, config) {
  const seed = config.fixedSeed != null ? config.fixedSeed : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  const rng = mulberry32(seed ^ require_hash(doc.id))

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

  if (config.focusWeak && Array.isArray(config.weakTerms) && config.weakTerms.length) {
    const weakSet = new Set(config.weakTerms.map(w => String(w.term || w).toLowerCase()))
    sentPool = sentPool.slice().sort((a, b) => {
      const aw = weakSet.has(termIn(weakSet, a.text)) ? 0 : 1
      const bw = weakSet.has(termIn(weakSet, b.text)) ? 0 : 1
      return aw - bw
    })
  }

  const cooccur = buildCooccurrence(ranked.map(s => s.text), terms)

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
      tf.clear()
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
    if (type === 'matching') {
      const q = buildMatchingSet(rng, terms, tierTerms, sentPool, usedSentences, usedTerms, config)
      if (q) questions.push(q)
      continue
    }
    if (type === 'ordering') {
      const q = buildOrderingSet(rng, sentPool, usedSentences, terms)
      if (q) questions.push(q)
      continue
    }
    const cand = takeCandidate()
    if (!cand) break
    const q = buildQuestion(type, cand, terms, tierTerms, rng, { cooccur })
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

function buildQuestion(type, cand, allTerms, tierTerms, rng, opts = {}) {
  const term = cand.term
  const cooccur = opts.cooccur
  const combinedTerms = allTerms.concat(tierTerms.filter(t => !allTerms.includes(t)))

  switch (type) {
    case 'mcq': {
      const distractors = pickImprovedDistractors(term, combinedTerms, rng, 3, {
        avoidSentence: cand.text,
        cooccur
      })
      if (distractors.length < 3) return null
      const options = shuffleArr([term.term, ...distractors], rng).map(formatOption)
      const answerIdx = options.findIndex(o => o.toLowerCase() === term.term.toLowerCase())
      if (answerIdx === -1) return null
      const { stem } = buildMcqStem(cand.text, term.term)
      return { type, stem, options, answerIndex: answerIdx }
    }
    case 'tf': {
      const makeFalse = rng() < 0.55
      if (makeFalse) {
        const swapped = swapWithDistractor(cand.text, term, combinedTerms, rng)
        if (swapped) return { type, statement: swapped, answer: false }
        const tweaked = tweakNumbers(cand.text, rng)
        if (tweaked) return { type, statement: tweaked, answer: false }
      }
      return { type, statement: cand.text, answer: true }
    }
    case 'fib': {
      const distractors = pickImprovedDistractors(term, combinedTerms, rng, 3, {
        avoidSentence: cand.text,
        cooccur
      })
      if (distractors.length < 3) return null
      const choices = shuffleArr([term.term, ...distractors], rng).map(formatOption)
      const answerIdx = choices.findIndex(c => c.toLowerCase() === term.term.toLowerCase())
      if (answerIdx === -1) return null
      return { type, stem: blankTerm(cand.text, term.term), choices, answerIndex: answerIdx }
    }
    case 'id': {
      const re = new RegExp(term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      return { type, clue: cand.text.replace(re, '\u2026\u2026\u2026'), answer: term.term }
    }
    case 'short': {
      const prompt = buildShortPrompt(cand.text, term.term)
      return {
        type,
        prompt,
        answer: term.term,
        meta: { sentence: cand.text, term: term.term }
      }
    }
    default:
      return null
  }
}

function termIn(weakSet, text) {
  const lower = ' ' + text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ') + ' '
  for (const w of weakSet) {
    if (lower.includes(w.length > 2 && !/\s/.test(w) ? ` ${w} ` : w)) return w
  }
  return ''
}

function buildMatchingSet(rng, allTerms, tierTerms, sentPool, usedSentences, usedTerms, config) {
  const pairCount = Math.max(3, Math.min(6, Math.round(config.count / 2)))
  const pairs = []
  for (const s of sentPool) {
    if (pairs.length >= pairCount) break
    if (usedSentences.has(s.text)) continue
    const term = findTermInSentence(s.text, allTerms.filter(t => !usedTerms.has(t.term)).concat(tierTerms))
    if (!term) continue
    usedSentences.add(s.text)
    usedTerms.add(term.term)
    pairs.push({ left: titleCase(term.term), right: s.text })
  }
  if (pairs.length < 3) return null
  const rightOrder = shuffleArr(pairs.map((_, i) => i), rng)
  return { type: 'matching', prompt: 'Match each term to the sentence that defines it', pairs, rightOrder }
}

function splitOrderedParts(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  let raw = cleaned.split(/;\s*/)
  if (raw.length < 3) raw = cleaned.split(/,\s*/)
  if (raw.length < 3) raw = cleaned.split(/\s+and\s+/i)
  const parts = raw.map(p => p.trim()).filter(p => p.split(/\s+/).length >= 2)
  if (parts.length < 3 || parts.length > 6) return null
  return parts
}

function buildOrderingSet(rng, sentPool, usedSentences, terms) {
  for (const s of sentPool) {
    if (usedSentences.has(s.text)) continue
    const parts = splitOrderedParts(s.text)
    if (!parts) continue
    usedSentences.add(s.text)
    const shuffled = shuffleArr(parts.map((_, i) => i), rng)
    return { type: 'ordering', prompt: 'Put the steps in the correct order', steps: parts, shuffled }
  }
  return null
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
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
  const pool = properPool.length >= 4 ? properPool : allTerms
  const distractors = pickImprovedDistractors(term, pool, rng, 4)
  const usable = distractors.find(d => !sentence.toLowerCase().includes(d.toLowerCase()))
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
