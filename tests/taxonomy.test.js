import { describe, it, expect } from 'vitest'
import { deriveFolders, deriveTags } from '../src/lib/taxonomy.js'

const docs = [
  { folder: 'A', tags: ['x', 'y'] },
  { folder: 'A', tags: ['y', 'z'] },
  { folder: null, tags: [] },
  { folder: 'B', tags: ['x'] }
]

describe('taxonomy', () => {
  it('derives sorted unique folders, ignoring nulls', () => {
    expect(deriveFolders(docs)).toEqual(['A', 'B'])
  })

  it('derives sorted unique tags', () => {
    expect(deriveTags(docs)).toEqual(['x', 'y', 'z'])
  })

  it('handles empty input', () => {
    expect(deriveFolders([])).toEqual([])
    expect(deriveTags(null)).toEqual([])
  })
})
