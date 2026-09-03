import './styles/base.css'
import './styles/components.css'
import './styles/screens.css'

import * as library from './ui/screens/library.js'
import { saveAttempt, loadSettings, saveSettings, ensureDefaultAccount, listAccounts, setActiveAccount, getAccount, accountHasData } from './lib/storage.js'
import { initNotificationActions, consumePendingReview } from './ui/reminders.js'
import { icon } from './ui/icons.js'
import { initTooltips } from './ui/tooltip.js'

// Service worker only for the installable web PWA. The Capacitor APK bundles
// assets locally (offline) and the SW throws on the capacitor:// origin, so
// skip it when building for Android (VITE_TARGET=capacitor).
if (import.meta.env.VITE_TARGET !== 'capacitor') {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        toast('New version available — tap to update', false, () => updateSW(true))
      },
      onOfflineReady() {
        toast('App ready for offline use')
      },
      onRegistrationError(err) {
        console.error('SW registration error:', err)
      }
    })
  })
}
initTooltips()

// ── Code-split screen registry ──
// `library` is eagerly imported (first screen); all others lazy-load on demand.
const SCREEN_IMPORTS = {
  library: () => Promise.resolve(library),
  history: () => import('./ui/screens/history.js'),
  import: () => import('./ui/screens/import.js'),
  setup: () => import('./ui/screens/setup.js'),
  quiz: () => import('./ui/screens/quiz.js'),
  results: () => import('./ui/screens/results.js'),
  settings: () => import('./ui/screens/settings.js'),
  onboarding: () => import('./ui/screens/onboarding.js'),
  docdetail: () => import('./ui/screens/docdetail.js'),
  reviewer: () => import('./ui/screens/reviewer.js'),
  accounts: () => import('./ui/screens/accounts.js'),
  welcome: () => import('./ui/screens/welcome.js'),
  flashcards: () => import('./ui/screens/flashcards.js'),
  shared: () => import('./ui/screens/shared.js'),
  tutorial: () => import('./ui/screens/tutorial.js')
}

// Cache loaded modules so dynamic import() only fires once per screen.
const screenCache = { library }

async function loadScreen(name) {
  if (screenCache[name]) return screenCache[name]
  const loader = SCREEN_IMPORTS[name]
  if (!loader) return null
  const mod = await loader()
  screenCache[name] = mod
  return mod
}
const NAV_SCREENS = ['library', 'history', 'settings']

const state = {
  screen: 'library',
  currentDocId: null,
  docs: [],
  theme: 'dark',
  configs: {},
  cachedQuiz: {},
  lastResult: null
}

const app = document.getElementById('app')

const settings = loadSettings()
state.theme = settings.theme || 'dark'

function resumeKeyFor(accountId) {
  return `quizard-active-quiz-${accountId || 'default'}`
}

function detectResumeBanner(accountId) {
  try {
    const saved = JSON.parse(localStorage.getItem(resumeKeyFor(accountId)))
    if (saved?.questions?.length) {
      state.resumeBanner = {
        docName: saved.docName || 'Document',
        index: saved.index || 0,
        total: saved.questions.length
      }
      return true
    }
  } catch { /* no saved session */ }
  state.resumeBanner = null
  return false
}

function defaultConfig() {
  return {
    count: 15,
    mix: { mcq: true, tf: true, fib: true, id: true },
    difficulty: 'medium',
    shuffle: true,
    timerSec: 0,
    fresh: true,
    topics: [],
    fixedSeed: null
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B0B13' : '#F7F6FD')
}

applyTheme(state.theme)

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark')
}

function setTheme(theme) {
  state.theme = theme
  saveSettings({ theme })
  Object.assign(settings, loadSettings())
  applyTheme(theme)
  // Theme is applied purely via CSS variables on <html>, so no screen rebuild
  // is needed — re-rendering the whole view here caused needless jank.
}

function toast(msg, isError = false, onClick = null) {
  let el = document.querySelector('.toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.toggle('error', isError)
  el.style.cursor = onClick ? 'pointer' : ''
  el.onclick = onClick || null
  requestAnimationFrame(() => el.classList.add('show'))
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), onClick ? 8000 : 2600)
}

function getConfig(docId) {
  const stored = settings.configs?.[docId]
  return stored ? { ...defaultConfig(), ...stored } : defaultConfig()
}

function saveConfig(docId, cfg) {
  const s = loadSettings()
  s.configs = s.configs || {}
  s.configs[docId] = cfg
  localStorage.setItem('quizard-settings', JSON.stringify(s))
  settings.configs = s.configs
}

async function saveAttemptRecord(data) {
  await saveAttempt(data)
}

const ctx = {
  state,
  toast,
  toggleTheme,
  setTheme,
  getConfig,
  saveConfig,
  saveAttemptRecord,
  /** Apply stagger animation delay to child elements. */
  stagger(parent, selector = '.stagger') {
    const items = parent.querySelectorAll(selector)
    items.forEach((el, i) => el.style.setProperty('--i', i))
  },
  async refresh() {
    renderScreen(state.screen)
  },
  go(screen, params) {
    if (screen === 'setup' || screen === 'docdetail' || screen === 'reviewer' || screen === 'flashcards') state.currentDocId = params
    if (screen === 'quiz' && !state.currentDocId && !state.mistakeReview && !state.resumeRequested && !state.sharedQuiz) screen = 'library'
    if (screen === 'library' || (screen === 'quiz' && state.currentDocId)) { state.sharedQuiz = null; state.challenge = null }
    state.screen = screen
    renderScreen(screen)
    window.scrollTo(0, 0)
  },
  clearResume() {
    localStorage.removeItem(resumeKeyFor(state.account?.id))
    state.resumeBanner = null
  },
  requestResume() {
    try {
      const saved = JSON.parse(localStorage.getItem(resumeKeyFor(state.account?.id)))
      if (saved?.docId) state.currentDocId = saved.docId
      state.resumeRequested = true
    } catch {
      state.resumeBanner = null
    }
  }
}

function navHtml(active) {
  return `
    <nav class="bottom-nav">
      <div class="nav-pill"></div>
      <button class="nav-item ${active === 'library' ? 'active' : ''}" data-nav="library" data-tooltip="View your documents">
        ${icon('book')}<span>Library</span>
      </button>
      <button class="nav-item ${active === 'history' ? 'active' : ''}" data-nav="history" data-tooltip="Track your progress and streaks">
        ${icon('chart')}<span>Progress</span>
      </button>
      <button class="nav-item nav-add" data-nav="import" aria-label="Add document" data-tooltip="Add a new document">
        <span class="add-circle">${icon('plus')}</span>
        <span>Add</span>
      </button>
      <button class="nav-item ${active === 'settings' ? 'active' : ''}" data-nav="settings" data-tooltip="Settings and backup">
        ${icon('gear')}<span>Settings</span>
      </button>
    </nav>`
}

function moveNavPill(screen) {
  const nav = document.querySelector('.bottom-nav')
  if (!nav) return
  const pill = nav.querySelector('.nav-pill')
  if (!pill) return
  // Hide on Add/import screen — no nav tab owns it
  const active = nav.querySelector('.nav-item.active')
  if (!active) { pill.style.opacity = '0'; return }
  const navRect = nav.getBoundingClientRect()
  const r = active.getBoundingClientRect()
  pill.style.opacity = '1'
  pill.style.left = (r.left - navRect.left) + 'px'
  pill.style.top = (r.top - navRect.top) + 'px'
  pill.style.width = r.width + 'px'
  pill.style.height = r.height + 'px'
}
let pillRaf = 0
addEventListener('resize', () => {
  cancelAnimationFrame(pillRaf)
  pillRaf = requestAnimationFrame(() => moveNavPill(state.screen))
}, { passive: true })

let renderToken = 0
let currentRoot = null
let currentScreen = null

async function renderScreen(name) {
  const token = ++renderToken
  const Screen = await loadScreen(name)
  if (!Screen) return

  if (currentScreen) {
    const prev = await loadScreen(currentScreen)
    if (prev?.unmount) {
      try { prev.unmount(currentRoot, ctx) } catch {}
    }
  }
  currentScreen = name
  currentRoot = null

  window.__quizAccountId = state.account?.id || 'default'

  try {
    const frag = document.createDocumentFragment()

    if (NAV_SCREENS.includes(name)) {
      const holder = document.createElement('div')
      holder.innerHTML = navHtml(name)
      frag.appendChild(holder)
      const tempRoot = document.createElement('div')
      frag.appendChild(tempRoot)

      app.innerHTML = ''
      app.appendChild(frag)
      currentRoot = tempRoot
      await Screen.render(tempRoot, ctx)
      if (token !== renderToken) return
      window.dispatchEvent(new Event('quizScreenChanged'))

      app.querySelectorAll('[data-nav]').forEach(btn =>
        btn.addEventListener('click', () => go(btn.dataset.nav))
      )
      moveNavPill(state.screen)
    } else {
      const rootDiv = document.createElement('div')
      frag.appendChild(rootDiv)
      app.innerHTML = ''
      app.appendChild(frag)
      currentRoot = rootDiv
      await Screen.render(rootDiv, ctx)
    }
  } catch (err) {
    console.error(err)
    if (token === renderToken) {
      app.innerHTML = `<div class="screen" style="padding:40px 24px;text-align:center">
        <h3 style="margin-bottom:8px">Something went wrong</h3>
        <p class="muted">${String(err.message || err)}</p>
      </div>`
    }
  }
}

function go(nav) {
  state.screen = nav
  moveNavPill(nav)
  renderScreen(nav)
  window.scrollTo(0, 0)
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !['quiz'].includes(state.screen)) go('library')
})

const boot = document.getElementById('boot')
if (boot) boot.remove()

// Actionable notification: "Review now" on the Android reminder routes into
// the due-card review as soon as the app is on a screen that can host it.
initNotificationActions()
addEventListener('quizard:due-review', () => {
  if (state.screen === 'library') {
    import('./ui/mistakes.js').then(m => m.startDueReview(ctx)).catch(() => {})
  }
})

// Magic ripple: any primary button or quiz option spawns a glow at the press
// point. One delegated listener covers every screen, current and future.
document.addEventListener('pointerdown', e => {
  const btn = e.target instanceof Element ? e.target.closest('.btn-primary, .opt-btn') : null
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const r = document.createElement('span')
  r.className = 'ripple'
  r.style.left = (e.clientX - rect.left) + 'px'
  r.style.top = (e.clientY - rect.top) + 'px'
  btn.appendChild(r)
  setTimeout(() => r.remove(), 550)
})

async function bootFlow() {
  await ensureDefaultAccount()

  // A shared/challenge quiz link takes priority — the recipient can play
  // without going through onboarding or needing an account of their own.
  if (/[#&]quiz=/.test(location.hash)) {
    state.screen = 'shared'
    renderScreen('shared')
    return
  }

  const accounts = await listAccounts()
  const savedId = localStorage.getItem('quizard-active-account')

  const onlyDefault = accounts.length === 1 && !(await accountHasData(accounts[0].id))
  state.accountsExist = !onlyDefault

  // Repeat launches get the short splash; first launch gets the full show.
  state.shortIntro = !!settings.onboarded

  const landing = resolveLanding(accounts, savedId, onlyDefault)

  // "Don't show the intro" setting — go straight to the landing screen.
  if (settings.skipIntro) {
    state.screen = landing.screen
    state.accountFlow = landing.accountFlow || null
    if (landing.askResume) state.pendingResumeAsk = true
    renderScreen(landing.screen)
    if (landing.screen === 'library') setTimeout(() => consumePendingReview(ctx), 2000)
    return
  }

  // Every cold start opens with the magical welcome splash, which then
  // hands off to the screen the user would have landed on.
  state.afterIntro = landing.screen
  state.accountFlow = landing.accountFlow || null
  state.pendingResumeAsk = !!landing.askResume
  state.screen = 'welcome'
  renderScreen('welcome')
}

// Work out where the app should land after the welcome intro, performing
// any account setup the old boot path used to do before rendering.
// The original onboarding slides always play after the splash; only a
// PIN-locked or multi-profile hand-off routes to the accounts screen first.
function resolveLanding(accounts, savedId, onlyDefault) {
  const saved = savedId ? accounts.find(a => a.id === savedId) : null
  // Full onboarding slides play once (first launch / Replay introduction).
  // Returning users get splash → library; skip-intro setting drops the splash.
  const settled = !onlyDefault && (saved || accounts.length > 1 || accounts[0]?.pinHash)
  let home = (!settings.onboarded || !settled) ? 'onboarding' : 'library'

  // Per-account tutorial: a profile created but not yet taken through the
  // tutorial resumes it on the next launch (=== false is explicit "not done";
  // undefined = legacy account, leave them where they are).
  const needsTutorial = aid => settings.tutorialDoneAccounts?.[aid] === false

  if (onlyDefault || (!saved && accounts.length === 1 && !accounts[0].pinHash)) {
    setActiveAccount(accounts[0].id)
    state.account = accounts[0]
    window.__quizAccountId = accounts[0].id
    const askResume = !!detectResumeBanner(accounts[0].id)
    if (home === 'library' && needsTutorial(accounts[0].id)) home = 'tutorial'
    return { screen: home, askResume }
  }
  if (!saved) {
    return { screen: 'accounts', accountFlow: { mode: 'picker' } }
  }
  if (saved.pinHash) {
    return { screen: 'accounts', accountFlow: { mode: 'lock', accountId: saved.id } }
  }
  setActiveAccount(saved.id)
  state.account = saved
  window.__quizAccountId = saved.id
  const askResume = !!detectResumeBanner(saved.id)
  if (home === 'library' && needsTutorial(saved.id)) home = 'tutorial'
  return { screen: home, askResume }
}

bootFlow()
