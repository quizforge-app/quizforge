import { getDoc } from '../../lib/storage.js'
import { hasApiKey } from '../../lib/llm/gemini.js'
import { icon } from '../icons.js'
import { esc, typeLabel } from '../helpers.js'
import { TYPE_META, estimateAvailable, generateQuiz } from '../../lib/quizgen.js'
import { generateQuizAI } from '../../lib/llm/quiz-ai.js'
import { detectTopics } from '../../lib/topics.js'
import { showShareModal } from '../shareModal.js'

const ALL_TYPES = ['mcq', 'tf', 'fib', 'id']

export async function render(root, ctx) {
  const doc = await getDoc(ctx.state.currentDocId)
  if (!doc) { ctx.go('library'); return }

  const cfg = ctx.getConfig(doc.id)
  let count = cfg.count
  let mix = { ...cfg.mix }
  let difficulty = cfg.difficulty
  let shuffleOn = cfg.shuffle
  let timerSec = cfg.timerSec
  let fresh = cfg.fresh
  let aiOn = cfg.ai !== false
  const detectedTopics = Array.isArray(doc.topics) && doc.topics.length ? doc.topics : detectTopics(doc.text).topics
  const selectedTopics = new Set(cfg.topics || [])
  let maxAvailable = estimateAvailable(doc, { ...cfg, topics: [...selectedTopics] })
  if (count > maxAvailable) count = Math.max(1, maxAvailable)

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to library">${icon('chevronLeft')}</button>
      <h2>Quiz Setup</h2>
      <button class="icon-btn" id="theme-btn" data-tooltip="${ctx.state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${ctx.state.theme === 'dark' ? icon('sun') : icon('moon')}</button>
    </header>
    <div class="screen has-actionbar">
      <div class="setup-hero">
        <div class="doc-icon ${doc.type}">${icon('fileText')}</div>
        <div style="min-width:0">
          <div class="doc-name">${esc(doc.name)}</div>
          <div class="doc-meta">${typeLabel(doc.type)} · ${doc.wordCount.toLocaleString()} words</div>
        </div>
      </div>

      <div class="section-title">Number of questions</div>
      <div class="card row" style="padding:13px 16px;border-top:none">
        <span class="label">Questions</span>
        <div class="stepper" data-tooltip="How many questions to generate (1–200)">
          <button id="count-minus" data-tooltip="Fewer questions">−</button>
          <span class="val" id="count-val">${count}</span>
          <button id="count-plus" data-tooltip="More questions">+</button>
        </div>
      </div>
      <p class="faint" id="pool-hint" style="font-size:12px;margin:8px 4px 0"></p>
      <div class="section-title">Question types</div>
      <div class="type-grid">
        ${ALL_TYPES.map(t => `
          <button class="type-card ${mix[t] ? 'on' : ''}" data-type="${t}" data-tooltip="${typeTip(t)}">
            <div class="t-head">${typeGlyph(t)}${TYPE_META[t].name}</div>
            <div class="t-sub">${typeSub(t)}</div>
            <div class="t-count" data-count-for="${t}"></div>
          </button>`).join('')}
      </div>

      ${detectedTopics.length ? `
      <div class="section-title">Topics in this document</div>
      <div class="chip-row" id="topic-row">
        <button class="chip ${selectedTopics.size === 0 ? 'on' : ''}" data-topic-all data-tooltip="Include every topic in the quiz">All topics</button>
        ${detectedTopics.map(t => `
          <button class="chip ${selectedTopics.has(t.title) ? 'on' : ''}" data-topic="${esc(t.title)}" data-tooltip="Focus questions on this topic only">
            ${esc(t.title)} <span class="chip-count">${t.count}</span>
          </button>`).join('')}
      </div>
      <p class="faint" id="topic-hint" style="font-size:12px;margin:8px 4px 0"></p>` : ''}

      <div class="section-title">Difficulty</div>
      <div class="seg" id="diff-seg" data-tooltip="Easier = common terms · Harder = rare terms">
        <button data-diff="easy" class="${difficulty === 'easy' ? 'on' : ''}" data-tooltip="Common, frequently-appearing terms">Easy</button>
        <button data-diff="medium" class="${difficulty === 'medium' ? 'on' : ''}" data-tooltip="Balanced mix of terms">Medium</button>
        <button data-diff="hard" class="${difficulty === 'hard' ? 'on' : ''}" data-tooltip="Rare, specific technical terms">Hard</button>
      </div>

      <div class="section-title">Options</div>
      <div class="card" style="padding:2px 16px;border-top:1px solid var(--border)">
        <div class="row" data-tooltip="Google Gemini writes complete exam-style questions from the parsed content">
          <div><div class="label">AI-written questions</div><div class="sub">${hasApiKey() ? 'Gemini · key set' : 'Gemini · add a free key in Settings'}</div></div>
          <div class="switch ${aiOn ? 'on' : ''}" id="sw-ai" data-tooltip="Toggle AI question writing"></div>
        </div>
        <div class="row" data-tooltip="When on, the next attempt uses a new random order">
          <div><div class="label">Shuffle questions</div><div class="sub">Randomize order every attempt</div></div>
          <div class="switch ${shuffleOn ? 'on' : ''}" id="sw-shuffle" data-tooltip="Toggle shuffling"></div>
        </div>
        <div class="row">
          <div><div class="label">Timer</div><div class="sub">Seconds per question</div></div>
          <div class="seg" id="timer-seg" style="grid-auto-columns:auto;width:auto" data-tooltip="Add time pressure per question">
            ${[0, 15, 30].map(s => `<button data-sec="${s}" style="padding:8px 14px" class="${timerSec === s ? 'on' : ''}">${s === 0 ? 'Off' : s + 's'}</button>`).join('')}
          </div>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="On = brand-new questions each time; Off = identical quiz">
          <div><div class="label">Fresh questions each attempt</div><div class="sub">Regenerate from the document instead of repeating</div></div>
          <div class="switch ${fresh ? 'on' : ''}" id="sw-fresh" data-tooltip="Toggle fresh generation"></div>
        </div>
      </div>

      <div class="setup-actionbar">
        <button class="btn btn-primary" id="start-btn" style="font-size:15px;padding:15px">
          ${icon('play')} Start Quiz
        </button>
        <button class="btn btn-secondary" id="share-btn" style="margin-top:10px;width:100%" data-tooltip="Generate this quiz and get a link to send — no app or key needed to play">
          ${icon('share')} Share quiz link
        </button>
        <p class="center faint" id="gen-note" style="font-size:12px;margin-top:10px"></p>
      </div>
    </div>
  `

  const poolHint = root.querySelector('#pool-hint')
  const genNote = root.querySelector('#gen-note')
  const topicHint = root.querySelector('#topic-hint')

  function updateTopicUI() {
    root.querySelectorAll('#topic-row [data-topic]').forEach(chip => {
      chip.classList.toggle('on', selectedTopics.has(chip.dataset.topic))
    })
    root.querySelector('[data-topic-all]')?.classList.toggle('on', selectedTopics.size === 0)
    if (topicHint) {
      topicHint.textContent = selectedTopics.size
        ? `Focusing on ${selectedTopics.size} topic${selectedTopics.size === 1 ? '' : 's'} — other topics are excluded`
        : 'Questions will cover the whole document'
    }
  }

  root.querySelectorAll('#topic-row [data-topic]').forEach(chip =>
    chip.addEventListener('click', () => {
      const t = chip.dataset.topic
      if (selectedTopics.has(t)) selectedTopics.delete(t)
      else selectedTopics.add(t)
      updateTopicUI()
      refreshEstimate()
      updateCounts()
    })
  )
  root.querySelector('[data-topic-all]')?.addEventListener('click', () => {
    selectedTopics.clear()
    updateTopicUI()
    refreshEstimate()
    updateCounts()
  })
  updateTopicUI()

  function refreshEstimate() {
    maxAvailable = estimateAvailable(doc, {
      count: 999, mix: { ...mix }, difficulty, topics: [...selectedTopics]
    })
    if (count > maxAvailable) count = Math.max(1, maxAvailable)
    root.querySelector('#count-val').textContent = count
    if (poolHint) {
      poolHint.textContent = maxAvailable < 5
        ? `This document supports about ${maxAvailable} question${maxAvailable === 1 ? '' : 's'} with current settings`
        : `Up to ~${maxAvailable} questions available from this document`
    }
  }

  function updateCounts() {
    const enabled = ALL_TYPES.filter(t => mix[t])
    const total = enabled.length ? count : 0
    for (const t of ALL_TYPES) {
      const el = root.querySelector(`[data-count-for="${t}"]`)
      el.textContent = mix[t] ? `~${Math.max(1, Math.round(total / enabled.length))} questions` : 'Off'
    }
    genNote.textContent = enabled.length
      ? ''
      : 'Select at least one question type'
    root.querySelector('#start-btn').disabled = !enabled.length
  }
  updateCounts()
  refreshEstimate()

  function setCount(n) {
    count = Math.min(maxAvailable || 200, Math.min(200, Math.max(1, n)))
    root.querySelector('#count-val').textContent = count
    updateCounts()
  }
  root.querySelector('#count-minus').addEventListener('click', () => setCount(count - (count > 10 ? 5 : 1)))
  root.querySelector('#count-plus').addEventListener('click', () => setCount(count + (count >= 10 ? 5 : 1)))

  root.querySelectorAll('.type-card').forEach(card =>
    card.addEventListener('click', () => {
      const t = card.dataset.type
      const onCount = Object.values(mix).filter(Boolean).length
      if (mix[t] && onCount === 1) return
      mix[t] = !mix[t]
      card.classList.toggle('on', mix[t])
      updateCounts()
    })
  )

  root.querySelectorAll('#diff-seg button').forEach(b =>
    b.addEventListener('click', () => {
      difficulty = b.dataset.diff
      root.querySelectorAll('#diff-seg button').forEach(x => x.classList.toggle('on', x === b))
      refreshEstimate()
      updateCounts()
    })
  )
  root.querySelectorAll('#timer-seg button').forEach(b =>
    b.addEventListener('click', () => {
      timerSec = parseInt(b.dataset.sec, 10)
      root.querySelectorAll('#timer-seg button').forEach(x => x.classList.toggle('on', x === b))
    })
  )

  root.querySelector('#sw-ai').addEventListener('click', e => {
    aiOn = !aiOn
    e.currentTarget.classList.toggle('on', aiOn)
  })
  root.querySelector('#sw-shuffle').addEventListener('click', e => {
    shuffleOn = !shuffleOn
    e.currentTarget.classList.toggle('on', shuffleOn)
  })
  root.querySelector('#sw-fresh').addEventListener('click', e => {
    fresh = !fresh
    e.currentTarget.classList.toggle('on', fresh)
  })

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('library'))
  root.querySelector('#theme-btn').addEventListener('click', () => ctx.toggleTheme())
  root.querySelector('#start-btn').addEventListener('click', () => {
    ctx.saveConfig(doc.id, {
      count, mix: { ...mix }, difficulty, shuffle: shuffleOn, timerSec, fresh,
      topics: [...selectedTopics],
      ai: aiOn,
      fixedSeed: null
    })
    ctx.go('quiz')
  })

  root.querySelector('#share-btn').addEventListener('click', async () => {
    const btn = root.querySelector('#share-btn')
    const prevHtml = btn.innerHTML
    btn.disabled = true
    btn.textContent = 'Generating…'
    try {
      const cfg = { count, mix: { ...mix }, difficulty, shuffle: shuffleOn, timerSec, fresh, topics: [...selectedTopics], ai: aiOn }
      let gen = null
      if (cfg.ai && hasApiKey()) {
        gen = await generateQuizAI(doc, cfg, () => {})
      }
      if (!gen || gen.error === 'not_enough_content' || !gen.questions || !gen.questions.length) {
        gen = generateQuiz(doc, cfg)
      }
      if (!gen || !gen.questions || !gen.questions.length) {
        ctx.toast('Not enough content to build a shareable quiz', true)
        return
      }
      showShareModal(ctx, { title: doc.name, questions: gen.questions, timerSec: cfg.timerSec, mode: 'quiz' })
    } catch {
      ctx.toast('Could not create a share link', true)
    } finally {
      btn.disabled = false
      btn.innerHTML = prevHtml
    }
  })

  void poolHint
}

function typeGlyph(t) {
  return {
    mcq: icon('listChecks'),
    tf: icon('check'),
    fib: icon('fileText'),
    id: icon('target')
  }[t]
}

function typeSub(t) {
  return {
    mcq: 'Pick from 4 choices',
    tf: 'Judge the statement',
    fib: 'Complete the sentence',
    id: 'Name the missing term'
  }[t]
}
function typeTip(t) {
  return {
    mcq: 'Choose the correct answer from 4 options',
    tf: 'Decide if the statement is true or false',
    fib: 'Fill the blank — complete the sentence',
    id: 'Type the term that matches the description'
  }[t]
}
