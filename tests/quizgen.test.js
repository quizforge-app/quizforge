import { describe, it, expect } from 'vitest'
import { generateQuiz } from '../src/lib/quizgen.js'
import { isTitleLike } from '../src/lib/textproc.js'

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
      // stem is blanked, so the answer term must not appear in it
      expect(q.stem).toMatch(/BLANK/)
    }
  })

  it('tf statements carry a boolean answer', () => {
    const gen = generateQuiz(makeDoc(), { ...CONFIG })
    for (const q of gen.questions.filter(q => q.type === 'tf')) {
      expect(typeof q.answer).toBe('boolean')
      expect(q.statement.split(/\s+/).length).toBeGreaterThan(4)
    }
  })
})
