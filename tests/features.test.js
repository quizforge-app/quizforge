import { describe, it, expect } from 'vitest'
import { generateQuiz } from '../src/lib/quizgen.js'
import { checkTyped } from '../src/lib/textproc.js'

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
  'Enzymes accelerate chemical reactions without being consumed by them at all.',
  'To germinate, a seed absorbs water, activates enzymes, and grows a root, then pushes a shoot above the soil.'
].join('\n')

function makeDoc() { return { id: 'doc-test-1', text: DOC } }

describe('new question types', () => {
  it('matching produces pairs with a correct rightOrder permutation', () => {
    const gen = generateQuiz(makeDoc(), {
      count: 6, mix: { matching: true }, difficulty: 'medium', shuffle: false, timerSec: 0, fresh: true, topics: [], fixedSeed: 7
    })
    const m = gen.questions.filter(q => q.type === 'matching')
    expect(m.length).toBeGreaterThan(0)
    for (const q of m) {
      expect(q.pairs.length).toBeGreaterThanOrEqual(3)
      expect(q.rightOrder.length).toBe(q.pairs.length)
      // rightOrder must be a permutation of [0..n-1]
      const sorted = [...q.rightOrder].sort((a, b) => a - b)
      expect(sorted).toEqual(q.pairs.map((_, i) => i))
    }
  })

  it('ordering produces 3-6 steps with a shuffled permutation', () => {
    const gen = generateQuiz(makeDoc(), {
      count: 6, mix: { ordering: true }, difficulty: 'medium', shuffle: false, timerSec: 0, fresh: true, topics: [], fixedSeed: 11
    })
    const o = gen.questions.filter(q => q.type === 'ordering')
    expect(o.length).toBeGreaterThan(0)
    for (const q of o) {
      expect(q.steps.length).toBeGreaterThanOrEqual(3)
      expect(q.steps.length).toBeLessThanOrEqual(6)
      expect(q.shuffled.length).toBe(q.steps.length)
      const sorted = [...q.shuffled].sort((a, b) => a - b)
      expect(sorted).toEqual(q.steps.map((_, i) => i))
      // not already solved
      expect(q.shuffled.every((s, i) => s !== i)).toBe(false)
    }
  })

  it('short answer stores the term as reference answer', () => {
    const gen = generateQuiz(makeDoc(), {
      count: 6, mix: { short: true }, difficulty: 'medium', shuffle: false, timerSec: 0, fresh: true, topics: [], fixedSeed: 3
    })
    const s = gen.questions.filter(q => q.type === 'short')
    expect(s.length).toBeGreaterThan(0)
    for (const q of s) {
      expect(q.answer).toBeTruthy()
      expect(q.type).toBe('short')
    }
  })

  it('weak-focus biases generation toward weak terms', () => {
    const gen = generateQuiz(makeDoc(), {
      count: 5, mix: { mcq: true }, difficulty: 'medium', shuffle: false, timerSec: 0, fresh: true, topics: [], fixedSeed: 1,
      focusWeak: true, weakTerms: [{ term: 'chlorophyll' }]
    })
    expect(gen.questions[0].meta.sentence.toLowerCase()).toContain('chlorophyll')
  })
})

describe('short answer grading helper', () => {
  it('checkTyped accepts synonyms and minor variation', () => {
    expect(checkTyped('  Chlorophyll ', 'chlorophyll')).toBe(true)
    expect(checkTyped('mitochondria', 'chlorophyll')).toBe(false)
  })
})
