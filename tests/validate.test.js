import { describe, it, expect } from 'vitest'
import {
  extractJSONArray,
  clean,
  escapeRegExp,
  makeBannedCheckerFromTitles,
  validateGeneratedMcq,
  validateGeneratedClue
} from '../src/lib/llm/validate.js'

describe('extractJSONArray', () => {
  it('parses a clean array', () => {
    expect(extractJSONArray('[{"i":0,"text":"hi"}]')).toEqual([{ i: 0, text: 'hi' }])
  })
  it('parses arrays wrapped in code fences', () => {
    expect(extractJSONArray('```json\n[1,2]\n```')).toEqual([1, 2])
  })
  it('parses arrays embedded in chatter', () => {
    expect(extractJSONArray('Here you go:\n[{"a":1}] hope this helps')).toEqual([{ a: 1 }])
  })
  it('returns null for garbage, objects, and broken json', () => {
    expect(extractJSONArray('')).toBeNull()
    expect(extractJSONArray(null)).toBeNull()
    expect(extractJSONArray('{"a":1}')).toBeNull()
    expect(extractJSONArray('[{"a":1]')).toBeNull()
  })
})

describe('clean', () => {
  it('collapses whitespace and trims', () => {
    expect(clean('  hello   world \n\t again ')).toBe('hello world again')
  })
  it('returns non-strings untouched-ish safely', () => {
    expect(clean(42)).toBe('')
    expect(clean(undefined)).toBe('')
  })
})

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('a.b*c(d)[e]f\\g+h$i^j?k|l{m}n')).toBe('a\\.b\\*c\\(d\\)\\[e\\]f\\\\g\\+h\\$i\\^j\\?k\\|l\\{m\\}n')
  })
})

describe('makeBannedCheckerFromTitles', () => {
  const isBanned = makeBannedCheckerFromTitles(
    'Biology Notes',
    ['Chapter 3: Photosynthesis', 'Key Terms']
  )

  it('flags doc title mentions', () => {
    expect(isBanned('according to the biology notes page')).toBe(true)
  })
  it('flags heading mentions with different spacing', () => {
    expect(isBanned('in chapter 3:   photosynthesis we learned')).toBe(true)
  })
  it('ignores short banned phrases to avoid false positives', () => {
    const lenient = makeBannedCheckerFromTitles('', ['A', 'An Overview'])
    expect(lenient('the letter A appears everywhere')).toBe(false)
  })
  it('allows unrelated content', () => {
    expect(isBanned('chlorophyll absorbs light in chloroplasts')).toBe(false)
  })
})

describe('validateGeneratedMcq', () => {
  const good = {
    stem: 'Which organelle produces most of the ATP in a cell?',
    wrong: ['Ribosome', 'Nucleus', 'Golgi apparatus']
  }

  it('accepts a valid item', () => {
    expect(validateGeneratedMcq(good, 'mitochondria')).toEqual(good)
  })
  it('rejects stems containing the answer term', () => {
    expect(validateGeneratedMcq({ ...good, stem: 'Why are mitochondria called powerhouses of the cell?' }, 'mitochondria')).toBeNull()
  })
  it('rejects wrong-option lists that include the term', () => {
    expect(validateGeneratedMcq({ ...good, wrong: ['Mitochondria', 'Nucleus', 'Golgi'] }, 'mitochondria')).toBeNull()
  })
  it('rejects duplicate wrong options case-insensitively', () => {
    expect(validateGeneratedMcq({ ...good, wrong: ['ribosome', 'RIBOSOME', 'nucleus'] }, 'mitochondria')).toBeNull()
  })
  it('rejects wrong count of options', () => {
    expect(validateGeneratedMcq({ ...good, wrong: ['Ribosome', 'Nucleus'] }, 'mitochondria')).toBeNull()
  })
  it('rejects too-short stems and non-object rows', () => {
    expect(validateGeneratedMcq({ ...good, stem: 'short' }, 'mitochondria')).toBeNull()
    expect(validateGeneratedMcq(null, 'mitochondria')).toBeNull()
  })
  it('rejects filler / nonsense distractors (none of the above, option 1, ???)', () => {
    expect(validateGeneratedMcq({ ...good, wrong: ['None of the above', 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
    expect(validateGeneratedMcq({ ...good, wrong: ['Option 2', 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
    expect(validateGeneratedMcq({ ...good, wrong: ['???', 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
    expect(validateGeneratedMcq({ ...good, wrong: ['example', 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
  })
  it('rejects implausibly long or empty distractors', () => {
    expect(validateGeneratedMcq({ ...good, wrong: ['', 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
    expect(validateGeneratedMcq({ ...good, wrong: ['x', 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
    const long = 'a'.repeat(200)
    expect(validateGeneratedMcq({ ...good, wrong: [long, 'Nucleus', 'Golgi apparatus'] }, 'mitochondria')).toBeNull()
  })
  it('cleans whitespace-heavy input', () => {
    const messy = { stem: '  Which organelle   produces most ATP?  ', wrong: [' Ribosome ', 'Nucleus', 'Golgi apparatus '] }
    const out = validateGeneratedMcq(messy, 'mitochondria')
    expect(out.stem).toBe('Which organelle produces most ATP?')
    expect(out.wrong).toEqual(['Ribosome', 'Nucleus', 'Golgi apparatus'])
  })
})

describe('validateGeneratedClue', () => {
  it('accepts a valid clue', () => {
    expect(validateGeneratedClue({ clue: 'The powerhouse organelle that generates cellular energy.' }, 'mitochondria'))
      .toEqual({ clue: 'The powerhouse organelle that generates cellular energy.' })
  })
  it('rejects clues leaking the term', () => {
    expect(validateGeneratedClue({ clue: 'The mitochondria makes energy.' }, 'mitochondria')).toBeNull()
  })
  it('rejects too-short or missing clues', () => {
    expect(validateGeneratedClue({ clue: 'tiny' }, 'atp')).toBeNull()
    expect(validateGeneratedClue({}, 'atp')).toBeNull()
  })
})
