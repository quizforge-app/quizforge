import { chatJSON } from './gemini.js'
import { explainPrompt } from './prompts.js'
import { clean } from './validate.js'

function extractExplanation(raw) {
  if (!raw) return ''
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj.explanation === 'string') return clean(obj.explanation)
  } catch {
    /* not strict json — fall back to raw text */
  }
  return clean(raw)
}

// Build the question payload the tutor prompt expects from a quiz question object.
export function explainPayload(q, userAnswerText) {
  const stem = q.statement || q.stem || q.clue || ''
  let options = null
  if (q.type === 'mcq' || q.type === 'fib') options = q.options || q.choices || null
  else if (q.type === 'tf') options = ['True', 'False']
  const correctAnswer = q.type === 'tf'
    ? String(q.answer)
    : (q.options ?? q.choices)?.[q.answerIndex] ?? q.answer
  return { stem, options, correctAnswer, userAnswer: userAnswerText == null ? null : userAnswerText }
}

// Ask Gemini to explain a question's answer. Returns a short plain-text string.
export async function explainAnswer(q, userAnswerText, { maxOutputTokens = 512 } = {}) {
  const raw = await chatJSON(explainPrompt(explainPayload(q, userAnswerText)), { maxOutputTokens, temperature: 0.3 })
  return extractExplanation(raw)
}
