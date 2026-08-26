import { icon } from '../icons.js'
import { TYPE_META } from '../../lib/quizgen.js'
import { esc } from '../helpers.js'
import { startMistakeReview } from '../mistakes.js'
import { explainAnswer } from '../../lib/llm/explain.js'
import { hasApiKey } from '../../lib/llm/gemini.js'
import { loadSettings } from '../../lib/storage.js'
import { exportQuiz } from '../../lib/export.js'
import { showShareModal } from '../shareModal.js'

export function render(root, ctx) {
  const r = ctx.state.lastResult
  if (!r) { ctx.go('library'); return }

  const canExplain = hasApiKey() && loadSettings().aiExplain !== false
  const canExport = true
  const ch = ctx.state.challenge || r.challenge || null

  const verdict = r.percent >= 90
    ? ['Outstanding!', 'You have mastered this material.']
    : r.percent >= 75
      ? ['Great job!', 'Solid understanding — review the misses to perfect it.']
      : r.percent >= 50
        ? ['Good effort', 'A quick review will push you higher.']
        : ['Keep practicing', 'Revisit the document and try again.']

  root.innerHTML = `
    <div class="screen">
      <canvas class="confetti-canvas" id="confetti"></canvas>

      <div class="result-ring-wrap">
        <div class="result-ring">
          <svg width="172" height="172" viewBox="0 0 172 172">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
            <circle class="rr-bg" cx="86" cy="86" r="76" fill="none" stroke-width="13"/>
            <circle class="rr-fill" id="ring-fill" cx="86" cy="86" r="76" fill="none" stroke-width="13"
              stroke-linecap="round"
              stroke-dasharray="${2 * Math.PI * 76}"
              stroke-dashoffset="${2 * Math.PI * 76}"/>
          </svg>
          <div class="rr-center">
            <div class="rr-pct" id="rr-pct">0%</div>
            <div class="rr-lbl">${r.correct} of ${r.total} correct</div>
          </div>
        </div>
      </div>

      <div class="result-verdict">
        <h2>${verdict[0]}</h2>
        <p>${esc(r.docName)} · ${Math.round(r.durationSec)}s</p>
      </div>

      ${ch ? `
      <div class="card challenge-compare">
        <div class="cc-row ${r.percent >= ch.p ? 'win' : ''}">
          <span class="cc-who">${icon('sparkles')} You</span>
          <div class="cc-bar"><div class="cc-fill you" style="width:${r.percent}%"></div></div>
          <span class="cc-score">${r.percent}%</span>
        </div>
        <div class="cc-row ${ch.p > r.percent ? 'win' : ''}">
          <span class="cc-who">${icon('users')} ${esc(ch.n || 'Friend')}</span>
          <div class="cc-bar"><div class="cc-fill them" style="width:${ch.p}%"></div></div>
          <span class="cc-score">${ch.p}%</span>
        </div>
        <p class="cc-note">${r.percent >= ch.p ? 'You matched or beat the challenge!' : esc(ch.n || 'Friend') + ' is still ahead — try again!'}</p>
      </div>` : ''}

      ${Object.keys(r.byType).length > 1 ? `
      <div class="section-title">By question type</div>
      <div class="card breakdown">
        ${Object.entries(r.byType).map(([t, v]) => `
          <div class="bd-row">
            <span class="bd-name">${TYPE_META[t]?.name || t}</span>
            <div class="bd-bar"><div class="bd-fill" style="width:${Math.round((v.c / v.t) * 100)}%"></div></div>
            <span class="bd-score">${v.c}/${v.t}</span>
          </div>`).join('')}
      </div>` : ''}

      <button class="btn btn-secondary" id="toggle-review" style="margin-top:22px;width:100%" data-tooltip="See each question with the correct answer">
        ${icon('eye')} Review answers
      </button>
      <div id="review-panel" class="card hidden" style="margin-top:12px;max-height:340px;overflow-y:auto">
        ${r.review.map((item, i) => `
          <div class="review-item">
            <div class="review-q"><strong style="color:${item.ok ? 'var(--good)' : 'var(--bad)'}">${i + 1}.</strong> ${esc(item.prompt)}</div>
            <div class="review-a" style="color:${item.ok ? 'var(--good)' : 'var(--bad)'}">
              ${icon(item.ok ? 'check' : 'x')} ${esc(item.answer)}
            </div>
            <div class="review-explain" data-i="${i}">${r.questions?.[i]?.explanation ? `<div class="explain-box">${esc(r.questions[i].explanation)}</div>` : ''}</div>
          </div>`).join('')}
      </div>
      ${canExplain ? `<button class="btn btn-secondary" id="explain-all-btn" style="margin-top:10px;width:100%" data-tooltip="Ask Gemini to explain every answer">${icon('sparkles')} Explain all answers</button>` : ''}
      ${canExport ? `<button class="btn btn-secondary" id="export-quiz-btn" style="margin-top:10px;width:100%" data-tooltip="Save this quiz as Markdown or PDF">${icon('download')} Export quiz</button>` : ''}
      <button class="btn btn-secondary" id="share-btn" style="margin-top:10px;width:100%" data-tooltip="Get a link or QR to send this quiz — no app or key needed">${icon('share')} Share quiz link</button>
      <button class="btn btn-primary" id="challenge-btn" style="margin-top:10px;width:100%" data-tooltip="Challenge a friend to beat your score">${icon('users')} Challenge a friend</button>

      <button class="btn btn-primary" id="retake-btn" style="margin-top:18px;width:100%" data-tooltip="${r.mistakeMode ? 'Try the mistake review again' : 'Generate a new quiz from the same document'}">${icon('refresh')} ${r.mistakeMode ? 'Review Again' : 'Retake Quiz'}</button>
      ${r.wrongCount > 0 && !r.mistakeMode && r.docId ? `<button class="btn btn-secondary" id="review-mistakes-btn" style="margin-top:10px;width:100%" data-tooltip="Practice only the questions you got wrong">${icon('alert')} Review ${r.wrongCount} mistake${r.wrongCount === 1 ? '' : 's'}</button>` : ''}
      <button class="btn btn-secondary" id="library-btn" style="margin-top:10px;width:100%">Back to Library</button>
    </div>
  `

  requestAnimationFrame(() => {
    setTimeout(() => {
      const C = 2 * Math.PI * 76
      root.querySelector('#ring-fill').style.strokeDashoffset = String(C * (1 - r.percent / 100))
      animateNumber(root.querySelector('#rr-pct'), r.percent, '%')
    }, 150)
  })

  if (r.percent >= 70) fireConfetti(root.querySelector('#confetti'))

  root.querySelector('#toggle-review').addEventListener('click', () => {
    root.querySelector('#review-panel').classList.toggle('hidden')
  })

  const explainAllBtn = root.querySelector('#explain-all-btn')
  explainAllBtn?.addEventListener('click', async () => {
    root.querySelector('#review-panel').classList.remove('hidden')
    const pending = (r.questions || []).map((q, i) => [q, i]).filter(([q]) => !q.explanation)
    if (!pending.length) { ctx.toast('All answers already explained'); return }
    explainAllBtn.disabled = true
    let done = 0
    for (const [q, i] of pending) {
      explainAllBtn.textContent = `Explaining ${done + 1}/${pending.length}…`
      try {
        const text = await explainAnswer(q, r.review[i]?.chosen ?? null)
        q.explanation = text
        const slot = root.querySelector(`.review-explain[data-i="${i}"]`)
        if (slot && text) slot.innerHTML = `<div class="explain-box">${esc(text)}</div>`
      } catch { /* skip individual failures */ }
      done++
    }
    explainAllBtn.textContent = `${icon('sparkles')} Explain all answers`
    explainAllBtn.disabled = false
  })

  const exportQuizBtn = root.querySelector('#export-quiz-btn')
  exportQuizBtn?.addEventListener('click', () => {
    const ok = exportQuiz(r.docName || 'Quiz', r)
    if (!ok) ctx.toast('Nothing to export')
  })

  root.querySelector('#share-btn')?.addEventListener('click', () => showShareModal(ctx, { title: r.docName, questions: r.questions, timerSec: r.cfg?.timerSec || 0, mode: 'quiz' }))
  root.querySelector('#challenge-btn')?.addEventListener('click', () => showShareModal(ctx, { title: r.docName, questions: r.questions, timerSec: r.cfg?.timerSec || 0, mode: 'challenge', score: { percent: r.percent, correct: r.correct, total: r.total } }))

  root.querySelector('#retake-btn').addEventListener('click', () => {
    if (r.mistakeMode) ctx.go('library')
    else if (r.shared) { ctx.state.sharedQuiz = { title: r.docName, questions: r.questions, cfg: r.cfg }; if (r.challenge) ctx.state.challenge = r.challenge; ctx.go('quiz') }
    else ctx.go('quiz')
  })
  root.querySelector('#review-mistakes-btn')?.addEventListener('click', () => startMistakeReview(ctx, r.docId))
  root.querySelector('#library-btn').addEventListener('click', () => {
    if (r.shared) { ctx.state.sharedQuiz = null; ctx.state.challenge = null }
    ctx.go('library')
  })
}

function animateNumber(el, target, suffix = '') {
  const dur = 900
  const start = performance.now()
  function frame(now) {
    const p = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - p, 3)
    el.textContent = Math.round(eased * target) + suffix
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function fireConfetti(canvas) {
  canvas.width = innerWidth
  canvas.height = innerHeight
  const ctx2d = canvas.getContext('2d')
  const colors = ['#6366f1', '#a855f7', '#34d399', '#fbbf24', '#fb7185', '#60a5fa']
  const pieces = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    w: 7 + Math.random() * 7,
    h: 9 + Math.random() * 9,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2.4 + Math.random() * 3.4,
    vx: -1.6 + Math.random() * 3.2,
    rot: Math.random() * Math.PI,
    vr: -0.14 + Math.random() * 0.28
  }))
  let frames = 0
  function tick() {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of pieces) {
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx2d.save()
      ctx2d.translate(p.x, p.y)
      ctx2d.rotate(p.rot)
      ctx2d.fillStyle = p.c
      ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx2d.restore()
    }
    frames++
    if (frames < 260) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}


