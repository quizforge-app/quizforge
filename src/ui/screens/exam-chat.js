// Exam-prep wizard chat: the student pastes the announcement or describes the
// exam, the wizard checks their library, guides uploads until every announced
// topic is covered, then the exam is created from all matched files.

import { getDoc, listDocs, saveDoc, saveExam } from '../../lib/storage.js'
import { assetUrl } from '../../lib/assets.js'
import { extractText } from '../../lib/extract/index.js'
import { detectTopics } from '../../lib/topics.js'
import { buildDigest, examChat } from '../../lib/llm/exam-ai.js'
import { icon } from '../icons.js'
import { esc } from '../helpers.js'

let currentCleanup = null
export function unmount() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null }
}

export async function render(root, ctx) {
  if (currentCleanup) currentCleanup()

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to exams">${icon('chevronLeft')}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700">Exam Wizard</div>
        <div style="font-size:11.5px;color:var(--text-faint)">Paste the announcement · add your files · get ready</div>
      </div>
    </header>
    <div class="screen ec-screen">
      <div id="coverage-panel" class="ec-coverage hidden"></div>
      <div id="chat-log" class="ec-log"></div>
      <div class="ec-input-row">
        <button class="icon-btn ec-attach" id="ec-attach" data-tooltip="Upload a file for this exam">${icon('plus')}</button>
        <input type="file" id="ec-file" accept=".pdf,.docx,.pptx,.txt,.md" hidden />
        <input type="text" id="ec-text" class="text-input" placeholder="Tell the wizard about your exam…" aria-label="Message the exam wizard" autocomplete="off" />
        <button class="icon-btn ec-send" id="ec-send" aria-label="Send" data-tooltip="Send">${icon('chevronRight')}</button>
      </div>
      <button class="btn btn-primary ec-create hidden" id="ec-create">${icon('check')} Create exam</button>
    </div>
  `

  const log = root.querySelector('#chat-log')
  const input = root.querySelector('#ec-text')
  const fileInput = root.querySelector('#ec-file')
  const createBtn = root.querySelector('#ec-create')
  const coverageEl = root.querySelector('#coverage-panel')
  const sendBtn = root.querySelector('#ec-send')

  const conversation = [] // { role: 'user'|'wizard', text }
  let draft = { examTitle: null, examDate: null, topics: [], matchedDocIds: [], missingTopics: [], readyToCreate: false }
  let busy = false
  let opened = false

  function bubble(role, text) {
    conversation.push({ role, text })
    const row = document.createElement('div')
    row.className = 'ec-msg ' + (role === 'user' ? 'ec-user' : 'ec-wiz')
    row.innerHTML = role === 'user'
      ? `<div class="ec-bubble">${esc(text)}</div>`
      : `<img class="ec-avatar" src="${assetUrl('wizard/wizard-thinking.jpg')}" alt="" /><div class="ec-bubble">${esc(text)}</div>`
    log.appendChild(row)
    log.scrollTop = log.scrollHeight
    return row
  }

  function typing() {
    const row = document.createElement('div')
    row.className = 'ec-msg ec-wiz'
    row.innerHTML = `<img class="ec-avatar" src="${assetUrl('wizard/wizard-thinking.jpg')}" alt="" />
      <div class="ec-bubble ec-typing"><span></span><span></span><span></span></div>`
    log.appendChild(row)
    log.scrollTop = log.scrollHeight
    return row
  }

  function renderCoverage() {
    const topics = draft.topics.length
      ? draft.topics
      : (draft.missingTopics.map(t => ({ title: t, missing: true })))
    if (!topics.length) { coverageEl.classList.add('hidden'); return }
    coverageEl.classList.remove('hidden')
    const matched = new Set(draft.matchedDocIds)
    coverageEl.innerHTML = `
      <div class="ec-cov-head">Exam coverage</div>
      ${topics.map(t => {
        const covered = !t.missing && (t.docId ? matched.has(t.docId) : matched.size > 0)
        return `<div class="ec-cov-row ${covered ? 'ok' : 'missing'}">
          <span class="ec-cov-ico">${covered ? '✓' : '⚠'}</span>
          <span>${esc(t.title || t)}</span>
        </div>`
      }).join('')}
      ${draft.missingTopics.length ? `<div class="ec-cov-missing">Missing files: ${esc(draft.missingTopics.join(', '))}</div>` : ''}
    `
    createBtn.classList.toggle('hidden', !draft.readyToCreate)
  }

  async function askWizard(userText) {
    bubble('user', userText)
    const t = typing()
    busy = true
    try {
      const docs = await listDocs()
      const digest = []
      for (const m of docs.slice(0, 40)) {
        const full = await getDoc(m.id).catch(() => null)
        if (full?.text) digest.push(...buildDigest([full]))
      }
      const state = await examChat(conversation, digest, draft)
      // merge wizard state into the draft (accumulative)
      draft = {
        examTitle: state.examTitle || draft.examTitle,
        examDate: state.examDate || draft.examDate,
        topics: mergeTopics(draft.topics, state.topics),
        matchedDocIds: [...new Set([...draft.matchedDocIds, ...state.matchedDocIds])],
        missingTopics: state.missingTopics,
        readyToCreate: state.readyToCreate
      }
      t.remove()
      bubble('wizard', state.reply)
    } catch (err) {
      t.remove()
      bubble('wizard', 'Something interfered with my crystal ball — try sending that again.')
    }
    renderCoverage()
    busy = false
  }

  function mergeTopics(oldTopics, newTopics) {
    const out = [...oldTopics]
    for (const t of newTopics) {
      if (!out.some(o => o.title.toLowerCase() === t.title.toLowerCase())) out.push(t)
    }
    return out
  }

  async function send() {
    const text = input.value.trim()
    if (!text || busy) return
    input.value = ''
    await askWizard(text)
  }

  sendBtn.addEventListener('click', send)
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send() } })

  // in-chat upload → same local extraction pipeline as Import
  root.querySelector('#ec-attach').addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]
    fileInput.value = ''
    if (!file || busy) return
    busy = true
    const t = typing()
    t.querySelector('.ec-bubble').textContent = `Reading ${file.name}…`
    try {
      const res = await extractText(file)
      const { topics } = detectTopics(res.text)
      await saveDoc({ name: file.name, type: res.type, text: res.text, topics: topics.map(tp => tp.title) })
      t.remove()
      bubble('user', `📎 Uploaded ${file.name}`)
      digestChanged()
    } catch (err) {
      t.remove()
      bubble('wizard', `I could not read ${file.name} — PDF, DOCX, PPTX, TXT or MD only.`)
    }
    busy = false
  })

  async function digestChanged() {
    // re-run the wizard check with an upload notice so coverage updates
    await askWizard(`I just uploaded new files for this exam — please re-check what's covered.`)
  }

  createBtn.addEventListener('click', async () => {
    if (!draft.readyToCreate || busy) return
    const exam = {
      id: 'exam-' + Date.now().toString(36),
      title: draft.examTitle || 'Exam Prep',
      examDate: draft.examDate ? new Date(draft.examDate + 'T23:59:59').getTime() : undefined,
      createdAt: Date.now(),
      announcement: conversation.find(m => m.role === 'user')?.text || '',
      docIds: draft.matchedDocIds,
      topics: draft.topics,
      status: 'upcoming'
    }
    await saveExam(exam)
    ctx.toast(`Exam "${exam.title}" created ✓`)
    ctx.state.examDraft = null
    ctx.go('exams', exam.id)
  })

  // opening move: the wizard greets and asks about the exam
  ;(async () => {
    if (opened) return
    opened = true
    const t = typing()
    await new Promise(r => setTimeout(r, 500))
    t.remove()
    bubble('wizard', 'Ah, an exam approaches… Tell me what it covers — paste your teacher\'s announcement or just describe it. Then we\'ll gather every file you need.')
  })()

  currentCleanup = () => {}
}
