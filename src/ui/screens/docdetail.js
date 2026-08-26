import { getDoc, updateDoc, deleteDoc, listDocs, deriveFolders } from '../../lib/storage.js'
import { icon } from '../icons.js'
import { esc, typeLabel, fmtDate } from '../helpers.js'

export async function render(root, ctx) {
  const doc = await getDoc(ctx.state.currentDocId)
  if (!doc) { ctx.go('library'); return }

  const topics = Array.isArray(doc.topics) ? doc.topics : []
  const folders = deriveFolders(await listDocs()).filter(f => f !== doc.folder)

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to library">${icon('chevronLeft')}</button>
      <h2>Document</h2>
      <div class="spacer"></div>
    </header>
    <div class="screen">
      <div class="setup-hero">
        <div class="doc-icon ${doc.type}">${icon('fileText')}</div>
        <div style="min-width:0;flex:1">
          <div class="doc-name">${esc(doc.name)}</div>
          <div class="doc-meta">${typeLabel(doc.type)} · ${doc.wordCount.toLocaleString()} words · ${fmtDate(doc.createdAt)}</div>
        </div>
        <button class="icon-btn" id="rename-btn" data-tooltip="Rename document">${icon('fileText')}</button>
      </div>

      <div class="stats-row">
        <div class="stat"><div class="num">${doc.attempts || 0}</div><div class="lbl">Attempts</div></div>
        <div class="stat"><div class="num">${doc.bestScore != null ? doc.bestScore + '%' : '—'}</div><div class="lbl">Best Score</div></div>
        <div class="stat"><div class="num">${topics.length}</div><div class="lbl">Topics</div></div>
      </div>

      <div class="section-title">Rename</div>
      <div class="rename-row">
        <input class="text-input" id="name-input" value="${esc(doc.name)}" maxlength="80" />
        <button class="btn btn-secondary" id="save-name-btn" data-tooltip="Save new name">${icon('check')} Save</button>
      </div>

      <div class="section-title">Organize</div>
      <label class="field-label">${icon('folder')} Folder</label>
      <input class="text-input" id="folder-input" list="doc-folder-list" value="${esc(doc.folder || '')}" maxlength="40" placeholder="None" autocomplete="off" />
      <datalist id="doc-folder-list">${folders.map(f => `<option value="${esc(f)}"></option>`).join('')}</datalist>
      <label class="field-label" style="margin-top:14px">${icon('tag')} Tags <span style="font-weight:500;color:var(--text-faint)">(comma separated)</span></label>
      <input class="text-input" id="tags-input" value="${esc((doc.tags || []).join(', '))}" maxlength="120" placeholder="exam, chapter 3" autocomplete="off" />
      <button class="btn btn-secondary" id="save-org-btn" style="margin-top:12px;width:100%">${icon('check')} Save organization</button>

      ${topics.length ? `
      <div class="section-title">Detected topics</div>
      <div class="chip-row">
        ${topics.map(t => `<span class="chip">${esc(t.title)} <span class="chip-count">${t.count}</span></span>`).join('')}
      </div>` : ''}

      <div class="section-title">Extracted text</div>
      <div class="card">
        <div class="preview-box" id="text-preview" style="max-height:120px">${esc(doc.text.slice(0, 400))}${doc.text.length > 400 ? '…' : ''}</div>
        ${doc.text.length > 400 ? `<button class="btn btn-secondary" id="toggle-full-btn" style="margin-top:10px;width:100%">Show full text (${doc.wordCount.toLocaleString()} words)</button>` : ''}
      </div>

      <button class="btn btn-secondary" id="reviewer-btn" style="margin-top:20px;width:100%" data-tooltip="Read this document as a study reviewer">${icon('book')} Open Reviewer</button>
      <button class="btn btn-secondary" id="flashcards-btn" style="margin-top:10px;width:100%" data-tooltip="Study key terms as flip cards">${icon('shuffle')} Flashcards</button>
      <button class="btn btn-primary" id="quiz-btn" style="margin-top:10px">${icon('play')} Create Quiz</button>
      <button class="btn btn-danger-ghost" id="delete-btn" style="margin-top:10px;width:100%">${icon('trash')} Delete document</button>
    </div>
  `

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('library'))

  const nameInput = root.querySelector('#name-input')
  root.querySelector('#save-name-btn').addEventListener('click', async () => {
    const name = nameInput.value.trim()
    if (!name) { ctx.toast('Name cannot be empty', true); return }
    if (name === doc.name) { ctx.toast('Name unchanged'); return }
    await updateDoc(doc.id, { name })
    ctx.toast('Renamed ✓')
    ctx.refresh()
  })

  root.querySelector('#save-org-btn').addEventListener('click', async () => {
    const folder = root.querySelector('#folder-input').value.trim() || null
    const tags = root.querySelector('#tags-input').value
      .split(',').map(t => t.trim()).filter(Boolean).slice(0, 12)
    await updateDoc(doc.id, { folder, tags })
    ctx.toast('Saved ✓')
    ctx.refresh()
  })

  const preview = root.querySelector('#text-preview')
  root.querySelector('#toggle-full-btn')?.addEventListener('click', e => {
    const expanded = preview.dataset.expanded === '1'
    if (expanded) {
      preview.textContent = doc.text.slice(0, 400) + '…'
      preview.style.maxHeight = '120px'
      e.currentTarget.textContent = `Show full text (${doc.wordCount.toLocaleString()} words)`
      preview.dataset.expanded = '0'
    } else {
      preview.textContent = doc.text
      preview.style.maxHeight = '420px'
      e.currentTarget.textContent = 'Show less'
      preview.dataset.expanded = '1'
    }
  })

  root.querySelector('#quiz-btn').addEventListener('click', () => ctx.go('setup', doc.id))
  root.querySelector('#reviewer-btn').addEventListener('click', () => ctx.go('reviewer', doc.id))
  root.querySelector('#flashcards-btn').addEventListener('click', () => ctx.go('flashcards', doc.id))

  root.querySelector('#delete-btn').addEventListener('click', async () => {
    if (!confirm(`Delete "${doc.name}" and all its quiz history?\n\nThis cannot be undone.`)) return
    await deleteDoc(doc.id)
    ctx.toast('Document deleted')
    ctx.go('library')
  })

  root.querySelector('#rename-btn').addEventListener('click', () => {
    nameInput.focus()
    nameInput.select()
    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
