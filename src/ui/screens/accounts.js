import { listAccounts, createAccount, hashPin, verifyPin, setActiveAccount, getAccount, deleteAccount, accountHasData, updateAccount } from '../../lib/storage.js'
import { icon } from '../icons.js'
import { esc } from '../helpers.js'

const COLORS = ['#C4713B', '#1A7F37', '#0A66C2', '#7C5CBF', '#B54708', '#475569']

export async function render(root, ctx) {
  const mode = ctx.state.accountFlow?.mode || 'picker'
  if (mode === 'create') return renderCreate(root, ctx)
  if (mode === 'lock') return renderLock(root, ctx)
  return renderPicker(root, ctx)
}

function avatarHtml(color, initial, size = 'lg') {
  return `<span class="acc-avatar ${size}" style="background:${color}">${esc(initial)}</span>`
}

/* ── Picker ── */
async function renderPicker(root, ctx) {
  const accounts = await listAccounts()

  root.innerHTML = `
    <div class="acc-screen">
      <div class="acc-brand"><span class="mark">${icon('logo')}</span>QuizForge</div>
      <h1 class="acc-title">Who's studying?</h1>
      <p class="acc-sub">Pick a profile to continue — progress is tracked separately for each.</p>
      <div class="acc-grid">
        ${accounts.map(a => `
          <button class="acc-card" data-id="${a.id}" data-tooltip="${a.pinHash ? 'PIN-protected' : 'Open without PIN'}">
            ${avatarHtml(a.color, a.name.charAt(0).toUpperCase())}
            <span class="acc-name">${esc(a.name)}</span>
            ${a.pinHash ? '<span class="acc-lock">' + icon('lock') + '</span>' : ''}
          </button>`).join('')}
        <button class="acc-card acc-add" id="add-account" data-tooltip="Create a new profile">
          <span class="acc-avatar lg ghost">${icon('plus')}</span>
          <span class="acc-name">Add account</span>
        </button>
      </div>
      <p class="acc-foot">Accounts live only on this device.</p>
    </div>
  `

  root.querySelectorAll('.acc-card[data-id]').forEach(card =>
    card.addEventListener('click', async () => {
      const acc = await getAccount(card.dataset.id)
      if (!acc) return
      if (acc.pinHash) {
        ctx.state.accountFlow = { mode: 'lock', accountId: acc.id }
        ctx.go('accounts')
      } else {
        setActiveAccount(acc.id)
        ctx.state.account = acc
        ctx.toast(`Welcome back, ${acc.name}`)
        ctx.go('library')
      }
    })
  )
  root.querySelector('#add-account').addEventListener('click', () => {
    ctx.state.accountFlow = { mode: 'create', cameFromPicker: true }
    ctx.go('accounts')
  })
}

/* ── Create ── */
function renderCreate(root, ctx) {
  let color = COLORS[0]
  let pin = ''
  let pinConfirm = ''

  root.innerHTML = `
    <div class="acc-screen">
      <div class="acc-brand"><span class="mark">${icon('logo')}</span>QuizForge</div>
      <h1 class="acc-title">Create your profile</h1>
      <p class="acc-sub">Your quizzes, progress and mistakes are tracked under this account.</p>

      <div class="acc-form">
        <label class="section-title">Profile name</label>
        <input class="text-input" id="acc-name" placeholder="e.g. Juan" maxlength="24" autocomplete="off" />

        <label class="section-title">Avatar color</label>
        <div class="swatch-row">
          ${COLORS.map(c => `<button class="swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
        </div>

        <label class="section-title">PIN <span class="faint" style="text-transform:none;letter-spacing:0">(optional — protects this profile)</span></label>
        <div class="pin-row">
          <input class="text-input pin-input" id="acc-pin" type="tel" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off" />
          <input class="text-input pin-input" id="acc-pin2" type="tel" inputmode="numeric" maxlength="4" placeholder="repeat" autocomplete="off" />
        </div>
        <p class="faint" id="pin-hint" style="font-size:12px;margin-top:6px"></p>

        <button class="btn btn-primary" id="acc-create-btn" style="margin-top:20px">${icon('check')} Create account</button>
        <button class="btn btn-secondary" id="acc-back-btn" style="margin-top:10px;width:100%">Back</button>
      </div>
    </div>
  `

  root.querySelectorAll('.swatch').forEach(sw =>
    sw.addEventListener('click', () => {
      color = sw.dataset.color
      root.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === sw))
    })
  )

  const pinEl = root.querySelector('#acc-pin')
  const pin2El = root.querySelector('#acc-pin2')
  const hint = root.querySelector('#pin-hint')
  function validatePin() {
    pin = pinEl.value.trim()
    pinConfirm = pin2El.value.trim()
    if (!pin && !pinConfirm) { hint.textContent = 'Leave both empty to skip the PIN'; return false }
    if (!/^\d{4}$/.test(pin)) { hint.textContent = 'PIN must be exactly 4 digits'; return false }
    if (pin !== pinConfirm) { hint.textContent = 'PINs do not match'; return false }
    hint.textContent = 'PIN ready — you will enter it when opening this profile'
    return true
  }
  pinEl.addEventListener('input', validatePin)
  pin2El.addEventListener('input', validatePin)

  root.querySelector('#acc-back-btn').addEventListener('click', () => {
    if (ctx.state.accountFlow?.cameFromPicker) {
      ctx.state.accountFlow = { mode: 'picker' }
      ctx.go('accounts')
    } else {
      ctx.state.accountFlow = null
      ctx.go('onboarding')
    }
  })

  root.querySelector('#acc-create-btn').addEventListener('click', async () => {
    const name = root.querySelector('#acc-name').value.trim()
    if (!name) { ctx.toast('Enter a profile name', true); return }
    const pinOk = validatePin()
    const hasPin = pin || pinConfirm
    if (hasPin && !pinOk) { ctx.toast(hint.textContent, true); return }
    const pinHash = hasPin ? await hashPin(pin) : null
    const acc = await createAccount({ name, color, pinHash })

    const others = (await listAccounts()).filter(a => a.id !== acc.id)
    for (const other of others) {
      if (!(await accountHasData(other.id))) await deleteAccount(other.id)
    }

    setActiveAccount(acc.id)
    ctx.state.account = acc
    ctx.toast(`Welcome, ${acc.name}!`)
    ctx.go('library')
  })
}

/* ── Lock ── */
async function renderLock(root, ctx) {
  const { accountId } = ctx.state.accountFlow
  const acc = await getAccount(accountId)
  if (!acc) { ctx.state.accountFlow = { mode: 'picker' }; ctx.go('accounts'); return }

  let entered = ''

  root.innerHTML = `
    <div class="acc-screen">
      <div class="acc-brand"><span class="mark">${icon('logo')}</span>QuizForge</div>
      <div style="display:flex;justify-content:center">${avatarHtml(acc.color, acc.name.charAt(0).toUpperCase())}</div>
      <h1 class="acc-title">Enter PIN for ${esc(acc.name)}</h1>
      <p class="acc-sub">This profile is protected.</p>
      <div class="pin-dots" id="pin-dots">
        <span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span>
      </div>
      <div class="pin-pad">
        ${['1','2','3','4','5','6','7','8','9'].map(n => `<button class="pin-key" data-k="${n}">${n}</button>`).join('')}
        <button class="pin-key ghost" id="pin-cancel">Cancel</button>
        <button class="pin-key" data-k="0">0</button>
        <button class="pin-key ghost" id="pin-del">⌫</button>
      </div>
    </div>
  `

  const dots = [...root.querySelectorAll('.pin-dot')]

  function paint() {
    dots.forEach((d, i) => d.classList.toggle('filled', i < entered.length))
  }

  async function tryUnlock() {
    const res = await verifyPin(entered, acc.pinHash)
    if (res.ok) {
      // transparently upgrade legacy unsalted hashes to pbkdf2
      if (res.upgrade) updateAccount(acc.id, { pinHash: res.upgrade }).catch(() => {})
      setActiveAccount(acc.id)
      ctx.state.account = acc
      ctx.state.accountFlow = null
      ctx.toast(`Welcome back, ${acc.name}`)
      ctx.go('library')
    } else {
      const pad = root.querySelector('.pin-pad')
      pad.classList.add('shake')
      setTimeout(() => pad.classList.remove('shake'), 400)
      entered = ''
      paint()
      ctx.toast('Wrong PIN', true)
    }
  }

  root.querySelectorAll('.pin-key[data-k]').forEach(key =>
    key.addEventListener('click', () => {
      if (entered.length >= 4) return
      entered += key.dataset.k
      paint()
      if (entered.length === 4) setTimeout(tryUnlock, 120)
    })
  )
  root.querySelector('#pin-del').addEventListener('click', () => {
    entered = entered.slice(0, -1)
    paint()
  })
  root.querySelector('#pin-cancel').addEventListener('click', () => {
    ctx.state.accountFlow = { mode: 'picker' }
    ctx.go('accounts')
  })
}
