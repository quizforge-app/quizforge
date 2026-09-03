// Encrypted backup: wraps exportAll/importAll with passphrase encryption so a
// backup file can safely live in the user's own cloud storage (Drive, etc.) —
// it's unreadable without the passphrase and never touches any server.
//
// Format: quizard-encrypted v1 — PBKDF2-SHA256 (210k iterations) key
// derivation + AES-GCM 256 payload.

const ITERATIONS = 210000
const MAGIC = 'quizard-encrypted'
const FORMAT = 1

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function unb64(str) {
  const bin = atob(str)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** @param {object} data - plain export object @param {string} passphrase @returns {Promise<string>} encrypted backup text */
export async function encryptBackup(data, passphrase) {
  if (!passphrase || passphrase.length < 4) throw new Error('Passphrase must be at least 4 characters')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return JSON.stringify({
    app: MAGIC,
    format: FORMAT,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: b64(salt) },
    iv: b64(iv),
    ct: b64(ct)
  })
}

/** @param {string} text - encrypted backup text @param {string} passphrase @returns {Promise<object>} decrypted export object */
export async function decryptBackup(text, passphrase) {
  let parsed
  try { parsed = JSON.parse(text) } catch { throw new Error('Not a Quizard backup file') }
  if (parsed.app !== MAGIC || !parsed.ct) throw new Error('Not an encrypted Quizard backup')
  if (parsed.format !== FORMAT) throw new Error('Unsupported backup format version')
  const key = await deriveKey(passphrase, unb64(parsed.kdf.salt))
  let plainBuf
  try {
    plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(parsed.iv) },
      key,
      unb64(parsed.ct)
    )
  } catch {
    throw new Error('Wrong passphrase — decryption failed')
  }
  return JSON.parse(new TextDecoder().decode(plainBuf))
}
