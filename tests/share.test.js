import { describe, it, expect } from 'vitest'
import { encodeShare, decodeShare, buildQuizPayload, buildChallengePayload, linkFromEncoded } from '../src/lib/share.js'

const sample = {
  v: 1,
  t: 'Test Quiz',
  ts: 0,
  q: [{ type: 'mcq', stem: 'What is 2 + 2?', options: ['3', '4'], answerIndex: 1, meta: {} }]
}

describe('share encode/decode', () => {
  it('roundtrips a quiz payload (gzip or fallback)', async () => {
    const enc = await encodeShare(sample)
    expect(typeof enc).toBe('string')
    expect(enc.startsWith('qf1:') || enc.startsWith('qf0:')).toBe(true)
    const dec = await decodeShare(enc)
    expect(dec).toEqual(sample)
  })

  it('linkFromEncoded embeds the payload after #quiz=', async () => {
    const enc = await encodeShare(sample)
    const url = linkFromEncoded(enc)
    expect(url).toContain('#quiz=')
    const parsed = await decodeShare(url.split('quiz=')[1])
    expect(parsed.t).toBe('Test Quiz')
  })

  it('throws on a non-quiz string', async () => {
    await expect(decodeShare('hello world')).rejects.toThrow()
  })
})

describe('payload builders', () => {
  it('drops image-backed questions from a share', () => {
    const p = buildQuizPayload('Q', [
      { type: 'mcq', options: ['a'], answerIndex: 0 },
      { type: 'mcq', options: ['b'], answerIndex: 0, imageId: 'x' }
    ])
    expect(p.q.length).toBe(1)
  })

  it('builds a challenge payload carrying the challenger score', () => {
    const p = buildChallengePayload('Q', [{ type: 'mcq', options: ['a'], answerIndex: 0 }], {
      name: 'Sam', percent: 80, correct: 8, total: 10
    })
    expect(p.c).toEqual({ n: 'Sam', p: 80, c: 8, t: 10 })
  })
})
