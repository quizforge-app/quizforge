// Pure validation helpers for ai-generated quiz items.
// Dependency-free so vitest can exercise them in node.

export function extractJSONArray(text) {
  if (!text) return null
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

export function clean(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : ''
}

export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// The ai must never produce content touching these phrases
// (document title + every heading line removed at parse time).
// Phrases shorter than 4 chars are ignored to avoid false positives.
export function makeBannedCheckerFromTitles(docName, titles) {
  const banned = [docName || '', ...(titles || [])]
    .map(s => clean(s).toLowerCase())
    .filter(s => s.length >= 4)
  return text => {
    const t = ' ' + String(text).toLowerCase().replace(/\s+/g, ' ') + ' '
    return banned.some(b => t.includes(b))
  }
}

// Junk/"bs" wrong options the model sometimes emits. Rejecting these keeps
// distractors specific and on-topic instead of filler or nonsense.
export const FILLER_RE = /^(none|all) of (the )?above$|^(option|choice)\s*\d+$|^(i ?d ?k|idk|unknown|unsure|n\/?a|none|\?+|lorem ipsum|example|placeholder|test|thing|stuff|something)$/i

// Validate one generated mcq row against its source term.
// Returns normalized { stem, wrong } or null when the item must be rejected.
export function validateGeneratedMcq(row, term) {
  if (!row || typeof row !== 'object') return null
  const stem = clean(row.stem)
  const wrong = Array.isArray(row.wrong) ? row.wrong.map(clean).filter(Boolean) : []
  if (stem.length < 8 || stem.length > 300) return null
  if (wrong.length !== 3) return null
  if (new Set(wrong.map(w => w.toLowerCase())).size !== 3) return null
  const termLower = String(term).toLowerCase()
  for (const w of wrong) {
    if (w.length < 2 || w.length > 120) return null
    if (w.toLowerCase() === termLower) return null
    if (FILLER_RE.test(w)) return null
  }
  if (new RegExp(escapeRegExp(term), 'i').test(stem)) return null
  return { stem, wrong }
}

// Validate one generated identification clue against its source term.
export function validateGeneratedClue(row, term) {
  if (!row || typeof row !== 'object') return null
  const clue = clean(row.clue)
  if (clue.length < 8 || clue.length > 200) return null
  if (new RegExp(escapeRegExp(term), 'i').test(clue)) return null
  return { clue }
}

// Validate one generated short-answer item. The model returns a question and a
// reference answer; both must be sane and the reference must not be empty.
export function validateGeneratedShort(row, term) {
  if (!row || typeof row !== 'object') return null
  const prompt = clean(row.prompt)
  const answer = clean(row.answer)
  if (prompt.length < 6 || prompt.length > 240) return null
  if (answer.length < 1 || answer.length > 160) return null
  if (new RegExp(escapeRegExp(term), 'i').test(prompt)) return null
  return { prompt, answer }
}
