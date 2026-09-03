import { openDB } from 'idb'
import { nextState, GRADES } from './srs.js'

/** @typedef {import('./db-types.js').Doc} Doc */
/** @typedef {import('./db-types.js').DocMeta} DocMeta */
/** @typedef {import('./db-types.js').Account} Account */
/** @typedef {import('./db-types.js').Attempt} Attempt */
/** @typedef {import('./db-types.js').Mistake} Mistake */
/** @typedef {import('./db-types.js').SrsRecord} SrsRecord */
/** @typedef {import('./db-types.js').Deck} Deck */
/** @typedef {import('./db-types.js').DocImage} DocImage */
/** @typedef {import('./db-types.js').WeakTerm} WeakTerm */

const dbPromise = openDB('quizard', 8, {
  upgrade(db, oldVersion, _newVersion, transaction) {
    if (oldVersion < 8) {
      // docs gain optional `original` (source file blob) and `visualAnalysis`
      // (cached Gemini document analysis) fields — no structural change needed.
    }
    if (oldVersion < 1) {
      const docs = db.createObjectStore('docs', { keyPath: 'id' })
      docs.createIndex('createdAt', 'createdAt')
      const attempts = db.createObjectStore('attempts', { keyPath: 'id' })
      attempts.createIndex('docId', 'docId')
      attempts.createIndex('date', 'date')
    }
    if (oldVersion < 2) {
      const mistakes = db.createObjectStore('mistakes', { keyPath: 'id' })
      mistakes.createIndex('docId', 'docId')
    }
    if (oldVersion < 3) {
      db.createObjectStore('accounts', { keyPath: 'id' })
    }
    if (oldVersion < 4) {
      const images = db.createObjectStore('images', { keyPath: 'id' })
      images.createIndex('docId', 'docId')
    }
    if (oldVersion < 5) {
      const srs = db.createObjectStore('srs', { keyPath: 'id' })
      srs.createIndex('docId', 'docId')
    }
    if (oldVersion < 6) {
      const srs = transaction.objectStore('srs')
      if (!srs.indexNames.contains('accountId')) srs.createIndex('accountId', 'accountId')
      if (!srs.indexNames.contains('dueAt')) srs.createIndex('dueAt', 'dueAt')
    }
    if (oldVersion < 7) {
      const decks = db.createObjectStore('decks', { keyPath: 'id' })
      decks.createIndex('accountId', 'accountId')
      decks.createIndex('name', 'name')
    }
  },
  async blocked() { /* another tab holds an older connection */ }
})

// Seed the srs store from previously banked mistakes (runs once per db,
// outside the version-upgrade callback so it can be async).
let migrated = false
async function migrateMistakesToSrs() {
  if (migrated) return
  migrated = true
  try {
    const db = await dbPromise
    if (!db.objectStoreNames.contains('srs')) return
    const mistakes = await db.getAll('mistakes')
    if (!mistakes.length) return
    const existingIds = new Set((await db.getAll('srs')).map(s => s.id))
    const now = Date.now()
    for (const m of mistakes) {
      if (existingIds.has(m.id)) continue
      await db.put('srs', {
        id: m.id,
        accountId: m.accountId,
        docId: m.docId,
        term: m.term,
        sentence: m.sentence,
        type: m.type,
        ease: 2.5,
        intervalDays: 0,
        dueAt: now,
        reps: 0,
        lapses: Math.max(0, (m.wrongCount || 1) - 1),
        createdAt: m.createdAt || now,
        lastReviewedAt: m.lastWrongAt || now
      })
    }
  } catch { /* non-fatal */ }
}

let activeAccountId = null

export function setActiveAccount(id) {
  activeAccountId = id
  if (id) localStorage.setItem('quizard-active-account', id)
  else localStorage.removeItem('quizard-active-account')
}

export function getActiveAccountId() {
  return activeAccountId
}

async function requireAccount() {
  if (activeAccountId) return activeAccountId
  const acc = await ensureDefaultAccount()
  return acc.id
}

const PBKDF2_ITERATIONS = 100000

async function pbkdf2Bits(pin, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256)
}

function bytesToB64(u8) {
  let s = ''
  for (const b of u8) s += String.fromCharCode(b)
  return btoa(s)
}

function b64ToBytes(b64) {
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}

function timingSafeEq(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Salted PBKDF2-SHA256 (100k iterations). Format: pbkdf2$<iters>$<saltB64>$<hashB64>
export async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await pbkdf2Bits(pin, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(new Uint8Array(bits))}`
}

async function legacySha256Hex(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('quizard:' + pin))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Verifies pin against a stored hash. Returns { ok } and — when the stored
// hash is the legacy unsalted format and the pin matches — { upgrade }
// carrying the new pbkdf2 hash so the caller can persist it.
export async function verifyPin(pin, stored) {
  if (!stored) return { ok: false }
  if (stored.startsWith('pbkdf2$')) {
    const [, itersStr, saltB64, hashB64] = stored.split('$')
    const iters = Number(itersStr)
    if (!iters || !saltB64 || !hashB64) return { ok: false }
    const bits = await pbkdf2Bits(pin, b64ToBytes(saltB64), iters)
    return { ok: timingSafeEq(bytesToB64(new Uint8Array(bits)), hashB64) }
  }
  if ((await legacySha256Hex(pin)) === stored) {
    return { ok: true, upgrade: await hashPin(pin) }
  }
  return { ok: false }
}

export async function listAccounts() {
  const db = await dbPromise
  const all = await db.getAll('accounts')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function createAccount({ name, pinHash = null, color }) {
  const db = await dbPromise
  const acc = { id: uid(), name: name.trim(), pinHash, color, createdAt: Date.now() }
  await db.put('accounts', acc)
  return acc
}

/** @param {string} id @returns {Promise<Account | undefined>} */
export async function getAccount(id) {
  if (!id) return undefined
  const db = await dbPromise
  return db.get('accounts', id)
}

/** @param {string} id @param {Partial<Account>} patch @returns {Promise<Account | null>} */
export async function updateAccount(id, patch) {
  if (!id) return null
  const db = await dbPromise
  const acc = await db.get('accounts', id)
  if (!acc) return null
  const updated = { ...acc, ...patch }
  await db.put('accounts', updated)
  return updated
}

export async function deleteAccount(id) {
  if (!id) return
  const db = await dbPromise
  const tx = db.transaction(['accounts', 'docs', 'attempts', 'mistakes', 'images', 'srs', 'decks'], 'readwrite')
  tx.objectStore('accounts').delete(id)
  for (const storeName of ['docs', 'attempts', 'mistakes', 'images', 'srs', 'decks']) {
    const store = tx.objectStore(storeName)
    let cursor = await store.openCursor()
    while (cursor) {
      if (cursor.value.accountId === id) cursor.delete()
      cursor = await cursor.continue()
    }
  }
  await tx.done
}

export async function accountHasData(accountId) {
  const db = await dbPromise
  for (const storeName of ['docs', 'attempts', 'mistakes', 'images', 'srs']) {
    const store = db.transaction(storeName).objectStore(storeName)
    let cursor = await store.openCursor()
    while (cursor) {
      if (cursor.value.accountId === accountId) return true
      cursor = await cursor.continue()
    }
  }
  return false
}

export async function ensureDefaultAccount() {
  const db = await dbPromise
  let accounts = await db.getAll('accounts')
  if (accounts.length) return accounts[0]
  const acc = { id: uid(), name: 'My account', pinHash: null, color: '#C4713B', createdAt: Date.now() }
  await db.put('accounts', acc)
  const tx = db.transaction(['docs', 'attempts', 'mistakes'], 'readwrite')
  for (const storeName of ['docs', 'attempts', 'mistakes']) {
    const store = tx.objectStore(storeName)
    let cursor = await store.openCursor()
    while (cursor) {
      if (!cursor.value.accountId) {
        const updated = { ...cursor.value, accountId: acc.id }
        cursor.update(updated)
      }
      cursor = await cursor.continue()
    }
  }
  await tx.done
  return acc
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function mistakeId(docId, term, sentence) {
  let h = 5381 >>> 0
  for (let i = 0; i < sentence.length; i++) h = ((h << 5) + h + sentence.charCodeAt(i)) | 0
  return `${docId}__${term.toLowerCase().replace(/\s+/g, '-')}__${h >>> 0}`
}

/** @param {{ name: string, type: string, text: string, topics?: unknown[], folder?: string | null, tags?: string[], original?: Blob | null }} opts @returns {Promise<Doc>} */
export async function saveDoc({ name, type, text, topics, folder = null, tags = [], original = null }) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const doc = {
    id: uid(),
    accountId,
    name,
    type,
    text,
    original: original instanceof Blob ? original : null,
    visualAnalysis: null,
    topics: Array.isArray(topics) ? topics : [],
    folder: folder && String(folder).trim() ? String(folder).trim() : null,
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
    wordCount: (text.match(/\S+/g) || []).length,
    createdAt: Date.now(),
    bestScore: null,
    attempts: 0
  }
  await db.put('docs', doc)
  return doc
}

export { deriveFolders, deriveTags } from './taxonomy.js'

/** @param {string} id @returns {Promise<Doc | null>} */
export async function getDoc(id) {
  if (!id) return null
  const db = await dbPromise
  const doc = await db.get('docs', id)
  if (doc && activeAccountId && doc.accountId !== activeAccountId) return null
  return doc
}

/** @returns {Promise<DocMeta[]>} */
export async function listDocs() {
  const db = await dbPromise
  const accountId = await requireAccount()
  // Project out the (potentially huge) `text` field — listings only need
  // metadata, so we avoid pulling megabytes of prose into memory on every
  // Library / History / Import render.
  const out = []
  let cursor = await db.transaction('docs').store.openCursor()
  while (cursor) {
    const d = cursor.value
    if (d.accountId === accountId) {
      const { text, original, visualAnalysis, ...meta } = d
      out.push(meta)
    }
    cursor = await cursor.continue()
  }
  out.sort((a, b) => b.createdAt - a.createdAt)
  return out
}

/** @param {string} id @param {Partial<Doc>} patch @returns {Promise<Doc | null>} */
export async function updateDoc(id, patch) {
  if (!id) return null
  const db = await dbPromise
  const doc = await db.get('docs', id)
  if (!doc) return null
  const updated = { ...doc, ...patch }
  await db.put('docs', updated)
  return updated
}

export async function deleteDoc(id) {
  if (!id) return
  const db = await dbPromise
  const tx = db.transaction(['docs', 'attempts', 'images'], 'readwrite')
  tx.objectStore('docs').delete(id)
  const idx = tx.objectStore('attempts').index('docId')
  let cursor = await idx.openCursor(IDBKeyRange.only(id))
  while (cursor) {
    cursor.delete()
    cursor = await cursor.continue()
  }
  const imgIdx = tx.objectStore('images').index('docId')
  let imgCursor = await imgIdx.openCursor(IDBKeyRange.only(id))
  while (imgCursor) {
    imgCursor.delete()
    imgCursor = await imgCursor.continue()
  }
  await tx.done
}

export async function saveDocImages(docId, images) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const tx = db.transaction('images', 'readwrite')
  for (const img of images) {
    tx.store.put({
      id: uid(),
      docId,
      accountId,
      blob: img.blob,
      mime: img.mime,
      slideNumber: img.slideNumber ?? null,
      index: img.index
    })
  }
  await tx.done
}

export async function listDocImages(docId) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const all = await db.getAllFromIndex('images', 'docId', docId)
  return all
    .filter(img => img.accountId === accountId)
    .sort((a, b) => a.index - b.index)
}

export async function countDocImages(docId) {
  const db = await dbPromise
  return db.countFromIndex('images', 'docId', docId)
}

/** @param {string} id @returns {Promise<DocImage | undefined>} */
export async function getImageById(id) {
  if (!id) return undefined
  const db = await dbPromise
  return db.get('images', id)
}

export async function saveAttempt(data) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const attempt = { id: uid(), accountId, date: Date.now(), ...data }
  await db.put('attempts', attempt)

  if (!attempt.docId) return attempt
  const doc = await db.get('docs', attempt.docId)
  if (doc) {
    const patch = { attempts: (doc.attempts || 0) + 1 }
    if (attempt.percent != null && (doc.bestScore == null || attempt.percent > doc.bestScore)) {
      patch.bestScore = attempt.percent
    }
    await db.put('docs', { ...doc, ...patch })
  }
  return attempt
}

/** @param {string | null} docId @returns {Promise<Attempt[]>} */
export async function listAttempts(docId = null) {
  const db = await dbPromise
  const accountId = await requireAccount()
  if (docId) {
    const arr = await db.getAllFromIndex('attempts', 'docId', docId)
    return arr.filter(a => a.accountId === accountId).sort((a, b) => b.date - a.date)
  }
  const all = await db.getAll('attempts')
  return all.filter(a => a.accountId === accountId).sort((a, b) => b.date - a.date)
}

/** @param {{ docId: string, sentence: string, term: string, type: string }} opts @returns {Promise<Mistake>} */
export async function bankMistake({ docId, sentence, term, type }) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const id = mistakeId(docId, term, sentence)
  const existing = await db.get('mistakes', id)
  if (existing) {
    existing.wrongCount = (existing.wrongCount || 1) + 1
    existing.lastWrongAt = Date.now()
    await db.put('mistakes', existing)
    return existing
  }
  const mistake = { id, accountId, docId, sentence, term, type, wrongCount: 1, createdAt: Date.now(), lastWrongAt: Date.now() }
  await db.put('mistakes', mistake)
  return mistake
}

export async function resolveMistake(docId, term, sentence) {
  const db = await dbPromise
  await db.delete('mistakes', mistakeId(docId, term, sentence))
}

export async function listMistakes(docId = null) {
  const db = await dbPromise
  const accountId = await requireAccount()
  if (docId) {
    const arr = await db.getAllFromIndex('mistakes', 'docId', docId)
    return arr.filter(m => m.accountId === accountId).sort((a, b) => b.lastWrongAt - a.lastWrongAt)
  }
  const all = await db.getAll('mistakes')
  return all.filter(m => m.accountId === accountId).sort((a, b) => b.lastWrongAt - a.lastWrongAt)
}

export async function countMistakes() {
  const all = await listMistakes()
  return all.length
}

// Aggregate the account's weakest terms across the mistake bank and the SRS
// schedule. Returns [{ term, docId, sentence, type, weight }] sorted by weight
// (highest first). Used by adaptive / weak-spot generation to bias questions
// toward what the learner keeps missing.
/** @param {string | null} accountId @param {string | null} docId @returns {Promise<WeakTerm[]>} */
export async function getWeakTerms(accountId = null, docId = null) {
  const acc = accountId || (await requireAccount())
  const db = await dbPromise
  const mistakes = (docId ? await listMistakes(docId) : await listMistakes())
    .filter(m => m.accountId === acc)
  const srs = (await db.getAllFromIndex('srs', 'accountId', acc))
    .filter(r => (docId ? r.docId === docId : true))
  const byTerm = new Map()
  const bump = (term, docId2, sentence, type, w) => {
    if (!term) return
    const key = `${docId2}__${term.toLowerCase()}`
    const cur = byTerm.get(key) || { term, docId: docId2, sentence, type, weight: 0 }
    cur.weight += w
    byTerm.set(key, cur)
  }
  for (const m of mistakes) bump(m.term, m.docId, m.sentence, m.type, 2 * (m.wrongCount || 1))
  for (const r of srs) {
    // lapses hurt most; low ease and items already due add weight too
    const lapseW = (r.lapses || 0) * 2
    const easeW = r.ease != null && r.ease < 2.5 ? 1 : 0
    const dueW = (r.dueAt ?? 0) <= Date.now() ? 1 : 0
    bump(r.term, r.docId, r.sentence, r.type, lapseW + easeW + dueW)
  }
  return [...byTerm.values()].sort((a, b) => b.weight - a.weight)
}

// ── Saved decks (shared/challenge quizzes kept in the library) ──

/** @param {{ name?: string, questions: unknown[], source?: string, docId?: string | null }} opts @returns {Promise<Deck>} */
export async function saveDeck({ name, questions, source = 'shared', docId = null }) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const deck = {
    id: uid(),
    accountId,
    name: (name || 'Shared Quiz').trim().slice(0, 120),
    questions: Array.isArray(questions) ? questions : [],
    source,
    docId,
    createdAt: Date.now()
  }
  await db.put('decks', deck)
  return deck
}

/** @param {string} id @returns {Promise<Deck | null>} */
export async function getDeck(id) {
  if (!id) return null
  const db = await dbPromise
  const deck = await db.get('decks', id)
  if (deck && activeAccountId && deck.accountId !== activeAccountId) return null
  return deck
}

export async function listDecks() {
  const db = await dbPromise
  const accountId = await requireAccount()
  return (await db.getAllFromIndex('decks', 'accountId', accountId))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteDeck(id) {
  const db = await dbPromise
  await db.delete('decks', id)
}

export function srsIdFor(docId, term, sentence) {
  return mistakeId(docId, term, sentence)
}

// ── Spaced repetition (srs store) ──

/** @param {{ docId: string, sentence: string, term: string, type: string }} opts @returns {Promise<SrsRecord | null>} */
export async function upsertSrsFromMistake({ docId, sentence, term, type }) {
  if (!docId || !term) return null
  await migrateMistakesToSrs()
  const db = await dbPromise
  const accountId = await requireAccount()
  const id = mistakeId(docId, term, sentence)
  const existing = await db.get('srs', id)
  if (existing) return existing
  const now = Date.now()
  const rec = {
    id,
    accountId,
    docId,
    term,
    sentence,
    type,
    ease: 2.5,
    intervalDays: 0,
    dueAt: now,
    reps: 0,
    lapses: 0,
    createdAt: now,
    lastReviewedAt: now
  }
  await db.put('srs', rec)
  return rec
}

/** @param {string} id @returns {Promise<SrsRecord | undefined>} */
export async function getSrsItem(id) {
  if (!id) return undefined
  await migrateMistakesToSrs()
  const db = await dbPromise
  return db.get('srs', id)
}

export async function listDueCards(limit = 50) {
  await migrateMistakesToSrs()
  const db = await dbPromise
  const accountId = await requireAccount()
  const now = Date.now()
  return (await db.getAllFromIndex('srs', 'accountId', accountId))
    .filter(r => (r.dueAt ?? 0) <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, limit)
}

export async function countDueCards() {
  await migrateMistakesToSrs()
  const db = await dbPromise
  const accountId = await requireAccount()
  const now = Date.now()
  return (await db.getAllFromIndex('srs', 'accountId', accountId))
    .filter(r => (r.dueAt ?? 0) <= now)
    .length
}

// grade: 'again' | 'hard' | 'good' | 'easy'
/** @param {string} id @param {'again'|'hard'|'good'|'easy'} grade @returns {Promise<SrsRecord | null>} */
export async function gradeSrsItem(id, grade) {
  if (!id) return null
  await migrateMistakesToSrs()
  const db = await dbPromise
  const item = await db.get('srs', id)
  if (!item) return null
  const updated = { ...item, ...nextState(item, GRADES[grade] ?? GRADES.good) }
  await db.put('srs', updated)
  // scheduled cards leave the raw mistake bank; failed ones stay banked
  if (grade !== 'again') await db.delete('mistakes', id).catch(() => {})
  return updated
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** @returns {Promise<ExportData>} */
export async function exportAll() {
  const db = await dbPromise
  const [accounts, docs, attempts, mistakes, images, srs, decks] = await Promise.all([
    db.getAll('accounts'),
    db.getAll('docs'),
    db.getAll('attempts'),
    db.getAll('mistakes'),
    db.getAll('images'),
    db.getAll('srs'),
    db.getAll('decks')
  ])
  saveSettings({ lastBackupAt: Date.now() })
  // embed slide images as data urls so restores are complete (backup v3)
  const imageRecords = []
  for (const img of images) {
    const rec = {
      id: img.id,
      docId: img.docId,
      accountId: img.accountId,
      mime: img.mime,
      slideNumber: img.slideNumber ?? null,
      index: img.index
    }
    if (img.blob instanceof Blob) {
      rec.dataUrl = await blobToDataUrl(img.blob).catch(() => null)
    }
    imageRecords.push(rec)
  }
  return {
    app: 'quizard',
    version: 3,
    exportedAt: new Date().toISOString(),
    accounts,
    docs,
    attempts,
    mistakes,
    imageRecords,
    srs,
    decks,
    settings: loadSettings()
  }
}

/** @param {ExportData} data @param {'merge'|'replace'} mode @returns {Promise<{ added: number, docs: number, attempts: number }>} */
export async function importAll(data, mode = 'merge') {
  const db = await dbPromise
  if (data?.app !== 'quizard' || !Array.isArray(data.docs)) {
    throw new Error('Not a valid Quizard backup file.')
  }
  await ensureDefaultAccount()

  // decode incoming image blobs BEFORE opening the write transaction —
  // awaiting fetch inside an active idb transaction would auto-commit it
  const decodedImages = []
  for (const rec of data.imageRecords || []) {
    if (!rec?.id) continue
    let blob = null
    if (rec.dataUrl) {
      try { blob = await (await fetch(rec.dataUrl)).blob() } catch { blob = null }
    }
    decodedImages.push({ rec, blob })
  }

  const tx = db.transaction(['accounts', 'docs', 'attempts', 'mistakes', 'images', 'decks'], 'readwrite')
  if (mode === 'replace') {
    tx.objectStore('accounts').clear()
    tx.objectStore('docs').clear()
    tx.objectStore('attempts').clear()
    tx.objectStore('mistakes').clear()
    tx.objectStore('images').clear()
    tx.objectStore('decks').clear()
  }
  let added = 0
  const putUnique = async (storeName, items) => {
    for (const item of items) {
      if (mode === 'merge') {
        const exists = await tx.objectStore(storeName).get(item.id)
        if (exists) continue
      }
      tx.objectStore(storeName).put(item)
      added++
    }
  }
  await putUnique('accounts', data.accounts || [])
  await putUnique('docs', data.docs || [])
  await putUnique('attempts', data.attempts || [])
  await putUnique('mistakes', data.mistakes || [])
  await putUnique('srs', data.srs || [])
  await putUnique('decks', data.decks || [])
  for (const { rec, blob } of decodedImages) {
    if (mode === 'merge') {
      const exists = await tx.objectStore('images').get(rec.id)
      if (exists) continue
    }
    tx.objectStore('images').put({
      id: rec.id,
      docId: rec.docId,
      accountId: rec.accountId,
      mime: rec.mime,
      slideNumber: rec.slideNumber ?? null,
      index: rec.index ?? 0,
      ...(blob ? { blob } : {})
    })
    added++
  }
  await tx.done
  if (data.settings && typeof data.settings === 'object') {
    const clean = { ...data.settings }
    delete clean.configs
    saveSettings(clean)
  }
  const accountsNow = await db.getAll('accounts')
  if (!accountsNow.some(a => a.id === activeAccountId)) {
    setActiveAccount(accountsNow[0]?.id || null)
  }
  return { added, docs: data.docs.length, attempts: (data.attempts || []).length }
}

export async function clearAllData() {
  const db = await dbPromise
  const tx = db.transaction(['accounts', 'docs', 'attempts', 'mistakes', 'images', 'srs', 'decks'], 'readwrite')
  tx.objectStore('accounts').clear()
  tx.objectStore('docs').clear()
  tx.objectStore('attempts').clear()
  tx.objectStore('mistakes').clear()
  tx.objectStore('images').clear()
  tx.objectStore('srs').clear()
  tx.objectStore('decks').clear()
  await tx.done
  localStorage.removeItem('quizard-settings')
  localStorage.removeItem('quizard-active-account')
  activeAccountId = null
}

export async function storageUsage() {
  if (!navigator.storage?.estimate) return null
  const { usage, quota } = await navigator.storage.estimate()
  return { usage, quota }
}

const SETTINGS_KEY = 'quizard-settings'

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}
  } catch {
    return {}
  }
}

/** @param {import('./db-types.js').AppSettings} patch @returns {import('./db-types.js').AppSettings} */
export function saveSettings(patch) {
  const merged = { ...loadSettings(), ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  return merged
}
