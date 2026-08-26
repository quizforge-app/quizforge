import { sentences, keyTerms, words } from './textproc.js'

const MAX_TOPICS = 8
const NOISE_START = /^(page|slide|fig\.?|figure|table|chapter|section|unit|lesson|exercise|note[s]?|copyright|©|www\.|http)/i

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function extractHeadings(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const out = []
  for (const line of lines) {
    const wc = line.split(/\s+/).length
    if (wc < 1 || wc > 8) continue
    if (/[.!?;,]$/.test(line)) continue
    if (!/[A-Za-z]/.test(line)) continue
    if (NOISE_START.test(line)) continue
    const wordsInLine = line.split(/\s+/)
    const letters = line.replace(/[^A-Za-z]/g, '')
    const isAllCaps = letters.length > 2 && letters === letters.toUpperCase()
    const capitalized = wordsInLine.filter(w => /^[A-Z0-9]/.test(w)).length
    const isTitleCase = capitalized / wc >= 0.6
    if (isAllCaps || (isTitleCase && wc <= 7)) {
      if (!out.some(h => h.toLowerCase() === line.toLowerCase())) out.push(line)
    }
  }
  return out.slice(0, MAX_TOPICS)
}

export function detectTopics(text) {
  const sents = sentences(text)
  if (sents.length < 4) return { topics: [], membership: new Map() }

  const headings = extractHeadings(text)
  const terms = keyTerms(text)

  let seeds = []
  if (headings.length >= 2) {
    seeds = headings.map(h => ({
      title: titleCase(h),
      terms: [...new Set(words(h))].filter(w => w.length >= 3)
    }))
  }
  if (seeds.length < 2 && terms.length) {
    const textHead = text.slice(0, 80).toLowerCase()
    const termSeeds = terms
      .filter(t => !(t.phrase && textHead.includes(t.term)))
      .slice(0, MAX_TOPICS)
      .map(t => ({
        title: titleCase(t.term),
        terms: t.term.split(/[\s-]+/).filter(w => w.length >= 3)
      }))
    seeds = seeds.length ? seeds.concat(termSeeds.slice(0, MAX_TOPICS - seeds.length)) : termSeeds
  }
  if (!seeds.length) return { topics: [], membership: new Map() }

  const assign = new Array(sents.length).fill(-1)
  const counts = new Array(seeds.length).fill(0)

  sents.forEach((s, i) => {
    const sw = new Set(words(s))
    let best = -1
    let bestScore = 0
    seeds.forEach((seed, si) => {
      let score = 0
      for (const t of seed.terms) {
        if (sw.has(t)) score += t.includes(' ') || t.includes('-') ? 2 : 1
      }
      if (score > bestScore) {
        bestScore = score
        best = si
      }
    })
    if (best >= 0) {
      assign[i] = best
      counts[best]++
    }
  })

  let kept = seeds.map((seed, i) => ({ ...seed, index: i, count: counts[i] })).filter(s => s.count >= 2)
  if (kept.length < 2) kept = seeds.map((seed, i) => ({ ...seed, index: i, count: counts[i] })).filter(s => s.count >= 1)
  if (!kept.length) return { topics: [], membership: new Map() }

  kept.sort((a, b) => b.count - a.count)
  kept = kept.slice(0, MAX_TOPICS)
  const keptIdx = new Set(kept.map(k => k.index))

  const membership = new Map()
  sents.forEach((s, i) => {
    if (keptIdx.has(assign[i])) membership.set(s, seeds[assign[i]].title)
  })

  const topics = kept
    .map(k => ({ title: k.title, count: k.count }))
    .sort((a, b) => b.count - a.count)

  return { topics, membership }
}
