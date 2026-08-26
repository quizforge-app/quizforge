import { describe, it, expect } from 'vitest'
import {
  isTitleLike,
  stripHeadings,
  extractTitleLines,
  sentences,
  checkTyped,
  keyTerms
} from '../src/lib/textproc.js'

describe('isTitleLike', () => {
  const titles = [
    'Chapter 3: Photosynthesis',
    'Unit 2 Review',
    '1.2 Cell Division',
    '12.4.1 Subsection Name',
    'KEY TERMS',
    'INTRODUCTION AND BACKGROUND',
    'Table of Contents.......... 4',
    'Introduction',
    'Learning Objectives',
    'Appendix A',
    'Part III',
    'Summary'
  ]
  for (const t of titles) {
    it(`detects title: "${t}"`, () => {
      expect(isTitleLike(t)).toBe(true)
    })
  }

  const prose = [
    'Photosynthesis is the process by which plants convert light energy into chemical energy.',
    'The mitochondria produces most of the chemical energy needed to power the cell.',
    'In 1935, Watson and Crick published their findings.',
    'Water boils at one hundred degrees at sea level!',
    'She asked whether the results were reproducible?',
    'The quick brown fox jumps over the lazy dog again and again.'
  ]
  for (const p of prose) {
    it(`keeps prose: "${p.slice(0, 40)}..."`, () => {
      expect(isTitleLike(p)).toBe(false)
    })
  }
})

describe('stripHeadings / extractTitleLines', () => {
  const doc = [
    'Biology Notes',
    'Chapter 3: Photosynthesis',
    '',
    'Photosynthesis is the process by which plants convert light energy into chemical energy.',
    'Chlorophyll absorbs sunlight inside the chloroplasts of plant cells.',
    'KEY TERMS',
    'The Calvin cycle uses stored energy to produce glucose molecules.',
    'Glossary.......... 22'
  ].join('\n')

  it('collects each unique heading once', () => {
    const titles = extractTitleLines(doc)
    expect(titles).toContain('Biology Notes')
    expect(titles).toContain('Chapter 3: Photosynthesis')
    expect(titles).toContain('KEY TERMS')
    expect(titles.filter(t => t === 'KEY TERMS')).toHaveLength(1)
  })

  it('removes headings from text', () => {
    const cleaned = stripHeadings(doc)
    expect(cleaned).not.toMatch(/Chapter|KEY TERMS|Biology Notes|Glossary/)
  })

  it('keeps body sentences intact', () => {
    const cleaned = stripHeadings(doc)
    expect(cleaned).toMatch(/Photosynthesis is the process/)
    expect(cleaned).toMatch(/Calvin cycle/)
  })
})

describe('sentences', () => {
  it('splits into word-filtered sentences and drops heading lines first', () => {
    const doc = [
      'Chapter 1: Cells',
      'A cell is the basic structural unit of all living organisms on earth.',
      'Mitochondria generate ATP through cellular respiration every single day.'
    ].join('\n')
    const sents = sentences(doc)
    expect(sents).toHaveLength(2)
    expect(sents[0]).toMatch(/^A cell is/)
    expect(sents.join(' ')).not.toMatch(/Chapter 1/)
  })

  it('rejects very short fragments', () => {
    expect(sentences('Hi there. This is a perfectly acceptable sentence length here.')).toEqual([
      'This is a perfectly acceptable sentence length here.'
    ])
  })
})

describe('keyTerms', () => {
  it('ranks frequent non-stopword terms and marks capitalized ones proper', () => {
    const text = Array(6).fill('Photosynthesis occurs in chloroplasts and produces glucose for plants.').join(' ')
    const terms = keyTerms(text)
    expect(terms.length).toBeGreaterThan(0)
    const top = terms.map(t => t.term)
    expect(top).toContain('photosynthesis')
    const photosynthesis = terms.find(t => t.term === 'photosynthesis')
    expect(photosynthesis.freq).toBeGreaterThanOrEqual(6)
    expect(photosynthesis.proper).toBe(true)
  })
})

describe('checkTyped', () => {
  it('accepts exact answers ignoring case and punctuation', () => {
    expect(checkTyped('Mitochondria!', 'mitochondria')).toBe(true)
  })
  it('allows small typos within tolerance', () => {
    expect(checkTyped('mitochondriaa', 'mitochondria')).toBe(true)
  })
  it('rejects wrong answers', () => {
    expect(checkTyped('chloroplast', 'mitochondria')).toBe(false)
    expect(checkTyped('', 'mitochondria')).toBe(false)
  })
})
