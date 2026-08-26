import { openDB } from 'idb'
import { nextState, GRADES } from './srs.js'

const dbPromise = openDB('quizforge', 5, {
  upgrade(db, oldVersion) {
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
  if (id) localStorage.setItem('quizforge-active-account', id)
  else localStorage.removeItem('quizforge-active-account')
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
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('quizforge:' + pin))
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

export async function getAccount(id) {
  const db = await dbPromise
  return db.get('accounts', id)
}

export async function updateAccount(id, patch) {
  const db = await dbPromise
  const acc = await db.get('accounts', id)
  if (!acc) return null
  const updated = { ...acc, ...patch }
  await db.put('accounts', updated)
  return updated
}

export async function deleteAccount(id) {
  const db = await dbPromise
  const tx = db.transaction(['accounts', 'docs', 'attempts', 'mistakes', 'images', 'srs'], 'readwrite')
  tx.objectStore('accounts').delete(id)
  for (const storeName of ['docs', 'attempts', 'mistakes', 'images', 'srs']) {
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

export async function saveDoc({ name, type, text, topics, folder = null, tags = [] }) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const doc = {
    id: uid(),
    accountId,
    name,
    type,
    text,
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

export async function getDoc(id) {
  const db = await dbPromise
  const doc = await db.get('docs', id)
  if (doc && activeAccountId && doc.accountId !== activeAccountId) return null
  return doc
}

export async function listDocs() {
  const db = await dbPromise
  const accountId = await requireAccount()
  const all = await db.getAll('docs')
  return all.filter(d => d.accountId === accountId).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updateDoc(id, patch) {
  const db = await dbPromise
  const doc = await db.get('docs', id)
  if (!doc) return null
  const updated = { ...doc, ...patch }
  await db.put('docs', updated)
  return updated
}

export async function deleteDoc(id) {
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
  const all = await listDocImages(docId)
  return all.length
}

export async function getImageById(id) {
  const db = await dbPromise
  return db.get('images', id)
}

export async function saveAttempt(data) {
  const db = await dbPromise
  const accountId = await requireAccount()
  const attempt = { id: uid(), accountId, date: Date.now(), ...data }
  await db.put('attempts', attempt)

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

export function srsIdFor(docId, term, sentence) {
  return mistakeId(docId, term, sentence)
}

// ── Spaced repetition (srs store) ──

export async function upsertSrsFromMistake({ docId, sentence, term, type }) {
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

export async function getSrsItem(id) {
  await migrateMistakesToSrs()
  const db = await dbPromise
  return db.get('srs', id)
}

export async function listDueCards(limit = 50) {
  await migrateMistakesToSrs()
  const db = await dbPromise
  const accountId = await requireAccount()
  const now = Date.now()
  return (await db.getAll('srs'))
    .filter(r => r.accountId === accountId && (r.dueAt ?? 0) <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, limit)
}

export async function countDueCards() {
  await migrateMistakesToSrs()
  const db = await dbPromise
  const accountId = await requireAccount()
  const now = Date.now()
  return (await db.getAll('srs'))
    .filter(r => r.accountId === accountId && (r.dueAt ?? 0) <= now)
    .length
}

// grade: 'again' | 'hard' | 'good' | 'easy'
export async function gradeSrsItem(id, grade) {
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

export async function exportAll() {
  const db = await dbPromise
  const [accounts, docs, attempts, mistakes, images, srs] = await Promise.all([
    db.getAll('accounts'),
    db.getAll('docs'),
    db.getAll('attempts'),
    db.getAll('mistakes'),
    db.getAll('images'),
    db.getAll('srs')
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
    app: 'quizforge',
    version: 3,
    exportedAt: new Date().toISOString(),
    accounts,
    docs,
    attempts,
    mistakes,
    imageRecords,
    srs,
    settings: loadSettings()
  }
}

export async function importAll(data, mode = 'merge') {
  const db = await dbPromise
  if (data?.app !== 'quizforge' || !Array.isArray(data.docs)) {
    throw new Error('Not a valid QuizForge backup file.')
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

  const tx = db.transaction(['accounts', 'docs', 'attempts', 'mistakes', 'images'], 'readwrite')
  if (mode === 'replace') {
    tx.objectStore('accounts').clear()
    tx.objectStore('docs').clear()
    tx.objectStore('attempts').clear()
    tx.objectStore('mistakes').clear()
    tx.objectStore('images').clear()
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
  const tx = db.transaction(['accounts', 'docs', 'attempts', 'mistakes', 'images', 'srs'], 'readwrite')
  tx.objectStore('accounts').clear()
  tx.objectStore('docs').clear()
  tx.objectStore('attempts').clear()
  tx.objectStore('mistakes').clear()
  tx.objectStore('images').clear()
  tx.objectStore('srs').clear()
  await tx.done
  localStorage.removeItem('quizforge-settings')
  localStorage.removeItem('quizforge-active-account')
  activeAccountId = null
}

export async function storageUsage() {
  if (!navigator.storage?.estimate) return null
  const { usage, quota } = await navigator.storage.estimate()
  return { usage, quota }
}

const SETTINGS_KEY = 'quizforge-settings'

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}
  } catch {
    return {}
  }
}

export function saveSettings(patch) {
  const merged = { ...loadSettings(), ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  return merged
}
