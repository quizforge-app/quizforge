import { sentences, words, termFreq, keyTerms } from './textproc.js'
import { detectTopics } from './topics.js'

function scoreSentence(sentence, tf, index, total) {
  const w = words(sentence)
  if (!w.length) return 0
  let tfSum = 0
  for (const word of w) tfSum += Math.min(tf.get(word) || 0, 10)
  const density = tfSum / w.length
  const posBonus = 1 + (1 - index / total) * 0.15
  const len = w.length
  const lenFactor = len < 6 ? 0.5 : len > 32 ? 0.75 : 1
  return density * posBonus * lenFactor
}

function tooSimilar(a, b) {
  const wa = new Set(words(a))
  const wb = new Set(words(b))
  if (!wa.size || !wb.size) return false
  let overlap = 0
  for (const w of wa) if (wb.has(w)) overlap++
  return overlap / Math.min(wa.size, wb.size) > 0.6
}

function dedupe(list) {
  const seen = new Set()
  const out = []
  for (const s of list) {
    const k = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
    if (k && !seen.has(k)) {
      seen.add(k)
      out.push(s)
    }
  }
  return out
}

function pickDiverse(ranked, limit) {
  const picked = []
  for (const cand of ranked) {
    if (picked.length >= limit) break
    if (picked.some(p => tooSimilar(p, cand))) continue
    picked.push(cand)
  }
  return picked
}

export function summarizeDoc(text, opts = {}) {
  const perSection = opts.pointsPerSection || 3
  const raw = sentences(text)
  const unique = dedupe(raw)

  if (!unique.length) {
    return { tldr: [], sections: [], sentenceCount: 0 }
  }

  const tf = termFreq(text)
  const { topics, membership } = detectTopics(text)
  const positionOf = new Map(unique.map((s, i) => [s, i]))

  const scored = unique.map((s, i) => ({ text: s, score: scoreSentence(s, tf, i, unique.length), index: i }))
  const byScore = [...scored].sort((a, b) => b.score - a.score)

  let tldr = []
  let sections = []

  if (topics.length >= 2) {
    const buckets = new Map(topics.map(t => [t.title, []]))
    for (const s of unique) {
      const t = membership.get(s)
      if (t && buckets.has(t)) buckets.get(t).push(s)
    }

    for (const t of topics) {
      const ss = buckets.get(t.title) || []
      if (!ss.length) continue
      const secTf = termFreq(ss.join(' '))
      const ranked = ss
        .map((s, i) => ({ text: s, score: scoreSentence(s, secTf, i, ss.length) }))
        .sort((a, b) => b.score - a.score)
        .map(r => r.text)
      const points = pickDiverse(ranked, Math.min(perSection, ss.length))
        .slice()
        .sort((a, b) => positionOf.get(a) - positionOf.get(b))
      const secTerms = keyTerms(ss.join(' ')).slice(0, 4).map(k => k.term)
      sections.push({ title: t.title, sentenceCount: ss.length, points, terms: secTerms })
    }

    const chosen = []
    const usedTopics = new Set()
    for (const cand of byScore) {
      if (chosen.length >= 3) break
      if (chosen.some(p => tooSimilar(p.text, cand.text))) continue
      const t = membership.get(cand.text)
      if (t && usedTopics.has(t) && chosen.length < 2) continue
      chosen.push(cand)
      if (t) usedTopics.add(t)
    }
    tldr = chosen.sort((a, b) => a.index - b.index).map(c => c.text)
  } else {
    const picked = pickDiverse(byScore.map(c => c.text), 3)
      .slice()
      .sort((a, b) => positionOf.get(a) - positionOf.get(b))
    tldr = picked
    sections.push({
      title: 'Key points',
      sentenceCount: unique.length,
      points: picked,
      terms: keyTerms(text).slice(0, 4).map(k => k.term)
    })
  }

  return { tldr, sections, sentenceCount: unique.length }
}

export function oneLineSummary(text, maxChars = 180) {
  const { tldr } = summarizeDoc(text)
  if (!tldr.length) return ''
  let line = tldr[0]
  if (line.length > maxChars) line = line.slice(0, maxChars - 1).trim() + '…'
  return line
}
