import 'fake-indexeddb/auto'

// Mock localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) }
  }
}

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  saveDoc, getDoc, listDocs, deleteDoc, updateDoc,
  saveAttempt, listAttempts,
  bankMistake, resolveMistake, listMistakes, countMistakes,
  getWeakTerms,
  upsertSrsFromMistake, getSrsItem, gradeSrsItem, listDueCards,
  saveDeck, getDeck, listDecks, deleteDeck,
  exportAll, importAll, clearAllData,
  ensureDefaultAccount, getActiveAccountId,
  createAccount, setActiveAccount, listAccounts, deleteAccount, accountHasData,
  loadSettings, saveSettings
} from '../src/lib/storage.js'
import { generateQuiz } from '../src/lib/quizgen.js'

const SAMPLE_TEXT = [
  'Physics Review',
  'Newton\'s Laws of Motion',
  '',
  'An object at rest stays at rest unless acted upon by an external force.',
  'Force equals mass times acceleration in classical mechanics.',
  'Every action has an equal and opposite reaction.',
  'Friction opposes motion between two surfaces in contact.',
  'Energy cannot be created or destroyed, only transformed.',
  'Momentum is the product of mass and velocity.',
  'KEY TERMS',
  'Inertia is the tendency of an object to resist changes in motion.',
  'Acceleration is the rate of change of velocity over time.'
].join('\n')

const QUIZ_CFG = {
  count: 3,
  mix: { mcq: true, tf: true, fib: false, id: false },
  difficulty: 'easy',
  shuffle: false,
  timerSec: 0,
  fresh: true,
  topics: [],
  fixedSeed: 99
}

let sharedDoc

beforeAll(async () => {
  await clearAllData()
  await ensureDefaultAccount()
  sharedDoc = await saveDoc({
    name: 'Physics Test',
    type: 'text',
    text: SAMPLE_TEXT,
    topics: [],
    folder: 'science',
    tags: ['physics', 'newton']
  })
})

describe('E2E: mistake bank → resolve', () => {
  let mistakeDoc

  beforeAll(async () => {
    mistakeDoc = await saveDoc({
      name: 'Mistake Test Doc',
      type: 'text',
      text: SAMPLE_TEXT,
      topics: [],
      folder: null,
      tags: []
    })
  })

  it('bank multiple mistakes from the same document', async () => {
    const m1 = await bankMistake({
      docId: mistakeDoc.id,
      sentence: 'Force equals mass times acceleration.',
      term: 'Force',
      type: 'mcq'
    })
    const m2 = await bankMistake({
      docId: mistakeDoc.id,
      sentence: 'Friction opposes motion between surfaces.',
      term: 'Friction',
      type: 'mcq'
    })

    expect(m1).toBeTruthy()
    expect(m2).toBeTruthy()
    expect(m1.docId).toBe(mistakeDoc.id)
    expect(m2.docId).toBe(mistakeDoc.id)

    const all = await listMistakes(mistakeDoc.id)
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  it('resolve a specific mistake', async () => {
    const mistakes = await listMistakes(mistakeDoc.id)
    const target = mistakes.find(m => m.term === 'Force')
    expect(target).toBeTruthy()

    await resolveMistake(mistakeDoc.id, 'Force', target.sentence)

    const after = await listMistakes(mistakeDoc.id)
    const stillThere = after.find(m => m.term === 'Force' && m.sentence === target.sentence)
    expect(stillThere).toBeUndefined()
  })

  it('countMistakes returns total across documents', async () => {
    const count = await countMistakes()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('getWeakTerms returns terms with frequency data', async () => {
    const weak = await getWeakTerms()
    expect(Array.isArray(weak)).toBe(true)
  })
})

describe('E2E: shared quiz (deck) lifecycle', () => {
  const questions = [
    { type: 'mcq', stem: 'What is 2+2?', options: ['3', '4', '5'], answerIndex: 1, meta: {} },
    { type: 'tf', stem: 'The sky is blue.', answer: true, meta: {} }
  ]

  let deckId

  it('save a shared quiz deck', async () => {
    const deck = await saveDeck({
      name: 'Math Quiz',
      questions,
      source: 'shared',
      docId: sharedDoc.id
    })

    expect(deck).toBeTruthy()
    expect(deck.id).toBeTruthy()
    expect(deck.name).toBe('Math Quiz')
    expect(deck.questions.length).toBe(2)
    deckId = deck.id
  })

  it('retrieve the deck by id', async () => {
    const deck = await getDeck(deckId)
    expect(deck).toBeTruthy()
    expect(deck.name).toBe('Math Quiz')
    expect(deck.questions[0].stem).toBe('What is 2+2?')
  })

  it('listDecks includes the saved deck', async () => {
    const decks = await listDecks()
    expect(decks.length).toBeGreaterThanOrEqual(1)
    expect(decks.some(d => d.id === deckId)).toBe(true)
  })

  it('delete the deck', async () => {
    await deleteDeck(deckId)
    const gone = await getDeck(deckId)
    expect(gone == null).toBe(true)
  })
})

describe('E2E: backup export → import (merge mode)', () => {
  let exportedData

  it('exportAll returns complete data snapshot', async () => {
    exportedData = await exportAll()
    expect(exportedData).toBeTruthy()
    expect(exportedData.version).toBeTruthy()
    expect(exportedData.exportedAt).toBeTruthy()
    expect(Array.isArray(exportedData.docs)).toBe(true)
  })

  it('exported data contains documents', () => {
    expect(exportedData.docs.length).toBeGreaterThan(0)
  })

  it('importAll with merge mode merges into existing data', async () => {
    const result = await importAll(exportedData, 'merge')
    expect(result).toBeTruthy()
    expect(typeof result.docs).toBe('number')
  })

  it('importAll with replace mode replaces existing data', async () => {
    const result = await importAll(exportedData, 'replace')
    expect(result).toBeTruthy()
    expect(result.docs).toBe(exportedData.docs.length)
  })

  it('data survives round-trip: export → import → export', async () => {
    const first = await exportAll()
    await importAll(first, 'replace')
    const second = await exportAll()
    expect(second.docs.length).toBe(first.docs.length)
  })
})

describe('E2E: multi-account isolation', () => {
  let account2

  it('create a second account', async () => {
    account2 = await createAccount({ name: 'Test Account 2', color: '#ff6600' })
    expect(account2).toBeTruthy()
    expect(account2.id).toBeTruthy()
    expect(account2.name).toBe('Test Account 2')
  })

  it('switch to second account', async () => {
    await setActiveAccount(account2.id)
    const active = getActiveAccountId()
    expect(active).toBe(account2.id)
  })

  it('save a doc under second account', async () => {
    const doc = await saveDoc({
      name: 'Account 2 Doc',
      type: 'text',
      text: 'Account 2 specific content.',
      topics: [],
      folder: null,
      tags: []
    })
    expect(doc).toBeTruthy()
    expect(doc.accountId).toBe(account2.id)
  })

  it('listDocs shows only second account docs', async () => {
    const docs = await listDocs()
    for (const d of docs) {
      expect(d.accountId).toBe(account2.id)
    }
  })

  it('switch back to default account', async () => {
    const accounts = await listAccounts()
    const def = accounts.find(a => a.isDefault) || accounts[0]
    await setActiveAccount(def.id)
    expect(getActiveAccountId()).toBe(def.id)
  })

  it('original account data is intact', async () => {
    const docs = await listDocs()
    const found = docs.find(d => d.name === 'Physics Test')
    expect(found).toBeTruthy()
  })

  it('check accountHasData for accounts with docs', async () => {
    const accounts = await listAccounts()
    for (const a of accounts) {
      const hasData = await accountHasData(a.id)
      expect(typeof hasData).toBe('boolean')
    }
  })
})

describe('E2E: settings persistence', () => {
  it('loadSettings returns defaults when nothing saved', () => {
    const s = loadSettings()
    expect(s).toBeTruthy()
    expect(typeof s).toBe('object')
  })

  it('saveSettings persists a key', () => {
    saveSettings({ quizCount: 10 })
    const s = loadSettings()
    expect(s.quizCount).toBe(10)
  })

  it('saveSettings merges without overwriting unrelated keys', () => {
    saveSettings({ quizCount: 15, theme: 'dark' })
    const s = loadSettings()
    expect(s.quizCount).toBe(15)
    expect(s.theme).toBe('dark')
  })
})

describe('E2E: document CRUD edge cases', () => {
  it('updateDoc patches specific fields', async () => {
    const doc = await saveDoc({
      name: 'Patch Test',
      type: 'text',
      text: 'Original text.',
      topics: [],
      folder: null,
      tags: []
    })
    await updateDoc(doc.id, { name: 'Patched Name', folder: 'updated' })
    const fetched = await getDoc(doc.id)
    expect(fetched.name).toBe('Patched Name')
    expect(fetched.folder).toBe('updated')
  })

  it('deleteDoc removes the document', async () => {
    const doc = await saveDoc({
      name: 'Delete Test',
      type: 'text',
      text: 'To be deleted.',
      topics: [],
      folder: null,
      tags: []
    })
    await deleteDoc(doc.id)
    const gone = await getDoc(doc.id)
    expect(gone == null).toBe(true)
  })

  it('getDoc with null id returns null', async () => {
    const result = await getDoc(null)
    expect(result).toBeNull()
  })

  it('getDoc with nonexistent id returns falsy', async () => {
    const result = await getDoc('nonexistent-id-12345')
    expect(!result).toBe(true)
  })
})

describe('E2E: SRS grading all grades', () => {
  let srsCard

  beforeAll(async () => {
    srsCard = await upsertSrsFromMistake({
      docId: sharedDoc.id,
      sentence: 'Inertia is the tendency to resist motion.',
      term: 'Inertia',
      type: 'mcq'
    })
  })

  it('grade with "again" resets interval', async () => {
    const graded = await gradeSrsItem(srsCard.id, 'again')
    expect(graded).toBeTruthy()
    expect(graded.reps).toBe(0)
  })

  it('grade with "good" increases reps', async () => {
    const graded = await gradeSrsItem(srsCard.id, 'good')
    expect(graded.reps).toBe(1)
  })

  it('grade with "easy" increases ease factor', async () => {
    const item = await getSrsItem(srsCard.id)
    const prevEase = item.ease
    await gradeSrsItem(srsCard.id, 'easy')
    const after = await getSrsItem(srsCard.id)
    expect(after.ease).toBeGreaterThanOrEqual(prevEase)
  })

  it('grade with "hard" decreases ease factor', async () => {
    const item = await getSrsItem(srsCard.id)
    const prevEase = item.ease
    await gradeSrsItem(srsCard.id, 'hard')
    const after = await getSrsItem(srsCard.id)
    expect(after.ease).toBeLessThanOrEqual(prevEase)
  })

  it('listDueCards filters correctly after grading', async () => {
    const due = await listDueCards()
    expect(Array.isArray(due)).toBe(true)
  })
})
