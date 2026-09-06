// Exams screen: list of exam-prep sessions + detail view with ranked topics,
// matched files, practice quiz launcher, PDF export and delete.

import { getExam, listExams, deleteExam, getDoc, listDueCards, getWeakTerms } from '../../lib/storage.js'
import { buildExamQuiz, countdownLabel, rankExamTopics } from '../../lib/exam.js'
import { assetUrl } from '../../lib/assets.js'
import { exportExamPdf } from '../../lib/export.js'
import { icon } from '../icons.js'
import { esc, sectionTitle } from '../helpers.js'
import { confirmModal } from '../confirmModal.js'

let currentCleanup = null
export function unmount() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null }
}

export async function render(root, ctx) {
  if (currentCleanup) currentCleanup()
  const detailId = ctx.state.examDetailId
  if (detailId) return renderDetail(root, ctx, detailId)
  return renderList(root, ctx)
}

async function renderList(root, ctx) {
  const exams = await listExams()
  const upcoming = exams.filter(e => (e.status || 'upcoming') === 'upcoming')
  const past = exams.filter(e => (e.status || 'upcoming') !== 'upcoming')

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back">${icon('chevronLeft')}</button>
      <h2>Exams</h2>
      <button class="icon-btn" id="new-exam-btn" data-tooltip="New exam with the wizard">${icon('plus')}</button>
    </header>
    <div class="screen">
      ${upcoming.length ? sectionTitle('Upcoming') : ''}
      ${upcoming.map(e => examCard(e)).join('')}
      ${past.length ? sectionTitle('Past') + past.map(e => examCard(e, true)).join('') : ''}
      ${!exams.length ? `
        <div class="empty-state">
          <div class="ec-empty-wiz"><img src="${assetUrl('wizard/wizard-thinking.jpg')}" alt="" /></div>
          <h3>No exams yet</h3>
          <p>Tell the wizard about your next exam — paste the announcement, upload the files it asks for, and practice across all of them.</p>
        </div>` : ''}
      <button class="btn btn-primary" id="start-chat-btn" style="margin-top:18px;width:100%">${icon('sparkles')} New exam with the wizard</button>
    </div>
  `

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('library'))
  root.querySelector('#new-exam-btn').addEventListener('click', () => ctx.go('exam-chat'))
  root.querySelector('#start-chat-btn').addEventListener('click', () => ctx.go('exam-chat'))
  root.querySelectorAll('[data-exam]').forEach(card =>
    card.addEventListener('click', () => ctx.go('exams', card.dataset.exam)))
}

function examCard(e, past = false) {
  const cd = countdownLabel(e.examDate)
  return `
    <button class="doc-card exam-card ${past ? 'exam-past' : ''}" data-exam="${e.id}">
      <div class="doc-icon exam-ico ${cd === 'today' ? 'urgent' : ''}">${icon('fileText')}</div>
      <div class="doc-info">
        <div class="doc-name">${esc(e.title)}</div>
        <div class="doc-meta">
          ${cd && !past ? `<span class="exam-countdown ${cd === 'today' ? 'urgent' : ''}">${cd}</span>` : ''}
          <span>${e.docIds?.length || 0} file${e.docIds?.length === 1 ? '' : 's'}</span>·
          <span>${e.topics?.length || 0} topic${e.topics?.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <span class="al-go">${icon('chevronRight')}</span>
    </button>`
}

async function renderDetail(root, ctx, examId) {
  const exam = await getExam(examId)
  if (!exam) { ctx.go('exams'); return }

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to exams">${icon('chevronLeft')}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(exam.title)}</div>
        <div style="font-size:11.5px;color:var(--text-faint)" id="exam-countdown-line"></div>
      </div>
    </header>
    <div class="screen">
      <div id="exam-detail-body"><div class="reader-loading">Summoning your exam plan…</div></div>
    </div>
  `

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('exams'))

  const body = root.querySelector('#exam-detail-body')
  const [docs, due, weak] = await Promise.all([
    Promise.all(exam.docIds.map(id => getDoc(id).catch(() => null))),
    listDueCards(60).catch(() => []),
    getWeakTerms(null).catch(() => [])
  ])
  const realDocs = docs.filter(Boolean)
  const docWeak = weak.filter(w => exam.docIds.includes(w.docId))

  const cd = countdownLabel(exam.examDate)
  root.querySelector('#exam-countdown-line').textContent =
    cd ? `${exam.examDate ? new Date(exam.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' : ''}${cd}` :
    `${realDocs.length} files · ${exam.topics.length} topics`

  const ranked = rankExamTopics(exam, realDocs)
  const quiz = buildExamQuiz(exam, realDocs, docWeak, { count: 15 })

  body.innerHTML = `
    ${cd && cd !== 'past' ? `
    <div class="exam-banner ${cd === 'today' || cd === 'tomorrow' ? 'urgent' : ''}">
      ${cd === 'today' ? 'The exam is TODAY' : `The exam is ${cd}`}
    </div>` : ''}

    ${exam.announcement ? `
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">✦</span><h3>Announcement</h3></div>
      <p class="rvw-overview">${esc(exam.announcement)}</p>
    </div>` : ''}

    ${exam.topics.length ? `
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">I</span><h3>Topics to review</h3></div>
      ${exam.topics.map(t => {
        const doc = realDocs.find(d => d.id === t.docId)
        const weakHere = docWeak.filter(w => doc && w.docId === doc.id).length
        const reason = t.reason || (doc ? `Covered in ${doc.name}` : '')
        return `<div class="ec-topic">
          <div class="ec-topic-title">${esc(t.title)}</div>
          <div class="ec-topic-reason">${esc(reason)}${weakHere ? ` · <span style="color:var(--bad)">${weakHere} weak spot${weakHere === 1 ? '' : 's'}</span>` : ''}</div>
        </div>`
      }).join('')}
    </div>` : ''}

    ${realDocs.length ? `
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">II</span><h3>Your files (${realDocs.length})</h3></div>
      <div class="chip-row">${realDocs.map(d => `<span class="chip">${esc(d.name)}</span>`).join('')}</div>
    </div>` : ''}

    <div class="reader-actions" style="margin-top:8px">
      <button class="btn btn-primary" id="start-quiz-btn" ${quiz.questions.length ? '' : 'disabled'}>
        ${icon('play')} Practice quiz (${quiz.questions.length || 0} questions)
      </button>
      <button class="btn btn-secondary" id="pdf-btn" style="margin-top:10px;width:100%">${icon('download')} Export exam PDF handout</button>
      <button class="btn btn-danger-ghost" id="delete-exam-btn" style="margin-top:10px;width:100%">${icon('trash')} Delete exam</button>
    </div>
    ${!quiz.questions.length ? '<p class="faint" style="font-size:12px">Not enough content in these files to build a quiz yet.</p>' : ''}
  `

  root.querySelector('#start-quiz-btn').addEventListener('click', () => {
    if (!quiz.questions.length) return
    ctx.state.examSession = { examId: exam.id, questions: quiz.questions, docName: exam.title }
    ctx.go('quiz')
  })
  root.querySelector('#pdf-btn').addEventListener('click', async () => {
    const btn = root.querySelector('#pdf-btn')
    btn.disabled = true
    btn.textContent = 'Building PDF…'
    try {
      await exportExamPdf(exam, realDocs)
      ctx.toast('Exam PDF downloaded ✓')
    } catch { ctx.toast('Could not build the PDF', true) }
    btn.disabled = false
    btn.innerHTML = `${icon('download')} Export exam PDF handout`
  })
  root.querySelector('#delete-exam-btn').addEventListener('click', async () => {
    if (!await confirmModal(`Delete "${esc(exam.title)}"?`, 'The exam plan will be removed. Your documents and quiz history stay.')) return
    await deleteExam(exam.id)
    ctx.toast('Exam deleted')
    ctx.go('exams')
  })

  currentCleanup = () => {}
}
