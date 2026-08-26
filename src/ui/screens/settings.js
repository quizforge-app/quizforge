import { exportAll, importAll, clearAllData, storageUsage, saveSettings, loadSettings, listDocs, listAccounts, getAccount, deleteAccount, setActiveAccount, accountHasData } from '../../lib/storage.js'
import { getApiKey, setApiKey, getModelChoice, setModelChoice, testApiKey } from '../../lib/llm/gemini.js'
import { icon } from '../icons.js'
import { esc } from '../helpers.js'

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

      <div class="section-title">Account</div>
      <div class="settings-group" id="account-section"></div>

      <div class="section-title">Appearance</div>
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
      </div>

      <div class="section-title">AI question writing</div>
      <div class="card" style="padding:16px">
        <p class="muted" style="font-size:13px;line-height:1.55;margin-bottom:14px">
          QuizForge uses Google Gemini to write natural exam-style questions.
          Get a free API key from Google AI Studio — it is stored only on this device.
          Without a key, quizzes are still generated using built-in rules.
        </p>
        <div class="row" style="border-bottom:none;margin-bottom:12px" data-tooltip="After answering, tap 'Why?' to get a Gemini explanation of the correct answer">
          <div><div class="label">Explain answers</div><div class="sub">Show a “Why?” button to explain quiz answers with Gemini</div></div>
          <div class="seg" id="explain-seg" style="grid-auto-columns:auto;width:auto">
            <button data-e="on" style="padding:8px 14px" class="${s.aiExplain !== false ? 'on' : ''}" data-tooltip="Show explanation button">On</button>
            <button data-e="off" style="padding:8px 14px" class="${s.aiExplain === false ? 'on' : ''}" data-tooltip="Hide explanation button">Off</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
          <span class="label">Model</span>
          <div class="seg" id="model-seg" style="grid-auto-columns:auto;width:auto">
            <button data-m="fast" style="padding:8px 14px" class="${getModelChoice() === 'fast' ? 'on' : ''}">Fast</button>
            <button data-m="balanced" style="padding:8px 14px" class="${getModelChoice() === 'balanced' ? 'on' : ''}">Balanced</button>
            <button data-m="quality" style="padding:8px 14px" class="${getModelChoice() === 'quality' ? 'on' : ''}">Quality</button>
          </div>
        </div>
        <input type="password" id="gemini-key-input" class="text-input" style="width:100%"
               placeholder="Paste your Gemini API key" autocomplete="off"
               value="${esc(s.geminiKey || '')}" />
        <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-primary" id="save-key-btn">${icon('check')} Save key</button>
          <button class="btn btn-secondary" id="test-key-btn">${icon('zap')} Test</button>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener"
             style="font-size:12.5px;color:var(--accent);text-decoration:none">Get a free key ↗</a>
        </div>
        <p class="faint" id="key-status" style="font-size:12px;margin-top:10px"></p>
      </div>

      <div class="section-title">Backup &amp; restore</div>
      <div class="card" style="padding:16px">
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
        <input type="file" id="import-input" accept=".json,application/json" hidden />
        <p class="faint" id="usage-line" style="font-size:12px;margin-top:12px"></p>
      </div>

      <div class="section-title">Danger zone</div>
      <div class="card" style="border-color:var(--bad-border)">
        <button class="btn btn-danger-ghost" id="clear-btn" style="width:100%" data-tooltip="Permanently delete all documents, quizzes, history and mistakes — cannot be undone">${icon('trash')} Erase all data</button>
        <p class="faint" style="font-size:11.5px;margin-top:10px;text-align:center">Documents, quizzes, history and mistakes — permanently.</p>
      </div>

      <div class="section-title">About</div>
      <div class="card" style="display:flex;gap:12px;align-items:center">
        <span class="mark" style="width:38px;height:38px;border-radius:11px;background:var(--text);display:grid;place-items:center;color:var(--bg)">${icon('logo')}</span>
        <div>
          <div class="label">QuizForge v1.1</div>
          <div class="sub">Your documents never leave this device · AI polish via Google Gemini (optional)</div>
        </div>
      </div>
    </div>
  `

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('library'))

  const keyInput = root.querySelector('#gemini-key-input')
  function renderKeyStatus() {
    const has = !!(loadSettings().geminiKey || '').trim()
    root.querySelector('#key-status').textContent = has
      ? '✓ Key saved — AI question writing is active'
      : 'No key set — quizzes use built-in rules'
  }
  root.querySelector('#save-key-btn').addEventListener('click', () => {
    setApiKey(keyInput.value)
    keyInput.value = getApiKey()
    renderKeyStatus()
    ctx.toast(getApiKey() ? 'API key saved ✓' : 'API key cleared')
  })
  const testBtn = root.querySelector('#test-key-btn')
  testBtn.addEventListener('click', async () => {
    if (!getApiKey()) {
      root.querySelector('#key-status').textContent = 'Paste and save a key first'
      return
    }
    testBtn.disabled = true
    root.querySelector('#key-status').textContent = 'Testing…'
    const res = await testApiKey()
    testBtn.disabled = false
    root.querySelector('#key-status').textContent = res.ok
      ? `✓ Key works (${res.model})`
      : `✗ ${res.message}`
    if (res.ok) ctx.toast('Gemini connection OK ✓')
  })
  root.querySelectorAll('#model-seg button').forEach(b =>
    b.addEventListener('click', () => {
      setModelChoice(b.dataset.m)
      root.querySelectorAll('#model-seg button').forEach(x => x.classList.toggle('on', x === b))
      ctx.toast(`Model set to ${b.textContent}`)
    })
  )
  root.querySelectorAll('#explain-seg button').forEach(b =>
    b.addEventListener('click', () => {
      saveSettings({ aiExplain: b.dataset.e !== 'off' })
      root.querySelectorAll('#explain-seg button').forEach(x => x.classList.toggle('on', x === b))
    })
  )
  renderKeyStatus()

  async function renderAccountSection() {
    const section = root.querySelector('#account-section')
    const acc = ctx.state.account || await getAccount(localStorage.getItem('quizforge-active-account'))
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
      if (!confirm(`Delete "${target.name}" and ALL its documents, quizzes and mistakes?\n\nThis cannot be undone.`)) return
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
      a.download = `quizforge-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
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
    if (data?.app !== 'quizforge') {
      ctx.toast('Not a QuizForge backup file', true)
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
    mask.querySelector('#imp-replace').addEventListener('click', () => {
      if (confirm('Replace ALL current documents and history with the backup?\n\nThis cannot be undone.')) run('replace')
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
    if (!confirm('Erase ALL documents, quizzes, history and mistakes?\n\nThis cannot be undone.')) return
    if (!confirm('Are you absolutely sure? Consider exporting a backup first.')) return
    await clearAllData()
    ctx.toast('All data erased')
    ctx.go('library')
  })
}
