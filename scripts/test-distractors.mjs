// Standalone test of the AI distractor quality. Not part of vitest — run with:
//   $env:GEMINI_KEY="..."; node scripts/test-distractors.mjs
// It mirrors exactly what quiz-ai.js sends to Gemini, then runs the same
// validator the app uses, so we can eyeball real output before packaging.
import { MCQ_RULES, mcqPrompt } from '../src/lib/llm/prompts.js'
import { validateGeneratedMcq, validateGeneratedClue, extractJSONArray } from '../src/lib/llm/validate.js'

const KEY = process.env.GEMINI_KEY
if (!KEY) { console.error('Set GEMINI_KEY env var'); process.exit(1) }

const MODEL = 'gemini-3.6-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?alt=json`

// Sample study items the way generateQuizAI builds them (mcq + id).
const items = [
  [{ type: 'mcq', meta: { sentence: 'Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.', term: 'ATP' } }, 0],
  [{ type: 'mcq', meta: { sentence: 'Photosynthesis converts carbon dioxide and water into glucose while releasing oxygen, using sunlight captured by chlorophyll.', term: 'glucose' } }, 1],
  [{ type: 'mcq', meta: { sentence: 'The nitrogenous bases of DNA pair specifically: adenine with thymine and cytosine with guanine.', term: 'adenine' } }, 2],
  [{ type: 'id', meta: { sentence: 'The double-helix structure of DNA was proposed by Watson and Crick in 1953.', term: 'Watson and Crick' } }, 3]
]

// Simulated key-term bank from a biology pdf, like keyTerms(doc.text) would return.
const termBank = ['mitochondria', 'chloroplast', 'ribosome', 'nucleus', 'golgi', 'atp', 'glucose',
  'chlorophyll', 'photosynthesis', 'cellular respiration', 'dna', 'rna', 'adenine', 'thymine',
  'cytosine', 'guanine', 'protein', 'enzyme', 'membrane', 'mitosis', 'osmosis', 'diffusion',
  'nucleotide', 'amino acid', 'lipid', 'carbohydrate', 'pyruvate', 'electron transport']
const stTok = s => new Set((String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []))
const relatedFor = q => {
  const st = stTok(q.meta.sentence + ' ' + q.meta.term)
  const term = String(q.meta.term).toLowerCase()
  return termBank.filter(t => t !== term)
    .map(t => [t, [...stTok(t)].filter(w => st.has(w)).length])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10).map(s => s[0])
}

const body = {
  systemInstruction: { parts: [{ text: MCQ_RULES }] },
  contents: [{ role: 'user', parts: [{ text: mcqPrompt(items, relatedFor) }] }],
  generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024 + 256 * items.length, temperature: 0.7 }
}

const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) })
if (!res.ok) { console.error('HTTP', res.status, await res.text()); process.exit(1) }
const json = await res.json()
const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
if (!raw) console.log('RAW (empty):', JSON.stringify(json).slice(0, 600))
const rows = extractJSONArray(raw) || []
if (!rows.length && raw) console.log('RAW (unparsed):', raw.slice(0, 600))

let accepted = 0, rejected = 0
for (const row of rows) {
  const item = items.find(([, i]) => i === row.i)
  const term = item?.[0]?.meta?.term
  let result
  if (row.kind === 'mcq') result = validateGeneratedMcq(row, term)
  else if (row.kind === 'id') result = validateGeneratedClue(row, term)
  const ok = !!result
  ok ? accepted++ : rejected++
  console.log(`\n[#${row.i}] ${row.kind}  -> ${ok ? 'ACCEPT' : 'REJECT'}`)
  console.log('  term :', term)
  if (row.kind === 'mcq') {
    console.log('  stem :', result?.stem || row.stem)
    console.log('  wrong:', (result?.wrong || row.wrong)?.join(' | '))
  } else {
    console.log('  clue :', result?.clue || row.clue)
  }
}
console.log(`\nSummary: ${accepted} accepted, ${rejected} rejected of ${rows.length} rows.`)
