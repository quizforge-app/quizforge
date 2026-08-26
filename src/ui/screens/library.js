import { listDocs, deleteDoc, loadSettings, saveSettings, deriveFolders, deriveTags } from '../../lib/storage.js'
import { icon } from '../icons.js'
import { typeLabel, scorePill, fmtDate, esc } from '../helpers.js'
import { emptyLibraryArt } from '../art.js'

const SORTS = [
  { id: 'recent', label: 'Recent' },
  { id: 'name', label: 'A–Z' },
  { id: 'score', label: 'Best score' }
]

export async function render(root, ctx) {
  const docs = await listDocs()
  ctx.state.docs = docs

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

  let html = `
    <header class="app-header">
      <div class="brand"><span class="mark">${icon('logo')}</span>QuizForge</div>
      <div style="display:flex;gap:2px;align-items:center">
        <button class="avatar-chip" id="account-btn" data-tooltip="Switch account — ${esc(ctx.state.account?.name || 'account')}" style="background:${ctx.state.account?.color || '#475569'}">${esc((ctx.state.account?.name || '?').charAt(0).toUpperCase())}</button>
        <button class="icon-btn" id="settings-btn" aria-label="Settings" data-tooltip="Settings & backup">${icon('gear')}</button>
        <button class="icon-btn" id="theme-btn" aria-label="Toggle theme" data-tooltip="${ctx.state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${ctx.state.theme === 'dark' ? icon('sun') : icon('moon')}</button>
      </div>
    </header>
    <div class="screen${docs.length ? '' : ' screen-center'}">
  `

  if (docs.length) {
    html += `
      <div class="hero">
        <h1>Your library</h1>
        <p>${docs.length} document${docs.length === 1 ? '' : 's'} · ${totalAttempts} quiz${totalAttempts === 1 ? '' : 'zes'} taken${avg != null ? ` · ${avg}% average best score` : ''}</p>
      </div>
      <div class="stats-row">
        <div class="stat"><div class="num">${docs.length}</div><div class="lbl">Documents</div></div>
        <div class="stat"><div class="num">${totalAttempts}</div><div class="lbl">Quizzes</div></div>
        <div class="stat"><div class="num">${avg != null ? avg + '%' : '—'}</div><div class="lbl">Best Avg</div></div>
      </div>
      <div class="lib-tools">
        <input class="text-input" id="lib-search" type="search" placeholder="Search documents…" autocomplete="off" />
        <div class="seg" id="lib-sort">
          ${SORTS.map(s => `<button data-sort="${s.id}" class="${sort === s.id ? 'on' : ''}" data-tooltip="Sort by ${s.label.toLowerCase()}">${s.label}</button>`).join('')}
        </div>
      </div>
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

  if (!docs.length) {
    html += `
      <div class="empty-state">
        <div class="empty-illust">${emptyLibraryArt}</div>
        <h3>No documents yet</h3>
        <p>Add a PDF, Word, PowerPoint or plain text file and turn it into instant practice quizzes — right on your device.</p>
        <button class="btn btn-primary" id="empty-import" style="max-width:230px;margin:0 auto">${icon('plus')} Add Document</button>
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
      <div class="doc-card" data-id="${doc.id}" data-tooltip="Open document details">
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
          <button class="icon-btn doc-del-btn" data-id="${doc.id}" aria-label="Delete" data-tooltip="Delete document">${icon('trash')}</button>
        </div>
      </div>`
    }).join('')
    bindList()
  }

  function bindList() {
    listEl.querySelectorAll('.doc-card').forEach(card =>
      card.addEventListener('click', e => {
        if (!(e.target instanceof Element) || e.target.closest('button')) return
        ctx.go('docdetail', card.dataset.id)
      })
    )
    listEl.querySelectorAll('.doc-quiz-btn').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation()
        ctx.go('setup', btn.dataset.id)
      })
    )
    listEl.querySelectorAll('.doc-del-btn').forEach(btn =>
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const doc = ctx.state.docs.find(d => d.id === btn.dataset.id)
        if (!confirm(`Delete "${doc.name}" and all its quiz history?\n\nThis cannot be undone.`)) return
        await deleteDoc(btn.dataset.id)
        ctx.toast('Document deleted')
        ctx.refresh()
      })
    )
  }

  const searchEl = root.querySelector('#lib-search')
  searchEl?.addEventListener('input', () => {
    query = searchEl.value.trim()
    renderList()
  })

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
