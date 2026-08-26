const STOPWORDS = new Set(('a,an,the,and,or,but,nor,so,yet,for,of,in,on,at,to,by,with,from,as,is,are,was,were,be,' +
  'been,being,am,do,does,did,doing,have,has,had,having,will,would,shall,should,can,could,may,might,must,' +
  'i,you,he,she,it,we,they,me,him,her,us,them,my,your,his,its,our,their,this,that,these,those,there,here,' +
  'what,which,who,whom,whose,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,not,only,' +
  'own,same,than,too,very,just,also,into,about,after,before,between,during,through,under,above,over,again,' +
  'further,then,once,if,because,while,until,up,down,out,off,every,either,neither,one,two,three,new,use,used,' +
  'using,many,much,may,etc,eg,ie,within,upon,among,across,toward,towards,without,via,per,plus,however,therefore,' +
  'thus,hence,whereas,although,though,whether,either,page,figure,table,chapter,section').split(','))

const ABBREVS = /\b(mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|eg|ie|fig|no|vol|ch|pp|approx|dept|est|min|max|inc|ltd|co)\.\s*$/gi

const HEADING_WORDS = /^(chapter|unit|module|lesson|section|part|appendix|exercise|exercises|review|summary|objectives|overview|introduction|conclusion|references|bibliography|glossary|contents|index)\b/i
const TOC_LINE = /\.{2,}\s*\d+\s*$/
const TERMINAL = /[.!?…]["')\]]?$/

// True when a raw line looks like a heading/title rather than body prose.
// Lines ending in sentence punctuation are never treated as titles.
export function isTitleLike(line) {
  const t = String(line).trim()
  if (!t || t.length > 90) return false
  if (TOC_LINE.test(t)) return true
  if (TERMINAL.test(t)) return false

  const wordCount = t.split(/\s+/).length
  // "Chapter 3: Photosynthesis", "Unit 2 Review", "Appendix A"
  if (HEADING_WORDS.test(t.replace(/^\(?\d+(\.\d+)*[.)]?\s*/, ''))) return true
  // bare numbered heading: "3.2 Cell Division"
  if (/^\(?\d+(\.\d+)*[.)]\s+\S/.test(t)) return true
  // ALL-CAPS line
  const letters = t.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true
  // Title Case short line: most words capitalized
  if (wordCount <= 8) {
    const caps = t.split(/\s+/).filter(w => /^[A-Z0-9]/.test(w)).length
    if (caps >= Math.max(2, wordCount - 1) && /^[A-Z0-9]/.test(t)) return true
    // very short unpunctuated capitalized fragments ("Key Terms")
    if (wordCount <= 4 && /^[A-Z]/.test(t) && !/\d/.test(t)) return true
  }
  return false
}

// Remove heading-like lines from extracted text before any NLP runs.
export function stripHeadings(text) {
  return String(text).split(/\n+/)
    .filter(line => { const l = line.trim(); return !l || !isTitleLike(l) })
    .join('\n')
}

// Collect the heading lines that were removed (used to reject AI output
// that still references them).
export function extractTitleLines(text) {
  const out = []
  const seen = new Set()
  for (const raw of String(text).split(/\n+/)) {
    const l = raw.trim().replace(/\s+/g, ' ')
    if (l && isTitleLike(l) && !seen.has(l.toLowerCase())) {
      seen.add(l.toLowerCase())
      out.push(l)
    }
  }
  return out
}

export function sentences(text) {
  const cleaned = stripHeadings(text)
  const protectedText = cleaned.replace(ABBREVS, m => m.replace(/\./g, '\u0001'))
  const flat = protectedText.replace(/\s*\n\s*/g, ' ')
  const raw = flat.match(/[^.!?…]+[.!?…]*/g) || []
  return raw
    .map(s => s.replace(/\u0001/g, '.').replace(/\s+/g, ' ').trim())
    .filter(s => {
      const words = s.split(/\s+/).length
      return words >= 6 && words <= 45 && /[a-z]/i.test(s)
    })
}

export function words(s) {
  return (s.toLowerCase().match(/[a-z][a-z'’-]{1,}/g) || []).filter(w => !STOPWORDS.has(w))
}

export function allTokens(text) {
  return text.toLowerCase().match(/[a-z][a-z'’-]+/g) || []
}

export function termFreq(text) {
  const freq = new Map()
  for (const w of words(text)) freq.set(w, (freq.get(w) || 0) + 1)
  return freq
}

export function keyTerms(text) {
  const freq = termFreq(text)
  let ranked = [...freq.entries()]
    .filter(([w, f]) => f >= 2 && w.length >= 4)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([term, f]) => ({ term, freq: f }))

  if (ranked.length < 12) {
    ranked = [...freq.entries()]
      .filter(([w]) => w.length >= 5)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([term, f]) => ({ term, freq: f }))
  }

  const BLOCK_START = new Set(('the,a,an,this,that,these,those,his,her,its,their,in,on,at,during,after,before,' +
    'when,while,if,but,and,or,with,from,by,as,to,of,for,about,into,over,under,after,some,many,most,both,each').split(','))
  const phrases = new Map()
  const re = /\b([A-Z][a-z]{2,}(?:[\s-]+[A-Z][a-z]{2,})+)\b/g
  let m
  while ((m = re.exec(text)) !== null) {
    let p = m[1].split(/\s+/)
    while (p.length > 1 && BLOCK_START.has(p[0].toLowerCase())) p = p.slice(1)
    p = p.join(' ')
    if (p.split(/[\s-]+/).length >= 2 && !BLOCK_START.has(p.split(/\s+/)[0].toLowerCase())) {
      phrases.set(p, (phrases.get(p) || 0) + 1)
    }
  }
  for (const [p, f] of phrases) {
    if (f >= 1 && p.length <= 40 && !ranked.some(r => r.term === p.toLowerCase())) {
      ranked.unshift({ term: p.toLowerCase(), phrase: true, freq: f + 2 })
    }
  }

  const seen = new Set()
  ranked = ranked.filter(r => {
    if (seen.has(r.term)) return false
    seen.add(r.term)
    return true
  })

  const capRe = new Map()
  for (const r of ranked) {
    const cap = r.term.charAt(0).toUpperCase() + r.term.slice(1)
    try {
      capRe.set(r.term, new RegExp('\\b' + cap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text))
    } catch {
      capRe.set(r.term, false)
    }
  }
  for (const r of ranked) {
    if (r.phrase || capRe.get(r.term)) r.proper = true
  }

  return ranked.slice(0, 120)
}

export function scoreSentences(sents, tfMap) {
  return sents.map(s => {
    const w = s.split(/\s+/)
    const len = w.length
    let score = 0
    if (len >= 9 && len <= 28) score += 3
    else if (len >= 7 && len <= 34) score += 1.5
    else score -= 1
    for (const word of words(s)) score += Math.min(tfMap.get(word) || 0, 8) * 0.35
    if (/\d/.test(s)) score += 1.2
    if (/^[A-Z]/.test(s)) score += 0.5
    if (s.length > 220) score -= 2
    return { text: s, score }
  }).sort((a, b) => b.score - a.score)
}

export function hashString(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleArr(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  const m = a.length, n = b.length
  const prev = new Array(n + 1).fill(0).map((_, i) => i)
  const curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

export function normalizeText(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function checkTyped(input, answer) {
  const a = normalizeText(input)
  const b = normalizeText(answer)
  if (!a) return false
  if (a === b) return true
  const tol = b.length > 8 ? 2 : b.length > 4 ? 1 : 0
  return levenshtein(a, b) <= tol
}
