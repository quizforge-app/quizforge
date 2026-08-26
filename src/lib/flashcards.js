import { sentences, keyTerms } from './textproc.js'
import { detectTopics } from './topics.js'

export function buildDeck(doc, topicFilter = []) {
  const text = doc.text
  const allSentences = sentences(text)
  const terms = keyTerms(text)
  const { membership } = detectTopics(text)

  let scoped = allSentences
  if (topicFilter.length) {
    const wanted = new Set(topicFilter.map(t => t.toLowerCase()))
    scoped = allSentences.filter(s => {
      const t = membership.get(s)
      return t && wanted.has(t.toLowerCase())
    })
  }

  const scopedText = scoped.join(' ')
  const scopedTerms = topicFilter.length && scoped.length ? keyTerms(scopedText) : terms
  const lowerScoped = scoped.map(s => s.toLowerCase())

  const cards = []
  const usedSentences = new Set()

  for (const t of scopedTerms.slice(0, 30)) {
    const termLower = t.term
    const containing = []
    for (let i = 0; i < scoped.length; i++) {
      if (usedSentences.has(scoped[i])) continue
      const re = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (re.test(lowerScoped[i])) {
        containing.push({ text: scoped[i], index: i })
      }
    }
    if (!containing.length) continue

    const best = containing
      .sort((a, b) => a.text.length - b.text.length)
      .slice(0, 2)
    best.forEach(b => usedSentences.add(b.text))

    cards.push({
      front: t.phrase ? titleCase(t.term) : titleCase(t.term),
      back: best.map(b => b.text).join(' '),
      term: t.term
    })
    if (cards.length >= 25) break
  }

  return cards
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
