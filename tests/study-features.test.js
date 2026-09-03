import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll } from 'vitest'

// Mock localStorage for Node test environment (settings persist through it)
if (typeof globalThis.localStorage === 'undefined') {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) }
  }
}
import {
  saveDoc,
  bankMistake,
  upsertSrsFromMistake,
  listDueCards,
  getWeakTerms,
  ensureDefaultAccount,
  setActiveAccount,
  getActiveAccountId,
  clearAllData,
  loadSettings,
  saveSettings
} from '../src/lib/storage.js'
import { generateQuiz } from '../src/lib/quizgen.js'

const SAMPLE_TEXT = [
  'Biology Study Guide',
  'Chapter 3: Photosynthesis',
  '',
  'Photosynthesis converts light energy into chemical energy inside chloroplasts.',
  'Chlorophyll absorbs sunlight most strongly in the blue and red wavelengths.',
  'The Calvin cycle produces glucose using ATP and NADPH generated earlier.',
  'Stomata are tiny pores that regulate gas exchange in plant leaves.',
  'Respiration releases energy from glucose molecules within all living cells.'
].join('\n')

// Mirrors the reviewer's long-press save: bank a sentence into the SRS deck
// with type 'note', derive the term the way firstKeyPhrase() would, then
// confirm it resurfaces as a due review card.
describe('reviewer: long-press note save', () => {
  beforeAll(async () => {
    await ensureDefaultAccount()
    await saveDoc({ id: 'doc-note-1', name: 'photosynthesis.pdf', type: 'pdf', text: SAMPLE_TEXT, wordCount: 80 })
  })

  it('saves a paragraph as a note card that shows up due', async () => {
    const sentence = 'Chlorophyll absorbs sunlight most strongly in the blue and red wavelengths.'
    const rec = await upsertSrsFromMistake({ docId: 'doc-note-1', sentence, term: 'Chlorophyll', type: 'note' })
    expect(rec).toBeTruthy()
    expect(rec.type).toBe('note')
    expect(rec.term).toBe('Chlorophyll')

    const due = await listDueCards(99)
    const note = due.find(d => d.id === rec.id)
    expect(note).toBeTruthy()
    expect(note.sentence).toContain('Chlorophyll')
  })

  it('does not duplicate the same note when pressed twice', async () => {
    const sentence = 'Stomata are tiny pores that regulate gas exchange in plant leaves.'
    const a = await upsertSrsFromMistake({ docId: 'doc-note-1', sentence, term: 'Stomata', type: 'note' })
    const b = await upsertSrsFromMistake({ docId: 'doc-note-1', sentence, term: 'Stomata', type: 'note' })
    expect(b.id).toBe(a.id)
    const due = await listDueCards(99)
    expect(due.filter(d => d.term === 'Stomata').length).toBe(1)
  })
})

// Mirrors the results screen "What's next?" card: after a quiz with misses,
// getWeakTerms and listDueCards must carry the real counts the card shows.
describe('results: what-next data', () => {
  beforeAll(async () => {
    await bankMistake({ docId: 'doc-note-1', sentence: SAMPLE_TEXT.split('\n')[3], term: 'Photosynthesis', type: 'mcq' })
    await bankMistake({ docId: 'doc-note-1', sentence: SAMPLE_TEXT.split('\n')[6], term: 'Stomata', type: 'tf' })
  })

  it('reports weak terms and due cards for the next-steps card', async () => {
    const weak = await getWeakTerms(null)
    expect(weak.length).toBeGreaterThanOrEqual(2)
    const due = await listDueCards(60)
    expect(due.length).toBeGreaterThanOrEqual(2)
  })
})

// The deterministic reviewer self-test: same doc + fixed seed → same questions.
describe('reviewer: deterministic self-test', () => {
  it('generates stable mcq/id questions for the handout', () => {
    const doc = { id: 'doc-note-1', name: 'photosynthesis.pdf', text: SAMPLE_TEXT }
    const cfg = { count: 5, mix: { mcq: true, id: true }, difficulty: 'medium', shuffle: false, fixedSeed: 7 }
    const a = generateQuiz(doc, cfg)
    const b = generateQuiz(doc, cfg)
    expect(a.questions.length).toBeGreaterThan(0)
    expect(a.questions.map(q => q.stem || q.clue)).toEqual(b.questions.map(q => q.stem || q.clue))
    expect(a.questions.every(q => q.type === 'mcq' || q.type === 'id')).toBe(true)
  })
})

// Per-account tutorial gating: the done-map is keyed by account id and never
// marks a different profile as done.
describe('per-account tutorial gating', () => {
  it('tracks tutorial completion per account', async () => {
    const first = getActiveAccountId()
    await saveSettings({ tutorialDoneAccounts: { [first]: true } })

    // a second profile exists but has not seen the tutorial
    const secondId = 'acc-second-profile'
    setActiveAccount(secondId)
    const s = loadSettings()
    const secondSeen = s.tutorialDoneAccounts?.[secondId] ?? s.tutorialDone
    expect(secondSeen).toBeFalsy()

    // legacy users (global tutorialDone=true) count as done on every account
    await saveSettings({ tutorialDone: true, tutorialDoneAccounts: {} })
    const legacy = loadSettings()
    expect(legacy.tutorialDoneAccounts?.[secondId] ?? legacy.tutorialDone).toBeTruthy()

    setActiveAccount(first)
    await clearAllData()
  })
})
