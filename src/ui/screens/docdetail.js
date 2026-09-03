import { getDoc, updateDoc, deleteDoc, listDocs, deriveFolders } from '../../lib/storage.js'
import { hasApiKey } from '../../lib/llm/gemini.js'
import { ensureVisualAnalysis } from '../../lib/llm/quiz-ai.js'
import { icon } from '../icons.js'
import { esc, typeLabel, fmtDate, statsRow, chipRow, chip, sectionTitle } from '../helpers.js'
import { confirmModal } from '../confirmModal.js'

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

      ${statsRow([
        { value: doc.attempts || 0, label: 'Attempts' },
        { value: doc.bestScore != null ? doc.bestScore + '%' : '—', label: 'Best Score' },
        { value: topics.length, label: 'Topics' }
      ])}

      ${sectionTitle('Rename')}
      <div class="rename-row">
        <input class="text-input" id="name-input" value="${esc(doc.name)}" aria-label="Document name" maxlength="80" />
        <button class="btn btn-secondary" id="save-name-btn" data-tooltip="Save new name">${icon('check')} Save</button>
      </div>

      ${sectionTitle('Organize')}
      <label class="field-label" for="folder-input">${icon('folder')} Folder</label>
      <input class="text-input" id="folder-input" list="doc-folder-list" value="${esc(doc.folder || '')}" maxlength="40" placeholder="None" autocomplete="off" />
      <datalist id="doc-folder-list">${folders.map(f => `<option value="${esc(f)}"></option>`).join('')}</datalist>
      <label class="field-label" for="tags-input" style="margin-top:14px">${icon('tag')} Tags <span style="font-weight:500;color:var(--text-faint)">(comma separated)</span></label>
      <input class="text-input" id="tags-input" value="${esc((doc.tags || []).join(', '))}" maxlength="120" placeholder="exam, chapter 3" autocomplete="off" />
      <button class="btn btn-secondary" id="save-org-btn" style="margin-top:12px;width:100%">${icon('check')} Save organization</button>

      ${topics.length ? `
      ${sectionTitle('Detected topics')}
      ${chipRow(topics.map(t => chip(t.title, { count: t.count })))}` : ''}

      ${sectionTitle('Extracted text')}
      <div class="card">
        <div class="preview-box" id="text-preview" style="max-height:120px">${esc(doc.text.slice(0, 400))}${doc.text.length > 400 ? '…' : ''}</div>
        ${doc.text.length > 400 ? `<button class="btn btn-secondary" id="toggle-full-btn" style="margin-top:10px;width:100%">Show full text (${doc.wordCount.toLocaleString()} words)</button>` : ''}
        ${Array.isArray(doc.visualAnalysis) && doc.visualAnalysis.length ? `<p class="faint" style="font-size:12px;margin:10px 2px 0">${doc.visualAnalysis.length} visual${doc.visualAnalysis.length === 1 ? '' : 's'} analyzed (diagrams, code & charts cached for quizzes)</p>` : ''}
      </div>

      <button class="btn btn-secondary" id="reviewer-btn" style="margin-top:20px;width:100%" data-tooltip="Read this document as a study reviewer">${icon('book')} Open Reviewer</button>
      <button class="btn btn-secondary" id="analyze-btn" style="margin-top:10px;width:100%" data-tooltip="Have Gemini look at the pages, diagrams and code so quizzes can ask about the visuals">${icon('scan')} Analyze visuals</button>
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

  root.querySelector('#analyze-btn').addEventListener('click', async e => {
    const btn = e.currentTarget
    if (!hasApiKey()) { ctx.toast('Add a Gemini key in Settings to analyze visuals', true); return }
    btn.disabled = true
    const prev = btn.innerHTML
    btn.textContent = 'Analyzing…'
    try {
      const analysis = await ensureVisualAnalysis(doc)
      if (!analysis || !analysis.elements.length) ctx.toast('No diagrams, code or charts found')
      else ctx.toast(`Analyzed ${analysis.elements.length} visual${analysis.elements.length === 1 ? '' : 's'} ✓`)
      ctx.refresh()
    } catch {
      ctx.toast('Visual analysis failed', true)
    } finally {
      btn.disabled = false
      btn.innerHTML = prev
    }
  })
  root.querySelector('#flashcards-btn').addEventListener('click', () => ctx.go('flashcards', doc.id))

  root.querySelector('#delete-btn').addEventListener('click', async () => {
    if (!await confirmModal(`Delete "${doc.name}"?`, `All quiz history for <b>${esc(doc.name)}</b> will be removed.`)) return
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
