import { exportAll, importAll, clearAllData, storageUsage, saveSettings, loadSettings, listDocs, listAccounts, getAccount, deleteAccount, setActiveAccount, getActiveAccountId, accountHasData } from '../../lib/storage.js'
import { testApiKey } from '../../lib/llm/gemini.js'
import { maybeScheduleReminders } from '../reminders.js'
import { icon } from '../icons.js'
import { esc, sectionTitle, row, muted, card, btn } from '../helpers.js'
import { confirmModal, promptModal } from '../confirmModal.js'
import { encryptBackup, decryptBackup } from '../../lib/crypto-backup.js'

function logoutToPicker(ctx) {
  setActiveAccount(null)
  ctx.state.account = null
  ctx.state.resumeBanner = null
  ctx.state.accountFlow = { mode: 'picker' }
  ctx.go('accounts')
}

const BACKUP_NUDGE_MS = 30 * 24 * 60 * 60 * 1000

export async function render(root, ctx) {
  const s = loadSettings()
  const lastBackup = s.lastBackupAt || null
  const stale = !lastBackup || Date.now() - lastBackup > BACKUP_NUDGE_MS
  const docCount = (await listDocs()).length
  const showNudge = stale && docCount > 0

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn">${icon('chevronLeft')}</button>
      <h2>Settings</h2>
      <div class="spacer"></div>
    </header>
    <div class="screen">

      ${sectionTitle('Account')}
      <div class="settings-group" id="account-section"></div>

      ${sectionTitle('Appearance')}
      <div class="settings-group">
        <div class="row" data-tooltip="App color theme — auto-saved locally">
          <div><div class="label">Theme</div><div class="sub">Follows your choice, saved locally</div></div>
          <div class="seg" id="theme-seg" style="grid-auto-columns:auto;width:auto">
            <button data-t="dark" style="padding:8px 16px" class="${ctx.state.theme === 'dark' ? 'on' : ''}" data-tooltip="Dark theme — easier on eyes at night">Dark</button>
            <button data-t="light" style="padding:8px 16px" class="${ctx.state.theme === 'light' ? 'on' : ''}" data-tooltip="Light theme — bright and clean">Light</button>
          </div>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Watch the welcome walkthrough again">
          <div><div class="label">Replay introduction</div><div class="sub">See the welcome slides shown on first launch</div></div>
          <button class="btn btn-secondary" id="replay-intro-btn">${icon('refresh')} Replay</button>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Replay the wizard’s guided tour of the app">
          <div><div class="label">Replay wizard tutorial</div><div class="sub">Walk through adding, quizzing and progress again</div></div>
          <button class="btn btn-secondary" id="replay-tour-btn">${icon('refresh')} Replay</button>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Skip the welcome splash and slides — go straight to the app on launch">
          <div><div class="label">Skip intro on launch</div><div class="sub">Open directly into the app every time</div></div>
          <div class="switch ${s.skipIntro ? 'on' : ''}" id="sw-skipintro" data-tooltip="Toggle skip intro"></div>
        </div>
      </div>

      ${sectionTitle('Wizard voice')}
      <div class="settings-group">
        <div class="row" style="border-bottom:none" data-tooltip="Hear the wizard speak during the guided tour">
          <div><div class="label">Wizard voice</div><div class="sub">Play the wizard’s spoken tips in the tutorial</div></div>
          <div class="switch ${s.wizardVoice !== false ? 'on' : ''}" id="sw-wizardvoice" data-tooltip="Toggle wizard voice"></div>
        </div>
      </div>

      ${sectionTitle('AI question writing')}
      ${card(`
        <p class="muted" style="font-size:13px;line-height:1.55;margin-bottom:14px">
          Quizard uses Google Gemini via a built-in relay to write natural exam-style questions.
          The relay rotates across several API keys automatically, so quizzes keep generating even when one key hits its limit.
          Without the relay, quizzes are still generated using built-in rules.
        </p>
        <div class="row" style="border-bottom:none;margin-bottom:12px" data-tooltip="After answering, tap 'Why?' to get a Gemini explanation of the correct answer">
          <div><div class="label">Explain answers</div><div class="sub">Show a “Why?” button to explain quiz answers with Gemini</div></div>
          <div class="seg" id="explain-seg" style="grid-auto-columns:auto;width:auto">
            <button data-e="on" style="padding:8px 14px" class="${s.aiExplain !== false ? 'on' : ''}" data-tooltip="Show explanation button">On</button>
            <button data-e="off" style="padding:8px 14px" class="${s.aiExplain === false ? 'on' : ''}" data-tooltip="Hide explanation button">Off</button>
          </div>
        </div>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin:0 0 12px">
          Model: <b>gemini-3.5-flash-lite</b> · keys are built-in and auto-rotating.
        </p>
        <div style="display:flex;gap:10px;margin-top:4px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-secondary" id="test-key-btn">${icon('zap')} Test connection</button>
        </div>
        <p class="faint" id="key-status" style="font-size:12px;margin-top:10px">AI relay ready.</p>
      `, { style: 'padding:16px' })}

      ${sectionTitle('Study reminders')}
      <div class="settings-group">
        <div class="row" style="border-bottom:none" data-tooltip="Get reminded to review flashcards that are due for spaced repetition">
          <div><div class="label">Due-card reminders</div><div class="sub">${typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() ? 'Daily local notification on this device' : 'Browser notification when due cards are waiting'}</div></div>
          <div class="switch ${s.reminders ? 'on' : ''}" id="sw-reminders" data-tooltip="Toggle due-card reminders"></div>
        </div>
      </div>

      ${sectionTitle('Backup &amp; restore')}
      ${card(`
        ${showNudge ? `
        <div class="backup-nudge">
          <span class="bn-icon">${icon('alert')}</span>
          <div class="bn-text">
            <div class="bn-title">${lastBackup ? 'Backup is over 30 days old' : 'No backup yet'}</div>
            <div class="bn-sub">${docCount} document${docCount === 1 ? '' : 's'} stored only on this device</div>
          </div>
        </div>` : ''}
        <p class="muted" style="font-size:13px;line-height:1.55;margin-bottom:14px">
          Your data lives only on this device. Export a backup file regularly — if the app is uninstalled or the phone is reset, local data is gone.
        </p>
        <button class="btn btn-primary" id="export-btn" data-tooltip="Download all data as a single JSON file">${icon('download')} Export backup (.json)</button>
        <button class="btn btn-secondary" id="import-btn" style="margin-top:10px;width:100%" data-tooltip="Restore from a previously exported backup">${icon('database')} Import backup</button>
        <input type="file" id="import-input" accept=".json,application/json" aria-label="Import backup file" hidden />
        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0" />
        <div class="label" style="margin-bottom:4px">Encrypted backup — safe for your own cloud storage</div>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin:0 0 12px">
          A passphrase-protected backup (AES-GCM). Unreadable without your passphrase,
          so you can keep it in Google Drive or anywhere — no server, no account.
        </p>
        <button class="btn btn-primary" id="enc-export-btn" data-tooltip="Download a passphrase-encrypted backup">${icon('lock')} Encrypted backup</button>
        <button class="btn btn-secondary" id="enc-import-btn" style="margin-top:10px;width:100%" data-tooltip="Restore from an encrypted backup file">${icon('database')} Restore encrypted backup</button>
        <input type="file" id="enc-import-input" accept=".json,application/json" aria-label="Import encrypted backup file" hidden />
        <p class="faint" id="usage-line" style="font-size:12px;margin-top:12px"></p>
      `, { style: 'padding:16px' })}

      ${sectionTitle('Danger zone')}
      ${card(`
        <button class="btn btn-danger-ghost" id="clear-btn" style="width:100%" data-tooltip="Permanently delete all documents, quizzes, history and mistakes — cannot be undone">${icon('trash')} Erase all data</button>
        <p class="faint" style="font-size:11.5px;margin-top:10px;text-align:center">Documents, quizzes, history and mistakes — permanently.</p>
      `, { style: 'border-color:var(--bad-border)' })}

      ${sectionTitle('About')}
      ${card(`
        <div style="display:flex;gap:12px;align-items:center">
          <span class="mark" style="width:38px;height:38px;border-radius:11px;background:var(--text);display:grid;place-items:center;color:var(--bg)">${icon('logo')}</span>
          <div>
            <div class="label">Quizard v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1'}</div>
            <div class="sub">Your documents never leave this device · AI polish via Google Gemini (optional)</div>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="clear-cache-btn" style="flex:1;min-width:140px" data-tooltip="Delete all cached files and reload — useful if something is broken">${icon('trash')} Clear cache &amp; reload</button>
        </div>
      `)}
    </div>
  `

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('library'))

  function renderKeyStatus() {
    root.querySelector('#key-status').textContent = 'AI relay ready (gemini-3.5-flash-lite, built-in keys).'
  }
  const testBtn = root.querySelector('#test-key-btn')
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true
    root.querySelector('#key-status').textContent = 'Testing…'
    const res = await testApiKey()
    testBtn.disabled = false
    root.querySelector('#key-status').textContent = res.ok
      ? `✓ Relay reachable — model ${res.model}`
      : `✗ ${res.message}`
    if (res.ok) ctx.toast('Gemini relay OK ✓')
  })
  root.querySelectorAll('#explain-seg button').forEach(b =>
    b.addEventListener('click', () => {
      saveSettings({ aiExplain: b.dataset.e !== 'off' })
      root.querySelectorAll('#explain-seg button').forEach(x => x.classList.toggle('on', x === b))
    })
  )
  root.querySelector('#sw-reminders')?.addEventListener('click', async e => {
    const on = e.currentTarget.classList.toggle('on')
    saveSettings({ reminders: on })
    if (on) {
      const r = await maybeScheduleReminders()
      if (!r.enabled) { ctx.toast(r.reason || 'Reminders unavailable', true); e.currentTarget.classList.remove('on'); saveSettings({ reminders: false }) }
      else ctx.toast('Reminders on ✓')
    } else {
      ctx.toast('Reminders off')
    }
  })

  renderKeyStatus()

  async function renderAccountSection() {
    const section = root.querySelector('#account-section')
    const acc = ctx.state.account || await getAccount(localStorage.getItem('quizard-active-account'))
    const accounts = await listAccounts()
    if (!acc) { section.innerHTML = '<div class="row"><span class="sub">No active account</span></div>'; return }
    const others = accounts.filter(a => a.id !== acc.id)
    section.innerHTML = `
      <div class="row" style="border-top:none">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="acc-avatar sm" style="background:${acc.color}">${esc(acc.name.charAt(0).toUpperCase())}</span>
          <div>
            <div class="label">${esc(acc.name)}</div>
            <div class="sub">${acc.pinHash ? 'PIN-protected' : 'No PIN'} · ${others.length ? `${others.length} other account${others.length === 1 ? '' : 's'}` : 'only account'}</div>
          </div>
        </div>
        <button class="btn btn-secondary" id="switch-acc-btn" data-tooltip="Change profile">${icon('refresh')} Switch</button>
      </div>
      <div class="row" style="border-bottom:none">
        <div><div class="label">Add another profile</div><div class="sub">Separate progress for a family member or classmate</div></div>
        <button class="icon-btn" id="add-acc-btn" data-tooltip="Create new profile" style="color:var(--text)">${icon('plus')}</button>
      </div>
      ${others.length ? `
      <div class="row" style="border-bottom:none">
        <div><div class="label bad-text">Remove an account</div><div class="sub">Deletes that profile with all its data</div></div>
        <button class="icon-btn" id="remove-acc-btn" data-tooltip="Remove an account" style="color:var(--bad)">${icon('trash')}</button>
      </div>` : ''}
      <div class="row" style="border-bottom:none">
        <div><div class="label">Log out</div><div class="sub">${acc.pinHash ? 'Return to the account picker — PIN required to re-enter' : 'Return to the account picker'}</div></div>
        <button class="btn btn-secondary" id="logout-btn" data-tooltip="Log out of this profile">${icon('refresh')} Log out</button>
      </div>
    `

    root.querySelector('#switch-acc-btn').addEventListener('click', () => {
      ctx.state.accountFlow = { mode: 'picker' }
      ctx.go('accounts')
    })
    root.querySelector('#add-acc-btn').addEventListener('click', () => {
      ctx.state.accountFlow = { mode: 'create' }
      ctx.go('accounts')
    })
    root.querySelector('#remove-acc-btn')?.addEventListener('click', async () => {
      const name = prompt(`Type the profile name to remove:\n\n${others.map(o => '· ' + o.name).join('\n')}`)
      if (!name) return
      const target = others.find(o => o.name.toLowerCase() === name.trim().toLowerCase())
      if (!target) { ctx.toast('No profile with that name', true); return }
      if (!await confirmModal(`Delete "${target.name}"?`, `All documents, quizzes and mistakes for <b>${esc(target.name)}</b> will be permanently removed.`)) return
      await deleteAccount(target.id)
      ctx.toast(`Removed ${target.name}`)
      renderAccountSection()
    })
    root.querySelector('#logout-btn').addEventListener('click', () => logoutToPicker(ctx))
  }
  renderAccountSection()

  root.querySelector('#replay-intro-btn').addEventListener('click', () => {
    saveSettings({ onboarded: false })
    ctx.state.screen = 'onboarding'
    ctx.go('onboarding')
  })

  root.querySelector('#replay-tour-btn')?.addEventListener('click', async () => {
    let aid = ctx.state.account?.id || getActiveAccountId() || localStorage.getItem('quizard-active-account')
    if (!aid) {
      try {
        const accs = await listAccounts()
        if (accs.length) {
          aid = accs[0].id
          setActiveAccount(aid)
          ctx.state.account = accs[0]
        }
      } catch {}
    } else if (!getActiveAccountId()) {
      // localStorage had it but in-memory activeAccountId was cleared (e.g. after a manual clear)
      setActiveAccount(aid)
      if (!ctx.state.account) {
        try { ctx.state.account = await getAccount(aid) } catch {}
      }
    }
    // Reset tutorial state so it shows again (global flag kept for legacy)
    saveSettings({ tutorialDone: false, tourSeen: [] })
    ctx.go('tutorial')
  })

  root.querySelector('#sw-wizardvoice')?.addEventListener('click', e => {
    const on = e.currentTarget.classList.toggle('on')
    saveSettings({ wizardVoice: on })
  })

  root.querySelector('#sw-skipintro')?.addEventListener('click', e => {
    const on = e.currentTarget.classList.toggle('on')
    saveSettings({ skipIntro: on })
    ctx.toast(on ? 'Intro will be skipped' : 'Intro plays on launch')
  })

  root.querySelectorAll('#theme-seg button').forEach(b =>
    b.addEventListener('click', () => {
      ctx.setTheme(b.dataset.t)
      root.querySelectorAll('#theme-seg button').forEach(x => x.classList.toggle('on', x === b))
    })
  )

  root.querySelector('#export-btn').addEventListener('click', async () => {
    try {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date()
      a.href = url
      a.download = `quizard-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      ctx.toast('Backup downloaded ✓')
      root.querySelector('.backup-nudge')?.remove()
      const usageEl = root.querySelector('#usage-line')
      if (usageEl) {
        const mb = usageEl.textContent.match(/· (.*)$/)?.[1] || ''
        usageEl.textContent = `Last backup: ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${mb ? ' · ' + mb : ''}`
      }
    } catch (err) {
      ctx.toast('Export failed: ' + err.message, true)
    }
  })

  const importInput = root.querySelector('#import-input')
  root.querySelector('#import-btn').addEventListener('click', () => importInput.click())
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0]
    if (!file) return
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      ctx.toast('That file is not valid JSON', true)
      importInput.value = ''
      return
    }
    if (data?.app !== 'quizard') {
      ctx.toast('Not a Quizard backup file', true)
      importInput.value = ''
      return
    }
    const docCount = data.docs?.length || 0
    const attemptCount = data.attempts?.length || 0
    const mask = document.createElement('div')
    mask.className = 'quit-dialog-mask'
    mask.innerHTML = `
      <div class="quit-dialog">
        <h3>Import backup?</h3>
        <p>Contains ${docCount} document${docCount === 1 ? '' : 's'} and ${attemptCount} quiz attempt${attemptCount === 1 ? '' : 's'}.</p>
        <div class="quit-actions">
          <button class="btn btn-primary" id="imp-merge">Merge with current data</button>
          <button class="btn btn-danger-ghost" id="imp-replace">Replace everything</button>
          <button class="btn btn-secondary" id="imp-cancel">Cancel</button>
        </div>
      </div>`
    document.body.appendChild(mask)
    const close = () => { mask.remove(); importInput.value = '' }
    mask.querySelector('#imp-cancel').addEventListener('click', close)
    mask.addEventListener('click', e => { if (e.target === mask) close() })
    const run = async mode => {
      try {
        const res = await importAll(data, mode)
        ctx.toast(`Imported ${res.docs} docs, ${res.attempts} attempts ✓`)
        close()
        ctx.refresh()
      } catch (err) {
        ctx.toast('Import failed: ' + err.message, true)
        close()
      }
    }
    mask.querySelector('#imp-merge').addEventListener('click', () => run('merge'))
    mask.querySelector('#imp-replace').addEventListener('click', async () => {
      if (await confirmModal('Replace all data?', 'All current documents, quizzes and history will be replaced by the backup. <b>This cannot be undone.</b>', { confirmLabel: 'Replace' })) run('replace')
    })
  })

  /* ── Encrypted backup: passphrase-protected file safe to store anywhere ── */
  const encInput = root.querySelector('#enc-import-input')
  root.querySelector('#enc-export-btn').addEventListener('click', async () => {
    const passphrase = await promptModal(
      'Encrypted backup',
      'Choose a passphrase. The backup file is <b>unreadable without it</b> — safe to store in your own Google Drive, email or USB. There is <b>no recovery</b> if you forget it.',
      { confirmLabel: 'Encrypt & download', placeholder: 'Passphrase (4+ characters)', mask: true }
    )
    if (passphrase == null) return
    if (passphrase.trim().length < 4) { ctx.toast('Passphrase must be at least 4 characters', true); return }
    try {
      const data = await exportAll()
      const text = await encryptBackup(data, passphrase.trim())
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date()
      a.href = url
      a.download = `quizard-encrypted-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      saveSettings({ lastBackupAt: Date.now() })
      ctx.toast('Encrypted backup downloaded ✓ — store it in your Drive')
      root.querySelector('.backup-nudge')?.remove()
    } catch (err) {
      ctx.toast('Encrypted export failed: ' + err.message, true)
    }
  })
  root.querySelector('#enc-import-btn').addEventListener('click', () => encInput.click())
  encInput.addEventListener('change', async () => {
    const file = encInput.files[0]
    if (!file) return
    const raw = await file.text()
    let probe = null
    try { probe = JSON.parse(raw) } catch { ctx.toast('That file is not valid JSON', true); encInput.value = ''; return }
    if (probe?.app !== 'quizard-encrypted') { ctx.toast('Not an encrypted Quizard backup — use Import backup', true); encInput.value = ''; return }
    const passphrase = await promptModal(
      'Restore encrypted backup',
      'Enter the passphrase this backup was encrypted with.',
      { confirmLabel: 'Decrypt & restore', placeholder: 'Passphrase', mask: true }
    )
    if (passphrase == null) { encInput.value = ''; return }
    let data
    try {
      data = await decryptBackup(raw, passphrase)
    } catch (err) {
      ctx.toast(err.message, true)
      encInput.value = ''
      return
    }
    const docCount = data.docs?.length || 0
    const mask = document.createElement('div')
    mask.className = 'quit-dialog-mask'
    mask.innerHTML = `
      <div class="quit-dialog">
        <h3>Restore encrypted backup?</h3>
        <p>Contains ${docCount} document${docCount === 1 ? '' : 's'}${data.attempts?.length ? ` and ${data.attempts.length} quiz attempt${data.attempts.length === 1 ? '' : 's'}` : ''}.</p>
        <div class="quit-actions">
          <button class="btn btn-primary" id="enc-merge">Merge with current data</button>
          <button class="btn btn-danger-ghost" id="enc-replace">Replace everything</button>
          <button class="btn btn-secondary" id="enc-cancel">Cancel</button>
        </div>
      </div>`
    document.body.appendChild(mask)
    const close = () => { mask.remove(); encInput.value = '' }
    mask.querySelector('#enc-cancel').addEventListener('click', close)
    const run = async mode => {
      try {
        const res = await importAll(data, mode)
        ctx.toast(`Restored ${res.docs} docs, ${res.attempts} attempts ✓`)
        close()
        ctx.refresh()
      } catch (err) {
        ctx.toast('Restore failed: ' + err.message, true)
        close()
      }
    }
    mask.querySelector('#enc-merge').addEventListener('click', () => run('merge'))
    mask.querySelector('#enc-replace').addEventListener('click', async () => {
      if (await confirmModal('Replace all data?', 'All current data will be replaced by the decrypted backup. <b>This cannot be undone.</b>', { confirmLabel: 'Replace' })) run('replace')
    })
  })

  const lastBackupLine = lastBackup
    ? `Last backup: ${new Date(lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Never backed up'
  storageUsage().then(u => {
    const mb = u ? ` · ${(u.usage / 1048576).toFixed(1)} MB used` : ''
    root.querySelector('#usage-line').textContent = lastBackupLine + mb
  })

  root.querySelector('#clear-btn').addEventListener('click', async () => {
    if (!await confirmModal('Erase all data?', 'All documents, quizzes, history and mistakes will be permanently deleted. Consider exporting a backup first.')) return
    await clearAllData()
    ctx.toast('All data erased')
    ctx.go('library')
  })

  root.querySelector('#clear-cache-btn')?.addEventListener('click', async () => {
    if (!await confirmModal('Clear cache?', 'Delete all cached files and reload the app. Your documents are stored in IndexedDB and will not be affected.')) return
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map(n => caches.delete(n)))
    }
    location.reload()
  })
}
