import { listDocs, deleteDoc, loadSettings, saveSettings, deriveFolders, deriveTags, listDecks, deleteDeck, listExams } from '../../lib/storage.js'
import { countdownLabel } from '../../lib/exam.js'
import { icon } from '../icons.js'
import { typeLabel, scorePill, fmtDate, esc, statsRow, sectionTitle, btn } from '../helpers.js'
import { emptyLibraryArt } from '../art.js'
import { confirmModal } from '../confirmModal.js'

const SORTS = [
  { id: 'recent', label: 'Recent' },
  { id: 'name', label: 'A–Z' },
  { id: 'score', label: 'Best score' }
]

export async function render(root, ctx) {
  const docs = await listDocs()
  ctx.state.docs = docs
  const decks = await listDecks().catch(() => [])
  const exams = await listExams().catch(() => [])
  const nextExam = exams.find(e => (e.status || 'upcoming') === 'upcoming')

  const settings = loadSettings()
  let query = ''
  let sort = settings.sortDocs || 'recent'
  let folderFilter = null
  let tagFilter = null

  const folders = deriveFolders(docs)
  const tags = deriveTags(docs)

  const totalAttempts = docs.reduce((s, d) => s + (d.attempts || 0), 0)
  const scored = docs.filter(d => d.bestScore != null)
  const avg = scored.length ? Math.round(scored.reduce((s, d) => s + d.bestScore, 0) / scored.length) : null
  // The stats row below already shows documents/quizzes/score, so the hero
  // subtitle stays qualitative — no repeated numbers.
  let subtitle
  if (!totalAttempts) subtitle = 'Pick a document and forge your first quiz.'
  else if (avg != null && avg >= 80) subtitle = 'Mastery within reach — keep the streak alive.'
  else if (avg != null && avg >= 50) subtitle = 'Steady progress. Review your weak spots to level up.'
  else if (avg != null) subtitle = 'Every miss banks a lesson — review and try again.'
  else subtitle = 'Your quizzes are waiting.'

  let html = `
    <header class="app-header">
      <div class="brand"><span class="mark">${icon('logo')}</span>Quizard</div>
      <div style="display:flex;gap:2px;align-items:center">
        <button class="avatar-chip" id="account-btn" data-tooltip="Switch account — ${esc(ctx.state.account?.name || 'account')}" style="background:${ctx.state.account?.color || '#475569'}">${esc((ctx.state.account?.name || '?').charAt(0).toUpperCase())}</button>
        <button class="icon-btn" id="settings-btn" aria-label="Settings" data-tooltip="Settings & backup">${icon('gear')}</button>
        <button class="icon-btn" id="theme-btn" aria-label="Toggle theme" data-tooltip="${ctx.state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${ctx.state.theme === 'dark' ? icon('sun') : icon('moon')}</button>
      </div>
    </header>
    <div class="screen${docs.length ? '' : ' screen-center'}">
      ${nextExam ? `
      <button class="exam-card exam-card-lib" data-exam="${nextExam.id}">
        <span class="exam-ico">${icon('fileText')}</span>
        <span class="exam-card-main">
          <span class="exam-card-title">${esc(nextExam.title)}</span>
          <span class="exam-card-sub">${nextExam.docIds?.length || 0} files · ${nextExam.topics?.length || 0} topics${countdownLabel(nextExam.examDate) ? ' · ' + countdownLabel(nextExam.examDate) : ''}</span>
        </span>
        <span class="exam-card-cta">Start prep</span>
      </button>` : ''}
  `

  if (docs.length) {
    html += `
      <div class="hero lib-hero">
        <img class="lib-wiz" src="/wizard/wizard-studying.jpg" alt="" />
        <div>
          <h1>Your library</h1>
          <p>${subtitle}</p>
        </div>
      </div>
      ${statsRow([
        { value: docs.length, label: 'Documents' },
        { value: totalAttempts, label: 'Quizzes' },
        { value: avg != null ? avg + '%' : '—', label: 'Best Avg' }
      ])}
      <div class="lib-tools">
        <input class="text-input" id="lib-search" type="search" placeholder="Search documents…" aria-label="Search documents" autocomplete="off" />
        <div class="seg" id="lib-sort">
          ${SORTS.map(s => `<button data-sort="${s.id}" class="${sort === s.id ? 'on' : ''}" data-tooltip="Sort by ${s.label.toLowerCase()}">${s.label}</button>`).join('')}
        </div>
      </div>
      <button class="exam-entry" id="exams-open-btn" data-tooltip="Prepare for an upcoming exam">
        <span class="exam-ico">${icon('fileText')}</span>
        <span>Exam prep</span>
        ${icon('chevronRight')}
      </button>
      ${(folders.length || tags.length) ? `
      <div class="lib-filters">
        ${folders.length ? `
        <div class="filter-row">
          <span class="filter-label">${icon('folder')}</span>
          <div class="filter-chips" id="folder-chips">
            <button class="fchip ${!folderFilter ? 'on' : ''}" data-folder="">All</button>
            ${folders.map(f => `<button class="fchip ${folderFilter === f ? 'on' : ''}" data-folder="${esc(f)}">${esc(f)}</button>`).join('')}
          </div>
        </div>` : ''}
        ${tags.length ? `
        <div class="filter-row">
          <span class="filter-label">${icon('tag')}</span>
          <div class="filter-chips" id="tag-chips">
            <button class="fchip ${!tagFilter ? 'on' : ''}" data-tag="">All</button>
            ${tags.map(t => `<button class="fchip ${tagFilter === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
          </div>
        </div>` : ''}
      </div>` : ''}
    `
  }

  html += `<div class="doc-list" id="doc-list"></div>`

  if (decks.length) {
    html += `
      ${sectionTitle('Saved quizzes')}
      <p class="faint" style="font-size:12px;margin:0 4px 10px">Quizzes you saved from shared links — play them anytime, no link needed.</p>
      <div class="doc-list" id="deck-list">
        ${decks.map(dk => `
          <div class="doc-card deck-card stagger" data-deck="${dk.id}" data-tooltip="Open saved quiz">
            <div class="doc-icon saved">${icon('layers')}</div>
            <div class="doc-info">
              <div class="doc-name">${esc(dk.name)}</div>
              <div class="doc-meta">
                <span>${dk.questions.length} questions</span>
                <span>·</span>
                <span>${fmtDate(dk.updatedAt || dk.createdAt)}</span>
                ${dk.source ? `<span class="doc-folder">${esc(dk.source)}</span>` : ''}
              </div>
            </div>
            <div class="doc-actions">
              <button class="btn btn-primary deck-play" data-deck="${dk.id}" data-tooltip="Play this saved quiz">${icon('play')} Play</button>
              <button class="icon-btn deck-del" data-deck="${dk.id}" aria-label="Delete" data-tooltip="Delete saved quiz">${icon('trash')}</button>
            </div>
          </div>`).join('')}
      </div>`
  }

  if (!docs.length) {
    html += `
      <div class="empty-state">
        <div class="empty-illust">${emptyLibraryArt}</div>
        <h3>No documents yet</h3>
        <p>Add a PDF, Word, PowerPoint or plain text file and turn it into instant practice quizzes — right on your device.</p>
        <button class="btn btn-primary" id="empty-import" style="max-width:230px;margin:0 auto">${icon('plus')} Add Document</button>
        <button class="btn exam-entry" id="exams-open-btn" style="max-width:230px;margin:10px auto 0">
          <span class="exam-ico">${icon('fileText')}</span>
          <span>Exam prep</span>
        </button>
      </div>`
  }

  html += `</div>`

  root.innerHTML = html

  root.querySelector('#theme-btn')?.addEventListener('click', () => ctx.toggleTheme())
  root.querySelector('#settings-btn')?.addEventListener('click', () => ctx.go('settings'))
  root.querySelector('#account-btn')?.addEventListener('click', () => {
    ctx.state.accountFlow = { mode: 'picker' }
    ctx.go('accounts')
  })
  root.querySelector('#empty-import')?.addEventListener('click', () => ctx.go('import'))

  const listEl = root.querySelector('#doc-list')

  function visibleDocs() {
    let arr = docs.slice()
    if (folderFilter) arr = arr.filter(d => d.folder === folderFilter)
    if (tagFilter) arr = arr.filter(d => (d.tags || []).includes(tagFilter))
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter(d => d.name.toLowerCase().includes(q))
    }
    if (sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'score') arr.sort((a, b) => (b.bestScore ?? -1) - (a.bestScore ?? -1))
    else arr.sort((a, b) => b.createdAt - a.createdAt)
    return arr
  }

  function renderList() {
    const arr = visibleDocs()
    if (!arr.length) {
      listEl.innerHTML = docs.length
        ? `<p class="center faint" style="padding:32px 0;font-size:13px">No documents match “${esc(query)}”.</p>`
        : ''
      return
    }
    listEl.innerHTML = arr.map(doc => {
      const best = doc.bestScore != null
        ? `<span class="score-pill ${scorePill(doc.bestScore)}">${doc.bestScore}%</span>`
        : ''
      return `
      <div class="doc-card stagger" data-id="${doc.id}" data-tooltip="Open document details">
        <div class="doc-icon ${doc.type}">${icon('fileText')}</div>
        <div class="doc-info">
          <div class="doc-name">${esc(doc.name)}</div>
          <div class="doc-meta">
            <span>${typeLabel(doc.type)}</span>·<span>${doc.wordCount.toLocaleString()} words</span>·<span>${fmtDate(doc.createdAt)}</span>
            ${doc.folder ? `<span class="doc-folder">${icon('folder')} ${esc(doc.folder)}</span>` : ''}
            ${best}
          </div>
        </div>
        <div class="doc-actions">
          <button class="btn btn-primary doc-quiz-btn" data-id="${doc.id}" data-tooltip="Create a quiz from this document">
            ${icon('play')} Quiz
          </button>
          <button class="btn btn-secondary doc-review-btn" data-id="${doc.id}" data-tooltip="Read this document as a study reviewer">
            ${icon('book')} Reviewer
          </button>
        </div>
      </div>`
    }).join('')
    ctx.stagger(listEl, '.stagger')
  }

  // Single delegated click handler on the list (added once per render; the list
  // element is recreated by root.innerHTML so no stale listeners accumulate).
  listEl.addEventListener('click', async e => {
    const del = e.target.closest('.doc-del-btn')
    if (del) {
      const doc = ctx.state.docs.find(d => d.id === del.dataset.id)
      if (!doc) return
      if (!await confirmModal(`Delete "${doc.name}"?`, `All quiz history for <b>${esc(doc.name)}</b> will be removed.`)) return
      await deleteDoc(del.dataset.id)
      ctx.toast('Document deleted')
      ctx.refresh()
      return
    }
    const quiz = e.target.closest('.doc-quiz-btn')
    if (quiz) { ctx.go('setup', quiz.dataset.id); return }
    const review = e.target.closest('.doc-review-btn')
    if (review) { ctx.go('reviewer', review.dataset.id); return }
    const card = e.target.closest('.doc-card')
    if (card) ctx.go('docdetail', card.dataset.id)
  })

  const deckList = root.querySelector('#deck-list')
  if (deckList) {
    deckList.addEventListener('click', async e => {
      const del = e.target.closest('.deck-del')
      if (del) {
        if (!await confirmModal('Delete saved quiz?', 'This saved quiz and its results will be removed.')) return
        await deleteDeck(del.dataset.deck).catch(() => {})
        ctx.toast('Saved quiz deleted')
        ctx.refresh()
        return
      }
      const play = e.target.closest('.deck-play')
      if (play) {
        const deck = decks.find(d => d.id === play.dataset.deck)
        if (!deck) return
        ctx.state.sharedQuiz = { title: deck.name, questions: deck.questions, cfg: deck.cfg || { timerSec: 0 } }
        ctx.go('quiz')
        return
      }
      const dcard = e.target.closest('.deck-card')
      if (dcard) {
        const deck = decks.find(d => d.id === dcard.dataset.deck)
        if (!deck) return
        ctx.state.sharedQuiz = { title: deck.name, questions: deck.questions, cfg: deck.cfg || { timerSec: 0 } }
        ctx.go('quiz')
      }
    })
  }

  const examCardEl = root.querySelector('.exam-card')
  examCardEl?.addEventListener('click', () => ctx.go('exams', examCardEl.dataset.exam))
  root.querySelector('#exams-open-btn')?.addEventListener('click', () => ctx.go('exams'))

  const searchEl = root.querySelector('#lib-search')
  if (searchEl) {
    let t
    searchEl.addEventListener('input', () => {
      clearTimeout(t)
      t = setTimeout(() => { query = searchEl.value.trim(); renderList() }, 120)
    })
  }

  root.querySelectorAll('#lib-sort button').forEach(b =>
    b.addEventListener('click', () => {
      sort = b.dataset.sort
      saveSettings({ sortDocs: sort })
      root.querySelectorAll('#lib-sort button').forEach(x => x.classList.toggle('on', x === b))
      renderList()
    })
  )

  const folderChips = root.querySelector('#folder-chips')
  if (folderChips) {
    folderChips.addEventListener('click', e => {
      const btn = e.target.closest('.fchip')
      if (!btn) return
      folderFilter = btn.dataset.folder || null
      folderChips.querySelectorAll('.fchip').forEach(x => x.classList.toggle('on', x === btn))
      renderList()
    })
  }
  const tagChips = root.querySelector('#tag-chips')
  if (tagChips) {
    tagChips.addEventListener('click', e => {
      const btn = e.target.closest('.fchip')
      if (!btn) return
      tagFilter = btn.dataset.tag || null
      tagChips.querySelectorAll('.fchip').forEach(x => x.classList.toggle('on', x === btn))
      renderList()
    })
  }

  renderList()

  const resume = ctx.state.resumeBanner
  if (resume && listEl) {
    const banner = document.createElement('div')
    banner.className = 'resume-banner'
    banner.innerHTML = `
      <div class="rb-icon">${icon('play')}</div>
      <div class="rb-main">
        <div class="rb-title">Quiz in progress</div>
        <div class="rb-sub">${esc(resume.docName)} · ${resume.index}/${resume.total} answered</div>
      </div>
      <button class="btn btn-primary rb-btn">Resume</button>
      <button class="icon-btn rb-dismiss" aria-label="Dismiss" data-tooltip="Discard saved session">${icon('x')}</button>
    `
    const screenEl = root.querySelector('.screen')
    screenEl.insertBefore(banner, screenEl.firstChild)
    banner.querySelector('.rb-btn').addEventListener('click', () => {
      ctx.requestResume()
      ctx.go('quiz')
    })
    banner.querySelector('.rb-dismiss').addEventListener('click', () => {
      ctx.clearResume()
      banner.remove()
    })
  }
}
