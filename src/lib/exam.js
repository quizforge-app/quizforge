// Exam-prep quiz builder: one practice quiz mixing questions from ALL the
// documents matched to an exam. Questions are generated per document (so each
// carries meta.docId for cross-doc mistake banking), then merged with a
// deterministic shuffle seeded from the exam id.

import { generateQuiz } from './quizgen.js'
import { detectTopics } from './topics.js'

const EXAM_MIX = { mcq: true, tf: true, fib: true, id: true, matching: true, ordering: true }

/**
 * @param {import('./db-types.js').Exam} exam
 * @param {Array<{id: string, name: string, text: string, type?: string}>} docs - full docs (getDoc)
 * @param {Array<{term: string, docId?: string}>} weakTerms - user's weak terms (optional)
 * @param {{count?: number}} opts
 * @returns {{ questions: Array<object>, error: string | null }}
 */
export function buildExamQuiz(exam, docs, weakTerms = [], opts = {}) {
  if (!docs.length) return { questions: [], error: 'no_docs' }
  const total = opts.count || 15
  const per = Math.max(2, Math.ceil(total / docs.length))

  // weak terms scoped per doc bias that doc's sentence pool toward misses
  const weakFor = docId => weakTerms.filter(w => !w.docId || w.docId === docId).map(w => w.term)

  // topics the exam flagged for each doc steer the sentence pool
  const topicsFor = docId => (exam.topics || []).filter(t => t.docId === docId).map(t => t.title)

  const all = []
  let shortfall = 0
  for (const doc of docs) {
    const cfg = {
      count: per,
      mix: EXAM_MIX,
      difficulty: 'medium',
      shuffle: false,
      timerSec: 0,
      topics: topicsFor(doc.id),
      weakTerms: weakFor(doc.id),
      fixedSeed: hashSeed(exam.id + doc.id)
    }
    const res = generateQuiz({ id: doc.id, text: doc.text }, cfg)
    if (res.error) shortfall++
    for (const q of res.questions) {
      all.push({ ...q, meta: { ...(q.meta || {}), docId: doc.id, docName: doc.name } })
    }
  }
  if (!all.length) return { questions: [], error: 'not_enough_content' }

  // deterministic shuffle seeded from the exam
  const rng = mulberry(hashSeed(exam.id))
  const questions = shuffle(all, rng).slice(0, Math.max(total, all.length - shortfall * per))
  return { questions, error: null }
}

function hashSeed(str) {
  let h = 1779033703
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rng) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Days until the exam (0 = today, negative = past). Compares calendar days. */
export function daysUntil(examDate) {
  if (!examDate) return null
  const day = 86400000
  const startOf = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }
  return Math.round((startOf(examDate) - startOf(Date.now())) / day)
}

/** Human countdown label: "in 5 days", "tomorrow", "today", "past". */
export function countdownLabel(examDate) {
  const d = daysUntil(examDate)
  if (d == null) return ''
  if (d < 0) return 'past'
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  return `in ${d} days`
}

/** Offline topic ranking across the exam's docs — used as the fallback plan
 *  when the AI chat couldn't run, and to enrich the review list. */
export function rankExamTopics(exam, docs) {
  const ranked = []
  for (const doc of docs) {
    const { topics } = detectTopics(doc.text || '')
    for (const t of topics) {
      ranked.push({ title: t.title, docId: doc.id, docName: doc.name, count: t.count })
    }
  }
  // boost topics whose titles appear in the teacher announcement
  const ann = (exam.announcement || '').toLowerCase()
  for (const r of ranked) {
    if (ann && r.title.toLowerCase().split(/\s+/).some(w => w.length >= 4 && ann.includes(w))) {
      r.count += 5
      r.reason = 'Mentioned in your announcement'
    }
  }
  return ranked.sort((a, b) => b.count - a.count)
}
