import { getDoc, bankMistake, resolveMistake, srsIdFor, getSrsItem, upsertSrsFromMistake, gradeSrsItem, getImageById, loadSettings } from '../../lib/storage.js'
import { generateQuiz, TYPE_META } from '../../lib/quizgen.js'
import { generateQuizAI, gradeShortAnswer } from '../../lib/llm/quiz-ai.js'
import { explainAnswer } from '../../lib/llm/explain.js'
import { assetUrl } from '../../lib/assets.js'
import { hasApiKey } from '../../lib/llm/gemini.js'
import { checkTyped } from '../../lib/textproc.js'
import { icon } from '../icons.js'
import { esc, blankHtml } from '../helpers.js'
import { attachZoom } from '../../lib/imgZoom.js'

function configKey(cfg) {
  return JSON.stringify([cfg.count, cfg.mix, cfg.difficulty, cfg.shuffle, cfg.timerSec, cfg.fresh, cfg.topics, !!cfg.ai, !!cfg.focusWeak])
}

function resumeKey() {
  return `quizard-active-quiz-${ctxAccountId()}`
}

function ctxAccountId() {
  return window.__quizAccountId || 'default'
}

function saveResumeState(doc, st, session) {
  if (st.mistakeMode || !doc) return
  try {
    localStorage.setItem(resumeKey(), JSON.stringify({
      docId: doc.id,
      docName: doc.name,
      questions: session,
      index: st.index,
      correct: st.correct,
      answers: st.answers,
      savedAt: Date.now()
    }))
  } catch { /* storage full — resume unavailable */ }
}

function clearResumeState() {
  localStorage.removeItem(resumeKey())
}

function renderGeneratingUI(root, docName) {
  root.innerHTML = `
    <div class="screen screen-center">
      <div class="empty-state">
        <div class="art">${icon('sparkles')}</div>
        <h3 style="margin-top:14px">AI is writing your quiz</h3>
        <p class="faint" id="ai-gen-label" style="margin-top:6px">Connecting to Gemini…</p>
      </div>
      <div style="width:min(280px,80%);height:8px;border-radius:99px;background:var(--border);overflow:hidden;margin-top:18px">
        <div id="ai-gen-bar" style="height:100%;width:0%;background:var(--accent);transition:width .25s"></div>
      </div>
    </div>`
}

function updateGeneratingUI(root, done, total) {
  const bar = root.querySelector('#ai-gen-bar')
  const label = root.querySelector('#ai-gen-label')
  if (bar) bar.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%'
  if (label && total) label.textContent = `Writing question ${Math.min(done + 1, total)} of ${total}…`
}

let quizKeyCleanup = null
export function unmount() { if (quizKeyCleanup) { quizKeyCleanup(); quizKeyCleanup = null } }

export async function render(root, ctx) {
  if (quizKeyCleanup) quizKeyCleanup()
  const mistakeState = ctx.state.mistakeReview || null
  let doc = null
  let cfg = null
  let st = null
  let session

  if (ctx.state.resumeRequested) {
    ctx.state.resumeRequested = false
    try {
      const saved = JSON.parse(localStorage.getItem(resumeKey()))
      if (saved?.questions?.length) {
        doc = await getDoc(saved.docId)
      }
      if (saved && doc) {
        session = saved.questions
        st = {
          questions: session,
          index: saved.index,
          correct: saved.correct,
          answers: saved.answers,
          startTime: Date.now(),
          resumed: true
        }
        cfg = ctx.getConfig(doc.id)
        ctx.toast(`Resumed at question ${saved.index + 1} of ${session.length}`)
      } else {
        clearResumeState()
      }
    } catch {
      clearResumeState()
    }
  }

  if (!st && ctx.state.examSession) {
    const examSession = ctx.state.examSession
    ctx.state.examSession = null
    session = examSession.questions
    cfg = { timerSec: 0, count: session.length }
    st = {
      questions: session,
      index: 0,
      correct: 0,
      answers: [],
      examMode: true,
      examId: examSession.examId,
      docName: examSession.docName || 'Exam Prep'
    }
  } else if (!st && ctx.state.sharedQuiz) {
    const shared = ctx.state.sharedQuiz
    session = shared.questions
    cfg = { timerSec: shared.cfg?.timerSec || 0, count: session.length }
    st = {
      questions: session,
      index: 0,
      correct: 0,
      answers: [],
      shared: true,
      docName: shared.title || 'Shared Quiz'
    }
  } else if (!st && mistakeState) {
    ctx.state.mistakeReview = null
    session = mistakeState.questions
    st = {
      questions: session,
      index: 0,
      correct: 0,
      answers: [],
      mistakeMode: true,
      docName: mistakeState.docName || 'Mistake Review'
    }
  } else if (!st) {
    doc = await getDoc(ctx.state.currentDocId)
    if (!doc) { ctx.go('library'); return }
    cfg = ctx.getConfig(doc.id)

    if (cfg.fresh || !ctx.state.cachedQuiz?.[doc.id]) {
      let gen = null
      if (cfg.ai) {
        renderGeneratingUI(root, doc.name)
        try {
          gen = await generateQuizAI(doc, cfg, (d, t) => updateGeneratingUI(root, d, t))
        } catch {
          gen = null
        }
        if (ctx.state.screen !== 'quiz') return
        // surface silent fallbacks so weak questions are never mistaken for a dumb ai
        if (gen?.aiNote === 'no_key') ctx.toast('Add a Gemini key in Settings for AI questions', true)
        else if (gen?.aiNote) ctx.toast(`Gemini unavailable (${gen.aiNote}) — used built-in questions`, true)
      }
      if (!gen || gen.error === 'not_enough_content' || !gen.questions.length) {
        gen = generateQuiz(doc, cfg)
      }
      if (gen.error === 'not_enough_content' || !gen.questions.length) {
        root.innerHTML = `
          <div class="screen screen-center">
            <div class="empty-state">
              <div class="art">${icon('sparkles')}</div>
              <h3>Not enough content</h3>
              <p>This document doesn't have enough readable text to build a quiz. Try a text-rich file.</p>
              <button class="btn btn-secondary" id="goback" style="max-width:200px;margin:0 auto">Back</button>
            </div>
          </div>`
        root.querySelector('#goback').addEventListener('click', () => ctx.go('setup'))
        return
      }
      session = gen.questions
      ctx.state.cachedQuiz = { [doc.id]: { questions: session, configKey: configKey(cfg), index: 0, correct: 0, answers: [] } }
    } else {
      const cached = ctx.state.cachedQuiz[doc.id]
      if (cached.configKey !== configKey(cfg)) {
        ctx.go('quiz')
        return
      }
      session = cached.questions
    }
    st = ctx.state.cachedQuiz[doc.id]
  }

  st.startTime = Date.now()
  let timerInterval = null
  let locked = false
  const root2 = root

  // Resolve object urls for any image-grounded questions (best-effort).
  const imgUrlMap = {}
  const imgIds = [...new Set(session.filter(q => q.imageId).map(q => q.imageId))]
  for (const id of imgIds) {
    try {
      const rec = await getImageById(id)
      if (rec?.blob) imgUrlMap[id] = URL.createObjectURL(rec.blob)
    } catch { /* image unavailable — question shows without it */ }
  }
  function revokeImages() {
    for (const u of Object.values(imgUrlMap)) URL.revokeObjectURL(u)
  }

  function currentQ() {
    return session[st.index]
  }
  function total() { return session.length }

  function draw() {
    const q = currentQ()
    clearInterval(timerInterval)
    locked = false

    let bodyHtml = ''
    if (q.type === 'mcq') {
      bodyHtml = q.options.map((opt, i) => `
        <button class="opt-btn" data-i="${i}">
          <span class="opt-key">${String.fromCharCode(65 + i)}</span>
          <span>${esc(opt)}</span>
        </button>`).join('')
    } else if (q.type === 'fib') {
      bodyHtml = q.choices.map((c, i) => `
        <button class="opt-btn" data-i="${i}">
          <span class="opt-key">${i + 1}</span>
          <span>${esc(c)}</span>
        </button>`).join('')
    } else if (q.type === 'tf') {
      bodyHtml = `
        <div class="tf-row">
          <button class="tf-btn true-opt" data-ans="true">${icon('check')} True</button>
          <button class="tf-btn false-opt" data-ans="false">${icon('x')} False</button>
        </div>`
    } else if (q.type === 'id') {
      bodyHtml = `
        <input class="text-input" id="id-input" placeholder="Type your answer…" aria-label="Type your answer" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <button class="btn btn-primary" id="id-submit" style="margin-top:12px">Submit</button>`
    } else if (q.type === 'matching') {
      bodyHtml = `
        <div class="match-grid">
          <div class="match-col">
            ${q.pairs.map((p, i) => `<button class="match-cell match-left" data-left="${i}">${esc(p.left)}</button>`).join('')}
          </div>
          <div class="match-col">
            ${q.rightOrder.map((pi, j) => `<button class="match-cell match-right" data-right="${j}" data-pair="${pi}">${esc(q.pairs[pi].right)}</button>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" id="match-submit" style="margin-top:14px;width:100%" disabled data-tooltip="Pair every term first">Check matches</button>`
    } else if (q.type === 'ordering') {
      bodyHtml = `
        <div class="order-pool" id="order-pool"></div>
        <div class="order-answer" id="order-answer"></div>
        <button class="btn btn-primary" id="order-submit" style="margin-top:14px;width:100%" disabled data-tooltip="Place every step first">Check order</button>`
    } else if (q.type === 'short') {
      bodyHtml = `
        <input class="text-input" id="short-input" placeholder="Type your answer…" aria-label="Type your answer" autocomplete="off" />
        <button class="btn btn-primary" id="short-submit" style="margin-top:12px">Submit</button>`
    }

    const stemHtml = (q.type === 'matching' || q.type === 'ordering')
      ? ''
      : q.type === 'short'
        ? `<p class="q-stem">${esc(q.prompt || q.stem || q.statement || q.clue || '')}</p>`
        : q.type === 'tf'
          ? `<p class="q-stem">${esc(q.statement)}</p>`
          : q.type === 'id'
            ? `<p class="q-stem">Identify the missing term:<br/><span style="font-size:15px;color:var(--text-dim);display:block;margin-top:10px;line-height:1.6">“${esc(q.clue)}”</span></p>`
            : `<p class="q-stem">${blankHtml(q.stem)}</p>`

    const imageHtml = (q.imageId && imgUrlMap[q.imageId])
      ? `<img class="q-image" src="${imgUrlMap[q.imageId]}" alt="Question image" loading="lazy" />`
      : ''

    root2.innerHTML = `
      <div class="quiz-topbar">
        <button class="icon-btn" id="quit-btn" data-tooltip="Quit quiz">${icon('x')}</button>
        <div class="progress-track" data-tooltip="Your progress through the quiz"><div class="progress-fill" id="progress-fill"></div></div>
        <span class="q-counter" id="q-counter" data-tooltip="Question number"></span>
        ${cfg?.timerSec > 0 ? '<span class="timer-chip" id="timer-chip" data-tooltip="Time remaining">' + icon('timer') + '<span id="timer-val"></span></span>' : ''}
      </div>
      <div class="quiz-body">
        <img class="q-wiz" src="${assetUrl('wizard/wizard-thinking.jpg')}" alt="" />
        ${imageHtml}
        <div class="q-type-badge"><span class="chip on">${TYPE_META[q.type].short}</span></div>
        ${stemHtml}
        <div id="answers">${bodyHtml}</div>
        <div id="feedback-zone"></div>
      </div>
    `

    root2.querySelector('#progress-fill').style.width = `${((st.index + 1) / total()) * 100}%`
    root2.querySelector('#q-counter').textContent = `${st.index + 1}/${total()}`

    if (cfg?.timerSec > 0) startTimer(cfg.timerSec)
    wireAnswers(q)

    const imgEl = root2.querySelector('.q-image')
    if (imgEl) imgEl.addEventListener('click', () => openQuizImage(imgEl.src))
  }

  function openQuizImage(src) {
    let ov = document.getElementById('quiz-img-viewer')
    if (!ov) {
      ov = document.createElement('div')
      ov.id = 'quiz-img-viewer'
      ov.className = 'img-viewer hidden'
      ov.innerHTML = `
        <div class="iv-zoom-bar">
          <button class="iv-zoom" id="qiv-zoom-out" aria-label="Zoom out">${icon('minus')}</button>
          <button class="iv-zoom" id="qiv-reset" aria-label="Reset zoom">${icon('refresh')}</button>
          <button class="iv-zoom" id="qiv-zoom-in" aria-label="Zoom in">${icon('plus')}</button>
        </div>
        <button class="iv-close" id="qiv-close" aria-label="Close">${icon('x')}</button>
        <img id="qiv-img" alt="Viewing image" />`
      document.body.appendChild(ov)
      ov.addEventListener('click', (e) => {
        if (e.target === ov || e.target.id === 'qiv-close') ov.classList.add('hidden')
      })
      const img = ov.querySelector('#qiv-img')
      ov._zoom = attachZoom(ov, img)
      ov.querySelector('#qiv-zoom-in').addEventListener('click', (e) => { e.stopPropagation(); ov._zoom.zoomIn() })
      ov.querySelector('#qiv-zoom-out').addEventListener('click', (e) => { e.stopPropagation(); ov._zoom.zoomOut() })
      ov.querySelector('#qiv-reset').addEventListener('click', (e) => { e.stopPropagation(); ov._zoom.reset() })
    }
    ov.querySelector('#qiv-img').src = src
    ov._zoom?.reset()
    ov.classList.remove('hidden')
  }

  function startTimer(seconds) {
    let remaining = seconds
    const valEl = root2.querySelector('#timer-val')
    const chipEl = root2.querySelector('#timer-chip')
    valEl.textContent = remaining
    timerInterval = setInterval(() => {
      remaining--
      valEl.textContent = Math.max(0, remaining)
      if (remaining <= 5) chipEl.classList.add('danger')
      if (remaining <= 0) {
        clearInterval(timerInterval)
        handleAnswer(null)
      }
    }, 1000)
  }

  function stopTimer() { clearInterval(timerInterval) }

  let gradedThisCard = true

  function showFeedback(ok, extraCorrectText, srsId = null, chosenText = null) {
    gradedThisCard = !srsId
    const zone = root2.querySelector('#feedback-zone')
    const q = currentQ()
    const canExplain = hasApiKey() && loadSettings().aiExplain !== false && !q.explanation
    const goNext = async () => {
      if (!gradedThisCard && srsId) {
        gradedThisCard = true
        await gradeSrsItem(srsId, ok ? 'good' : 'again').catch(() => {})
      }
      ;(st.index < total() - 1 ? advance : finish)()
    }
    zone.innerHTML = `
      <img class="q-wiz-fb" src="${assetUrl(`wizard/${ok ? 'wizard-celebrating' : 'wizard-encouraging'}.jpg`)}" alt="" />
      <div class="feedback-banner ${ok ? 'good' : 'bad'}">
        ${ok ? icon('check') : icon('x')}
        <div>
          ${ok ? 'Correct!' : 'Incorrect'}
          ${!ok && extraCorrectText ? `<span class="fb-answer">Answer: ${esc(extraCorrectText)}</span>` : ''}
        </div>
      </div>
      ${canExplain ? `
      <button class="btn btn-ghost explain-btn" id="explain-btn" style="margin-top:14px;width:100%" data-tooltip="Ask Gemini why this answer is right">${icon('sparkles')} Why? Explain answer</button>
      <div id="explain-zone"></div>` : ''}
      ${srsId != null ? `
      <div style="margin-top:12px">
        <p class="faint" style="font-size:11.5px;text-align:center;margin-bottom:8px">Schedule next review</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
          <button class="btn srs-btn srs-again" data-grade="again">Again</button>
          <button class="btn srs-btn srs-hard" data-grade="hard">Hard</button>
          <button class="btn srs-btn srs-good" data-grade="good">Good</button>
          <button class="btn srs-btn srs-easy" data-grade="easy">Easy</button>
        </div>
      </div>` : ''}
      ${st.index < total() - 1
        ? `<button class="btn btn-secondary" id="next-btn" style="margin-top:14px;width:100%">Next Question ${icon('chevronRight')}</button>`
        : `<button class="btn btn-good" id="finish-btn" style="margin-top:14px;width:100%">${icon('trophy')} See Results</button>`}
    `
    ;(root2.querySelector('#next-btn') || root2.querySelector('#finish-btn')).focus({ preventScroll: true })
    root2.querySelector('#next-btn')?.addEventListener('click', goNext)
    root2.querySelector('#finish-btn')?.addEventListener('click', goNext)
    if (srsId != null) {
      root2.querySelectorAll('.srs-btn').forEach(b =>
        b.addEventListener('click', async () => {
          gradedThisCard = true
          await gradeSrsItem(srsId, b.dataset.grade).catch(() => {})
          ;(st.index < total() - 1 ? advance : finish)()
        })
      )
    }

    const explainBtn = root2.querySelector('#explain-btn')
    if (explainBtn) {
      explainBtn.addEventListener('click', async () => {
        explainBtn.disabled = true
        explainBtn.textContent = 'Thinking…'
        try {
          const text = await explainAnswer(currentQ(), chosenText)
          q.explanation = text
          root2.querySelector('#explain-zone').innerHTML = `<div class="explain-box">${esc(text)}</div>`
          explainBtn.remove()
        } catch {
          root2.querySelector('#explain-zone').innerHTML = `<div class="explain-box faint">Couldn't load an explanation right now.</div>`
          explainBtn.remove()
        }
      })
    }
  }

  function markOptions(q, chosenIndex) {
    const reveal = (el, isCorrectOpt, isChosenWrong) => {
      el.classList.remove('dimmed')
      if (isCorrectOpt) el.classList.add('correct')
      else if (isChosenWrong) el.classList.add('wrong')
      else el.classList.add('dimmed')
      el.setAttribute('disabled', '')
    }
    root2.querySelectorAll('.opt-btn').forEach((el, i) => {
      const isAns = q.answerIndex != null && i === q.answerIndex
      reveal(el, isAns, i === chosenIndex && !isAns)
    })
    root2.querySelectorAll('.tf-btn').forEach(el => {
      const truthy = el.dataset.ans === 'true'
      reveal(el, truthy === q.answer, truthy !== q.answer && ((chosenIndex === true && el.classList.contains('true-opt')) || (chosenIndex === false && el.classList.contains('false-opt'))))
    })
  }

  async function handleAnswer(choice) {
    if (locked) return
    locked = true
    stopTimer()

    const q = currentQ()
    let ok = false

    if (q.type === 'mcq' || q.type === 'fib') {
      ok = choice != null && choice === q.answerIndex
      markOptions(q, choice)
    } else if (q.type === 'tf') {
      ok = choice === q.answer
      markOptions(q, choice)
    } else if (q.type === 'id') {
      const inputEl = root2.querySelector('#id-input')
      ok = checkTyped(inputEl?.value ?? '', q.answer)
      if (inputEl) inputEl.setAttribute('disabled', '')
    } else {
      return
    }

    finishAnswer(ok, chosenTextFor(q, choice))
  }

  function chosenTextFor(q, choice) {
    if (q.type === 'mcq' || q.type === 'fib') return choice != null ? (q.options ?? q.choices)?.[choice] ?? null : null
    if (q.type === 'tf') return choice === true ? 'True' : choice === false ? 'False' : null
    if (q.type === 'id') return root2.querySelector('#id-input')?.value?.trim() ?? null
    return null
  }

  async function finishAnswer(ok, chosenText) {
    const q = currentQ()
    const correctText = q.type === 'id' ? q.answer
      : q.type === 'tf' ? String(q.answer)
      : q.type === 'short' ? q.answer
      : q.type === 'ordering' ? q.steps.join(' → ')
      : q.type === 'matching' ? q.pairs.map(p => p.left).join(', ')
      : q.options?.[q.answerIndex] ?? q.choices?.[q.answerIndex]

    st.answers.push({
      type: q.type,
      sentence: q.meta?.sentence || q.statement || q.prompt || '',
      term: q.meta?.term || q.answer,
      chosen: chosenText,
      correct: correctText,
      userOk: ok
    })
    if (ok) st.correct++

    const mDocId = doc?.id || q.meta?.docId
    const mSentence = q.meta?.sentence || q.statement || ''
    const mTerm = q.meta?.term || q.answer
    let srsId = null
    if (mDocId && mSentence && mTerm) {
      if (ok) resolveMistake(mDocId, mTerm, mSentence).catch(() => {})
      else bankMistake({ docId: mDocId, sentence: mSentence, term: mTerm, type: q.type }).catch(() => {})

      // spaced repetition: outside mistake review, grade automatically.
      // inside review mode, capture the card id for manual grading UI.
      try {
        srsId = srsIdFor(mDocId, mTerm, mSentence)
        if (!(await getSrsItem(srsId))) {
          await upsertSrsFromMistake({ docId: mDocId, sentence: mSentence, term: mTerm, type: q.type })
        }
        if (!st.mistakeMode) await gradeSrsItem(srsId, ok ? 'good' : 'again')
      } catch { /* scheduling is best-effort */ }
    }

    saveResumeState(doc, st, session)

    showFeedback(
      ok,
      correctText,
      st.mistakeMode ? srsId : null,
      chosenText
    )
  }

  function wireAnswers(q) {
    if (q.type === 'mcq' || q.type === 'fib') {
      root2.querySelectorAll('.opt-btn').forEach((el, i) =>
        el.addEventListener('click', () => handleAnswer(i))
      )
    } else if (q.type === 'tf') {
      root2.querySelectorAll('.tf-btn').forEach(el =>
        el.addEventListener('click', () => handleAnswer(el.dataset.ans === 'true'))
      )
    } else if (q.type === 'id') {
      const submit = () => handleAnswer(root2.querySelector('#id-input').value)
      root2.querySelector('#id-submit').addEventListener('click', submit)
      const inp = root2.querySelector('#id-input')
      inp.focus({ preventScroll: true })
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit() })
    } else if (q.type === 'matching') {
      wireMatching(q)
    } else if (q.type === 'ordering') {
      wireOrdering(q)
    } else if (q.type === 'short') {
      const submit = () => submitShort(root2.querySelector('#short-input').value)
      root2.querySelector('#short-submit').addEventListener('click', submit)
      const inp = root2.querySelector('#short-input')
      inp.focus({ preventScroll: true })
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit() })
    }
    root2.querySelector('#quit-btn').addEventListener('click', confirmQuit)
  }

  function wireMatching(q) {
    const leftBtns = [...root2.querySelectorAll('.match-left')]
    const rightBtns = [...root2.querySelectorAll('.match-right')]
    const links = {} // leftIndex -> right button element
    let pickedLeft = null
    function refresh() {
      const complete = Object.keys(links).length === q.pairs.length
      const btn = root2.querySelector('#match-submit')
      if (btn) btn.disabled = !complete
    }
    leftBtns.forEach(lb => lb.addEventListener('click', () => {
      leftBtns.forEach(b => b.classList.remove('sel'))
      lb.classList.add('sel')
      pickedLeft = lb
    }))
    rightBtns.forEach(rb => rb.addEventListener('click', () => {
      if (!pickedLeft) return
      const prevLeft = Object.keys(links).find(k => links[k] === rb)
      if (prevLeft != null) delete links[prevLeft]
      links[pickedLeft.dataset.left] = rb
      rightBtns.forEach(b => b.classList.remove('linked'))
      leftBtns.forEach(b => b.classList.remove('linked'))
      rb.classList.add('linked')
      pickedLeft.classList.add('linked')
      pickedLeft.classList.remove('sel')
      pickedLeft = null
      refresh()
    }))
    root2.querySelector('#match-submit').addEventListener('click', () => {
      let ok = true
      for (let i = 0; i < q.pairs.length; i++) {
        const rb = links[i]
        const correct = rb && Number(rb.dataset.pair) === i
        if (!correct) ok = false
        rb?.classList.add(correct ? 'correct' : 'wrong')
        leftBtns[i].classList.add(correct ? 'correct' : 'wrong')
      }
      finishAnswer(ok, `Matched ${Object.keys(links).filter(k => Number(links[k].dataset.pair) === Number(k)).length}/${q.pairs.length}`)
    })
  }

  function wireOrdering(q) {
    const pool = root2.querySelector('#order-pool')
    const answerEl = root2.querySelector('#order-answer')
    const chosen = [] // original step indices, in selected order
    function render() {
      pool.innerHTML = q.shuffled
        .filter(si => !chosen.includes(si))
        .map(si => `<button class="order-cell" data-step="${si}">${esc(q.steps[si])}</button>`).join('')
      answerEl.innerHTML = chosen
        .map((si, k) => `<button class="order-ans" data-k="${k}"><span class="order-pos">${k + 1}</span>${esc(q.steps[si])}</button>`).join('')
      const submit = root2.querySelector('#order-submit')
      if (submit) submit.disabled = chosen.length !== q.steps.length
      pool.querySelectorAll('.order-cell').forEach(b =>
        b.addEventListener('click', () => { chosen.push(Number(b.dataset.step)); render() })
      )
      answerEl.querySelectorAll('.order-ans').forEach(b =>
        b.addEventListener('click', () => { chosen.splice(Number(b.dataset.k), 1); render() })
      )
    }
    render()
    root2.querySelector('#order-submit').addEventListener('click', () => {
      let ok = chosen.every((si, k) => si === k)
      answerEl.querySelectorAll('.order-ans').forEach((b, k) =>
        b.classList.add(chosen[k] === k ? 'correct' : 'wrong')
      )
      finishAnswer(ok, `Order: ${chosen.map(si => q.steps[si]).join(' → ')}`)
    })
  }

  async function submitShort(val) {
    if (locked) return
    locked = true
    stopTimer()
    const q = currentQ()
    const text = (val || '').trim()
    let ok = checkTyped(text, q.answer)
    const graded = await gradeShortAnswer(text, q).catch(() => null)
    if (graded != null) ok = graded
    finishAnswer(ok, text)
  }

  function advance() {
    if (st.index >= total() - 1) return finish()
    st.index++
    draw()
    window.scrollTo(0, 0)
  }

  async function finish() {
    stopTimer()
    revokeImages()
    const durationSec = (Date.now() - st.startTime) / 1000
    const percent = Math.round((st.correct / total()) * 100)
    const wrongCount = st.answers.filter(a => !a.userOk).length

    const byType = {}
    for (const a of st.answers) {
      byType[a.type] = byType[a.type] || { c: 0, t: 0 }
      byType[a.type].t++
      if (a.userOk) byType[a.type].c++
    }

    if ((!st.mistakeMode && doc) || st.examMode) {
      await ctx.saveAttemptRecord({
        docId: doc?.id || null,
        docName: st.docName || doc?.name || 'Exam Prep',
        examId: st.examId || undefined,
        correct: st.correct,
        total: total(),
        percent,
        durationSec,
        byType
      })
    }

    ctx.state.lastResult = {
      docId: doc?.id || null,
      docName: st.docName || doc?.name,
      correct: st.correct,
      total: total(),
      percent,
      durationSec,
      wrongCount,
      mistakeMode: !!st.mistakeMode,
      shared: !!st.shared,
      examMode: !!st.examMode,
      challenge: st.challenge || null,
      cfg: { timerSec: cfg?.timerSec || 0 },
      byType,
      review: session.map((q, i) => {
        let prompt = q.statement || q.stem || q.clue || q.prompt || ''
        let answer = q.type === 'id' || q.type === 'short'
          ? q.answer
          : q.type === 'tf'
            ? String(q.answer)
            : (q.options ?? q.choices)?.[q.answerIndex]
        if (q.type === 'matching') {
          prompt = `Match terms: ${(q.pairs || []).map(p => p.left).join(' / ')}`
          answer = (q.pairs || []).map(p => `${p.left} → ${p.right}`).join('  |  ')
        } else if (q.type === 'ordering') {
          prompt = q.prompt || 'Put the steps in order'
          answer = (q.steps || []).join(' → ')
        }
        return { prompt, answer, chosen: st.answers[i]?.chosen ?? null, ok: st.answers[i]?.userOk }
      }),
      questions: session.map(q => ({ ...q }))
    }
    if (!st.mistakeMode && doc) delete ctx.state.cachedQuiz[doc.id]
    clearResumeState()
    removeKeyHandler()
    goResultsNoNav()
  }

  function goResultsNoNav() {
    clearInterval(timerInterval)
    ctx.go('results')
  }

  function confirmQuit() {
    const mask = document.createElement('div')
    mask.className = 'quit-dialog-mask'
    mask.innerHTML = `
      <div class="quit-dialog">
        <h3>Quit this quiz?</h3>
        <p>Your progress in this attempt won't be saved.</p>
        <div class="quit-actions">
          <button class="btn btn-danger-ghost" id="qd-yes">Yes, quit</button>
          <button class="btn btn-primary" id="qd-no">Keep going</button>
        </div>
      </div>`
    document.body.appendChild(mask)
    mask.addEventListener('click', e => { if (e.target === mask) mask.remove() })
    mask.querySelector('#qd-yes').addEventListener('click', () => { mask.remove(); goResultsCleanup() })
    mask.querySelector('#qd-no').addEventListener('click', () => mask.remove())
  }

  function goResultsCleanup() {
    clearInterval(timerInterval)
    revokeImages()
    if (doc) delete ctx.state.cachedQuiz[doc.id]
    ctx.state.mistakeReview = null
    clearResumeState()
    removeKeyHandler()
    ctx.go('library')
  }

  let keyHandler = null
  function removeKeyHandler() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler)
      keyHandler = null
    }
  }
  keyHandler = e => {
    if (document.querySelector('.quit-dialog-mask')) return
    const q = session[st.index]
    if (!q) return
    if (e.target.tagName === 'INPUT') return
    if (locked) {
      if (e.key === 'Enter') {
        root2.querySelector('#next-btn')?.click()
        root2.querySelector('#finish-btn')?.click()
      }
      return
    }
    if (q.type === 'mcq' || q.type === 'fib') {
      const opts = q.options || q.choices
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= opts.length) { handleAnswer(n - 1); return }
      const letter = e.key.toUpperCase()
      const li = ['A', 'B', 'C', 'D'].indexOf(letter)
      if (li >= 0 && li < opts.length) handleAnswer(li)
    } else if (q.type === 'tf') {
      const k = e.key.toLowerCase()
      if (k === 't') handleAnswer(true)
      else if (k === 'f') handleAnswer(false)
    }
  }
  document.addEventListener('keydown', keyHandler)
  quizKeyCleanup = removeKeyHandler

  window.__quizSession = { session, st, cfg, doc }
  draw()
}
