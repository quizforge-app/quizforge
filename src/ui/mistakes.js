import { listMistakes, getDoc, listDueCards, getWeakTerms } from '../lib/storage.js'
import { keyTerms } from '../lib/textproc.js'
import { buildMistakeQuestions } from '../lib/quizgen.js'

export async function startMistakeReview(ctx, docId = null) {
  const mistakes = await listMistakes(docId)
  if (!mistakes.length) {
    ctx.toast('No mistakes to review — great job! 🎉')
    return
  }
  const docIds = [...new Set(mistakes.map(m => m.docId))]
  const docTerms = new Map()
  for (const id of docIds) {
    const doc = await getDoc(id)
    docTerms.set(id, doc ? keyTerms(doc.text) : [])
  }
  const questions = buildMistakeQuestions(mistakes, docTerms)
  if (!questions.length) {
    ctx.toast('Could not build review questions')
    return
  }
  ctx.state.mistakeReview = {
    questions,
    docName: docId ? null : `All documents (${docIds.length})`
  }
  ctx.go('quiz')
}

// Review only the cards whose srs schedule says they are due now.
export async function startDueReview(ctx) {
  const due = await listDueCards(30)
  if (!due.length) {
    ctx.toast('Nothing due — come back later!')
    return
  }
  const docIds = [...new Set(due.map(m => m.docId))]
  const docTerms = new Map()
  for (const id of docIds) {
    const doc = await getDoc(id)
    docTerms.set(id, doc ? keyTerms(doc.text) : [])
  }
  const questions = buildMistakeQuestions(due, docTerms)
  if (!questions.length) {
    ctx.toast('Could not build review questions')
    return
  }
  ctx.state.mistakeReview = {
    questions,
    docName: `Spaced review (${due.length} due)`
  }
  ctx.go('quiz')
}

// Review the learner's weakest terms first: rank every banked mistake and due
// card by how often its term has been missed, then build a review session that
// leads with the highest-frequency problem terms.
export async function startWeakReview(ctx) {
  const weak = await getWeakTerms(null)
  if (!weak.length) {
    ctx.toast('No weak spots yet — take a few quizzes first')
    return
  }
  const rank = new Map(weak.map(w => [String(w.term).toLowerCase(), w.count || 1]))
  const [mistakes, due] = await Promise.all([listMistakes(null), listDueCards(60)])
  const items = [...mistakes, ...due]
  if (!items.length) {
    ctx.toast('No weak-spot questions to review yet')
    return
  }
  items.sort((a, b) =>
    (rank.get(String(a.term).toLowerCase()) || 0) - (rank.get(String(b.term).toLowerCase()) || 0))
  const seen = new Set()
  const chosen = []
  for (const it of items) {
    const k = String(it.term).toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    chosen.push(it)
    if (chosen.length >= 30) break
  }
  const docIds = [...new Set(chosen.map(m => m.docId))]
  const docTerms = new Map()
  for (const id of docIds) {
    const doc = await getDoc(id)
    docTerms.set(id, doc ? keyTerms(doc.text) : [])
  }
  const questions = buildMistakeQuestions(chosen, docTerms)
  if (!questions.length) {
    ctx.toast('Could not build review questions')
    return
  }
  ctx.state.mistakeReview = {
    questions,
    docName: `Weak spots (${chosen.length} terms)`
  }
  ctx.go('quiz')
}
