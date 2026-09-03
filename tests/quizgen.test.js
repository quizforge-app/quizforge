import { describe, it, expect } from 'vitest'
import { generateQuiz } from '../src/lib/quizgen.js'
import { isTitleLike } from '../src/lib/textproc.js'
import { buildMcqStem, buildShortPrompt, pickDistractors, termClass, formatOption, buildCooccurrence } from '../src/lib/questionForms.js'

const DOC = [
  'Biology Study Guide',
  'Chapter 3: Photosynthesis',
  '',
  'Photosynthesis converts light energy into chemical energy inside chloroplasts.',
  'Chlorophyll absorbs sunlight most strongly in the blue and red wavelengths.',
  'The Calvin cycle produces glucose using ATP and NADPH generated earlier.',
  'Stomata are tiny pores that regulate gas exchange in plant leaves.',
  'Respiration releases energy from glucose molecules within all living cells.',
  'Mitochondria generate ATP through cellular respiration during the entire day.',
  'KEY TERMS',
  'Enzymes accelerate chemical reactions without being consumed by them at all.'
].join('\n')

const CONFIG = {
  count: 8,
  mix: { mcq: true, tf: true, fib: true, id: true },
  difficulty: 'medium',
  shuffle: false,
  timerSec: 0,
  fresh: true,
  topics: [],
  fixedSeed: 12345
}

function makeDoc() {
  return { id: 'doc-test-1', text: DOC }
}

describe('generateQuiz', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generateQuiz(makeDoc(), { ...CONFIG })
    const b = generateQuiz(makeDoc(), { ...CONFIG })
    expect(a.questions).toEqual(b.questions)
    expect(a.seed).toBe(b.seed)
  })

  it('produces no more than requested count and flags partial honestly', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG })
    expect(gen.questions.length).toBeGreaterThan(0)
    expect(gen.questions.length).toBeLessThanOrEqual(CONFIG.count)
    if (gen.questions.length < CONFIG.count) {
      expect(gen.error).toBe('partial')
    } else {
      expect(gen.error).toBeNull()
    }
  })

  it('never leaks heading lines into any question content', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG })
    const headings = DOC.split(/\n+/).map(l => l.trim()).filter(l => l && isTitleLike(l))
    expect(headings.length).toBeGreaterThan(0)
    for (const q of gen.questions) {
      const surfaces = [q.stem, q.statement, q.clue, ...(q.options || []), ...(q.choices || [])]
        .filter(Boolean)
        .join(' | ')
      for (const h of headings) {
        expect(surfaces.toLowerCase()).not.toContain(h.toLowerCase())
      }
    }
  })

  it('respects enabled question types only', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG, mix: { mcq: true, tf: false, fib: false, id: false } })
    expect(gen.questions.length).toBeGreaterThan(0)
    for (const q of gen.questions) expect(q.type).toBe('mcq')
  })

  it('returns not_enough_content for empty documents', () => {
    const gen = generateQuiz({ id: 'x', text: '' }, CONFIG)
    expect(gen.error).toBe('not_enough_content')
    expect(gen.questions).toHaveLength(0)
  })

  it('mcq answers point at the correct option', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG })
    for (const q of gen.questions.filter(q => q.type === 'mcq')) {
      expect(q.options[q.answerIndex]).toBeTruthy()
      // answer term must not appear in the stem (any style)
      const answer = q.options[q.answerIndex]
      expect(q.stem.toLowerCase()).not.toContain(answer.toLowerCase())
      // stem is either a teacher-style question or a cloze with BLANK
      const isQuestion = q.stem.endsWith('?')
      const isCloze = /\u0000BLANK\u0000/.test(q.stem) || q.stem.includes('Complete the statement')
      expect(isQuestion || isCloze).toBe(true)
      // all options are unique (case-insensitive)
      const lower = q.options.map(o => o.toLowerCase())
      expect(new Set(lower).size).toBe(lower.length)
    }
  })

  it('tf statements carry a boolean answer', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG })
    for (const q of gen.questions.filter(q => q.type === 'tf')) {
      expect(typeof q.answer).toBe('boolean')
      expect(q.statement.split(/\s+/).length).toBeGreaterThan(4)
    }
  })

  it('short answer prompts are not circular', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG, mix: { short: true }, count: 6 })
    for (const q of gen.questions.filter(q => q.type === 'short')) {
      // prompt should not be 'What is "X"?' with answer X — that's circular
      const circularRe = new RegExp(`What is\\s+["\u201c]\\s*${q.answer}\\s*["\u201d]\\?`, 'i')
      expect(circularRe.test(q.prompt)).toBe(false)
      // prompt should contain the answer term (either as blank or in a definition)
      // but NOT as the direct object of "What is"
    }
  })
})

describe('questionForms', () => {
  it('buildMcqStem produces question or cloze', () => {
    const { stem, style } = buildMcqStem(
      'Photosynthesis converts light energy into chemical energy inside chloroplasts.',
      'Photosynthesis'
    )
    expect(style).toMatch(/subject-question|definition|cloze/)
    if (style === 'cloze') {
      expect(stem).toContain('Complete the statement')
      expect(stem).toMatch(/\u0000BLANK\u0000/)
    } else {
      expect(stem.endsWith('?')).toBe(true)
      expect(stem.toLowerCase()).not.toContain('photosynthesis')
    }
  })

  it('buildShortPrompt is not circular', () => {
    const prompt = buildShortPrompt(
      'Mitochondria generate ATP through cellular respiration during the entire day.',
      'Mitochondria'
    )
    const circularRe = /What is\s+["\u201c]Mitochondria["\u201d]\?/i
    expect(circularRe.test(prompt)).toBe(false)
  })

  it('pickDistractors excludes answer and substrings', () => {
    const rng = () => 0.5
    const terms = [
      { term: 'chemical energy', freq: 5 },
      { term: 'chemical', freq: 3 },
      { term: 'light energy', freq: 4 },
      { term: 'ATP', freq: 6 },
      { term: 'chloroplasts', freq: 2 },
      { term: 'glucose', freq: 4 }
    ]
    const distractors = pickDistractors(
      { term: 'chemical energy', proper: false, phrase: false },
      terms, rng, 3
    )
    // answer itself excluded
    expect(distractors).not.toContain('chemical energy')
    // substring "chemical" excluded (contained in "chemical energy")
    expect(distractors).not.toContain('chemical')
    // at least some distractors returned
    expect(distractors.length).toBeGreaterThan(0)
  })

  it('formatOption capitalizes first letter', () => {
    expect(formatOption('atp')).toBe('Atp')
    expect(formatOption('ATP')).toBe('ATP')
    expect(formatOption('light energy.')).toBe('Light energy')
  })

  it('termClass categorizes terms', () => {
    expect(termClass({ term: 'photosynthesis' })).toBe('process')
    expect(termClass({ term: 'ATP synthase' })).toBe('phrase')
    expect(termClass({ term: 'ATP', proper: true })).toBe('proper')
    expect(termClass({ term: 'chloroplasts' })).toBe('plural')
    expect(termClass({ term: 'mitochondria' })).toBe('plain')
  })

  it('buildCooccurrence maps co-occurring terms', () => {
    const sents = ['ATP and NADPH are produced.', 'NADPH reduces carbon compounds.', 'ATP powers cellular work.']
    const terms = [{ term: 'ATP' }, { term: 'NADPH' }]
    const co = buildCooccurrence(sents, terms)
    expect(co.get('ATP').get('NADPH')).toBe(1)
    expect(co.get('NADPH').get('ATP')).toBe(1)
  })
})
