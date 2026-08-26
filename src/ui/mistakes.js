import { listMistakes, getDoc, listDueCards } from '../lib/storage.js'
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
