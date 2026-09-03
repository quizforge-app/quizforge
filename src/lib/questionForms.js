/**
 * Teacher-quality question stem and distractor generation.
 * Converts document sentences into proper MCQ questions and picks
 * same-category distractors based on co-occurrence and morphological class.
 */

import { words, mulberry32, shuffleArr } from './textproc.js'

/* ── Morphological categories for distractor grouping ── */

const SUFFIX_CLASSES = [
  { re: /(?:tion|sion|ment|ism|ity|ness|ance|ence|ure|age)$/, cls: 'abstract' },
  { re: /(?:ase|osis|esis|plasty|lysis)$/, cls: 'process' },
  { re: /(?:ology|onomy|ics)$/, cls: 'field' },
  { re: /(?:er|or|ist|ant|ent|ee)$/, cls: 'agent' },
]

const ADJ_SUFFIX = /(?:ic|ical|al|ive|ous|ful|ish|ary|ent|ant|able|ible|ar)$/i

/**
 * Guess a morphological class for a term (used to group plausible distractors).
 * @param {{ term: string, phrase?: boolean, proper?: boolean }} t
 * @returns {string} e.g. 'abstract', 'process', 'proper', 'phrase', 'plural', 'plain'
 */
export function termClass(t) {
  if (t.phrase) return 'phrase'
  if (t.proper) return 'proper'
  const w = t.term
  if (t.phrase || /\s/.test(w)) return 'phrase'
  if (t.proper) return 'proper'
  if (ADJ_SUFFIX.test(w)) return 'adj'
  // Check suffix classes first (processes, enzymes, etc.) before plural
  for (const rule of SUFFIX_CLASSES) {
    if (rule.re.test(w)) return rule.cls
  }
  if (/[^s]s$/.test(w)) return 'plural'
  return 'plain'
}

/* ── Co-occurrence map ── */

/**
 * Build a term→{term→count} co-occurrence map from sentences.
 * Two terms co-occur when they appear in the same sentence.
 */
export function buildCooccurrence(sents, terms) {
  const reMap = terms.map(t => ({
    ...t,
    re: new RegExp('\\b' + t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
  }))
  const co = new Map()
  for (const s of sents) {
    const present = reMap.filter(t => t.re.test(s))
    for (let i = 0; i < present.length; i++) {
      const a = present[i].term
      if (!co.has(a)) co.set(a, new Map())
      const m = co.get(a)
      for (let j = 0; j < present.length; j++) {
        if (i === j) continue
        const b = present[j].term
        m.set(b, (m.get(b) || 0) + 1)
      }
    }
  }
  return co
}

/* ── Option formatting ── */

/**
 * Format an MCQ option consistently (capitalized, trimmed, no trailing punctuation).
 */
export function formatOption(s) {
  let t = s.trim().replace(/[.!?…,;:]+$/, '')
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/* ── Improved distractor selection ── */

/**
 * Pick distractor terms that are topically and morphologically similar to the answer.
 * @param {{ term: string, freq?: number, phrase?: boolean, proper?: boolean }} answer
 * @param {{ term: string, freq: number, phrase?: boolean, proper?: boolean }[]} allTerms
 * @param {() => number} rng
 * @param {number} count
 * @param {{ avoidSentence?: string, cooccur?: Map<string, Map<string, number>> }} [opts]
 * @returns {string[]}
 */
export function pickDistractors(answer, allTerms, rng, count = 3, opts = {}) {
  const target = answer.term
  const avoidSentence = opts.avoidSentence || ''
  const coMap = opts.cooccur?.get(target)

  const targetClass = termClass(answer)
  const targetShape = target.split(/[\s-]+/).length

  const avoidRe = avoidSentence
    ? new RegExp('\\b' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
    : null
  const targetInAvoid = avoidRe && avoidRe.test(avoidSentence)

  // Score each candidate
  const scored = []
  for (const cand of allTerms) {
    if (cand.term === target) continue
    // Skip if candidate term appears in the question sentence
    if (avoidSentence) {
      const cRe = new RegExp('\\b' + cand.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
      if (cRe.test(avoidSentence)) continue
    }
    // Skip substring overlaps (e.g. "chemical" vs "chemical energy")
    const a = target.toLowerCase(), b = cand.term.toLowerCase()
    if (a.includes(b) || b.includes(a)) continue

    let score = 0
    // Co-occurrence bonus: terms that appear in same sentences as answer
    if (coMap) score += (coMap.get(cand.term) || 0) * 4

    // Same morphological class bonus
    if (termClass(cand) === targetClass) score += 2

    // Same word-count shape (strong teacher heuristic)
    const candShape = cand.term.split(/[\s-]+/).length
    if (candShape === targetShape) score += 2
    else if (Math.abs(candShape - targetShape) === 1) score += 1

    // Length proximity bonus
    score -= Math.abs(cand.term.length - target.length) * 0.08

    // Jitter: slight random tiebreaker for variety
    score += rng() * 0.5

    scored.push({ term: cand.term, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(s => s.term)
}

/* ── Sentence pattern detection ── */

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Try to extract a subject-predicate pair from a sentence containing `term`.
 * Returns { verb, predicate, style } where:
 * - style: 'copula' (X is/are Y), 'action' (X does Y), or null (no pattern).
 */
export function splitSubject(sentence, term) {
  const esc = escapeRe(term)
  const core = sentence.trim()

  // Copula: "Term is/are/was/were the predicate."
  let m = core.match(new RegExp('^(?:the\\s+|a\\s+|an\\s+)?' + esc + '\\s+(is|are|was|were)\\s+(.+)$', 'i'))
  if (m) {
    const predicate = m[2].replace(/[.!?…]+$/, '').trim()
    return { verb: m[1], predicate, style: 'copula' }
  }

  // Action verb: "Term VERBS predicate." e.g. "Photosynthesis converts light energy..."
  m = core.match(new RegExp('^(?:the\\s+|a\\s+|an\\s+)?' + esc + '\\s+([a-z]+(?:s|ed|es|ies|s)?|can|will|shall|may|must|should|could|would|does|do)\\s+(.+)$', 'i'))
  if (m) {
    const verb = m[1]
    const predicate = m[2].replace(/[.!?…]+$/, '').trim()
    if (verb && predicate) return { verb, predicate, style: 'action' }
  }

  return null
}

/**
 * Singularize a verb to 3rd-person singular present tense.
 * E.g. "produce" → "produces", "absorb" → "absorbs", "generate" → "generates".
 */
function singularize(verb) {
  const v = verb.toLowerCase()
  if (v === 'are' || v === 'were') return 'is'
  if (v === 'have' || v === 'has') return 'has'
  if (v === 'do' || v === 'does') return 'does'
  if (v === 'can' || v === 'will' || v === 'shall' || v === 'may' || v === 'must' ||
      v === 'should' || v === 'could' || v === 'would') return v
  if (/(?:s|es|ies)$/.test(v) && !/(?:ss|us|is)$/.test(v)) return v // already 3sg
  if (/(?:x|s|z|ch|sh|o)$/.test(v)) return v + 'es'
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'
  return v + 's'
}

/* ── Teacher-style stem builders ── */

/**
 * Build a teacher-style MCQ stem from a candidate sentence+term.
 * Returns { stem, style } where style is 'subject-question', 'definition', or 'cloze'.
 *
 * Subject-question: "Which of the following converts light energy into chemical energy?"
 * Definition: "Which term is described as: 'the process by which...'"?
 * Cloze: "Complete the statement: "________ absorbs sunlight...""
 */
export function buildMcqStem(sentence, term, opts = {}) {
  const split = splitSubject(sentence, term)

  if (split && split.predicate) {
    // Strategy 1 — Subject-question: replace subject with "Which of the following"
    const verb = split.style === 'copula' ? singularize(split.verb) : split.verb
    const predicate = split.predicate.trim()

    if (predicate.split(/\s+/).length >= 3) {
      const stem = `Which of the following ${verb} ${predicate}?`
      // Verify the answer term is NOT in the stem
      const termRe = new RegExp('\\b' + escapeRe(term) + '\\b', 'i')
      if (!termRe.test(stem)) {
        return { stem, style: 'subject-question' }
      }
    }

    // Strategy 2 — Definition: "Which term is described as: 'predicate'?"
    if (split.style === 'copula' && predicate.split(/\s+/).length >= 4) {
      const capPred = predicate.charAt(0).toLowerCase() + predicate.slice(1)
      const stem = `Which term is described as: "${capPred}"?`
      const termRe = new RegExp('\\b' + escapeRe(term) + '\\b', 'i')
      if (!termRe.test(stem)) {
        return { stem, style: 'definition' }
      }
    }
  }

  // Fallback — Cloze with instruction frame
  const blanked = sentence.replace(
    new RegExp(escapeRe(term), 'i'),
    '\u0000BLANK\u0000'
  )
  const stem = `Complete the statement: "${blanked}"`
  return { stem, style: 'cloze' }
}

/**
 * Build a short-answer prompt from a candidate sentence+term.
 * Teacher style: show the definition, ask for the term.
 */
export function buildShortPrompt(sentence, term) {
  const split = splitSubject(sentence, term)

  if (split && split.predicate) {
    // Definition → ask for the term
    const pred = split.predicate.trim()
    if (pred.split(/\s+/).length >= 3) {
      return `Which term is described as: "${pred.charAt(0).toLowerCase() + pred.slice(1)}"?`
    }
  }

  // Fallback: show the sentence with a blank, ask for the term
  const blanked = sentence.replace(
    new RegExp(escapeRe(term), 'i'),
    '________'
  )
  return blanked
}
