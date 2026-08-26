import './styles/base.css'
import './styles/components.css'
import './styles/screens.css'

import * as library from './ui/screens/library.js'
import * as history from './ui/screens/history.js'
import * as importScreen from './ui/screens/import.js'
import * as setup from './ui/screens/setup.js'
import * as quiz from './ui/screens/quiz.js'
import * as results from './ui/screens/results.js'
import * as settingsScreen from './ui/screens/settings.js'
import * as onboarding from './ui/screens/onboarding.js'
import * as docDetail from './ui/screens/docdetail.js'
import * as reviewerScreen from './ui/screens/reviewer.js'
import * as accountsScreen from './ui/screens/accounts.js'
import * as welcomeScreen from './ui/screens/welcome.js'
import * as flashcardsScreen from './ui/screens/flashcards.js'
import * as sharedScreen from './ui/screens/shared.js'
import { saveAttempt, loadSettings, saveSettings, ensureDefaultAccount, listAccounts, setActiveAccount, getAccount, accountHasData } from './lib/storage.js'
import { icon } from './ui/icons.js'
import { initTooltips } from './ui/tooltip.js'

// Service worker only for the installable web PWA. The Capacitor APK bundles
// assets locally (offline) and the SW throws on the capacitor:// origin, so
// skip it when building for Android (VITE_TARGET=capacitor).
if (import.meta.env.VITE_TARGET !== 'capacitor') {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
initTooltips()

const SCREENS = { library, history, import: importScreen, setup, quiz, results, settings: settingsScreen, onboarding, docdetail: docDetail, reviewer: reviewerScreen, accounts: accountsScreen, welcome: welcomeScreen, flashcards: flashcardsScreen, shared: sharedScreen }
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
  return `quizforge-active-quiz-${accountId || 'default'}`
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
      return
    }
  } catch { /* no saved session */ }
  state.resumeBanner = null
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
  renderScreen(state.screen)
}

function toast(msg, isError = false) {
  let el = document.querySelector('.toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.toggle('error', isError)
  requestAnimationFrame(() => el.classList.add('show'))
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 2600)
}

function getConfig(docId) {
  const stored = settings.configs?.[docId]
  return stored ? { ...defaultConfig(), ...stored } : defaultConfig()
}

function saveConfig(docId, cfg) {
  const s = loadSettings()
  s.configs = s.configs || {}
  s.configs[docId] = cfg
  localStorage.setItem('quizforge-settings', JSON.stringify(s))
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

let renderToken = 0

async function renderScreen(name) {
  const token = ++renderToken
  const Screen = SCREENS[name]
  if (!Screen) return

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
      await Screen.render(tempRoot, ctx)
      if (token !== renderToken) return

      app.querySelectorAll('[data-nav]').forEach(btn =>
        btn.addEventListener('click', () => go(btn.dataset.nav))
      )
    } else {
      const rootDiv = document.createElement('div')
      frag.appendChild(rootDiv)
      app.innerHTML = ''
      app.appendChild(frag)
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
  renderScreen(nav)
  window.scrollTo(0, 0)
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !['quiz'].includes(state.screen)) go('library')
})

const boot = document.getElementById('boot')
if (boot) boot.remove()

async function bootFlow() {
  await ensureDefaultAccount()

  // A shared/challenge quiz link takes priority — the recipient can play
  // without going through onboarding or needing an account of their own.
  if (/[#&]quiz=/.test(location.hash)) {
    state.screen = 'shared'
    renderScreen('shared')
    return
  }

  let accounts = await listAccounts()
  const savedId = localStorage.getItem('quizforge-active-account')

  const onlyDefault = accounts.length === 1 && !(await accountHasData(accounts[0].id))
  if (onlyDefault) {
    state.accountsExist = false
    state.screen = 'welcome'
    renderScreen('welcome')
    return
  }
  state.accountsExist = true

  const saved = savedId ? accounts.find(a => a.id === savedId) : null
  if (!saved && accounts.length === 1 && !accounts[0].pinHash) {
    setActiveAccount(accounts[0].id)
    state.account = accounts[0]
    window.__quizAccountId = accounts[0].id
    detectResumeBanner(accounts[0].id)
    const initial = settings.onboarded ? 'library' : 'onboarding'
    state.screen = initial
    renderScreen(initial)
    return
  }
  if (!saved) {
    state.screen = 'picker'
    renderScreen('picker')
    return
  }
  if (saved.pinHash) {
    state.accountFlow = { mode: 'lock', accountId: saved.id }
    state.screen = 'accounts'
    renderScreen('accounts')
    return
  }
  setActiveAccount(saved.id)
  state.account = saved
  window.__quizAccountId = saved.id
  detectResumeBanner(saved.id)
  const initial = settings.onboarded ? 'library' : 'onboarding'
  state.screen = initial
  renderScreen(initial)
}

bootFlow()
