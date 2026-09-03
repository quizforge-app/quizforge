import { loadSettings, saveSettings, listAccounts, getActiveAccountId, setActiveAccount, listDocs } from '../../lib/storage.js'

// ── Static screenshot tutorial ──
// A swipeable slide deck showing real screenshots of the app with glowing
// highlight rings + "Tap here" labels. Replaces the live coachmark tour.

const SLIDES = [
  {
    screen: 'library-empty',
    img: '/wizard/slides/slide-1-library-empty.jpg',
    mp3: 'tut-library-empty',
    portrait: 'tut-add',
    title: 'Your Library',
    text: 'Welcome! Tap the + to add your first PDF, Word or text file — I\'ll turn its pages into instant practice quizzes.',
    // highlight: null → the artwork already has its glowing callout baked in
    highlight: null,
    accent: 'purple'
  },
  {
    screen: 'library-tour',
    img: '/wizard/slides/slide-2-library-tour.jpg',
    mp3: 'tut-library-tour',
    portrait: 'tut-add',
    title: 'Your Library',
    text: 'This is your Library — tap + to add a document, or tap Quiz on any document to start studying.',
    highlight: null,
    accent: 'purple'
  },
  {
    screen: 'import',
    img: '/wizard/slides/slide-3-import.jpg',
    mp3: 'tut-import',
    portrait: 'tut-import',
    title: 'Add a Document',
    text: 'Drop a file or paste text here. Your document is processed locally — I read it and craft questions from the key ideas.',
    highlight: null,
    accent: 'blue'
  },
  {
    screen: 'setup',
    img: '/wizard/slides/slide-4-setup.jpg',
    mp3: 'tut-setup',
    portrait: 'tut-setup',
    title: 'Quiz Setup',
    text: 'Pick how many questions and which styles fit your goal, then hit Start Quiz. You can tweak difficulty and focus your weak spots anytime.',
    highlight: { x: 10, y: 73, w: 80, h: 7, label: 'Start Quiz' },
    accent: 'amber'
  },
  {
    screen: 'quiz-first',
    img: '/wizard/slides/slide-5-quiz-first.jpg',
    mp3: 'tut-quiz-first',
    portrait: 'tut-quiz',
    title: 'Answer Questions',
    text: 'Read each question carefully and choose the best answer — I\'ll show you why afterwards.',
    highlight: null,
    accent: 'blue'
  },
  {
    screen: 'quiz-correct',
    img: '/wizard/slides/slide-6-quiz-correct.jpg',
    mp3: 'tut-quiz-correct',
    portrait: 'tut-correct',
    title: 'Correct!',
    text: 'Well reasoned — that\'s the right one! Tap Next Question to continue.',
    highlight: null,
    accent: 'green'
  },
  {
    screen: 'quiz-wrong',
    img: '/wizard/slides/slide-7-quiz-wrong.jpg',
    mp3: 'tut-quiz-wrong',
    portrait: 'tut-wrong',
    title: 'Not Quite',
    text: 'Not quite — here\'s the reasoning so it sticks next time. Review the explanation and tap Next.',
    highlight: null,
    accent: 'amber'
  },
  {
    screen: 'progress',
    img: '/wizard/slides/slide-8-progress.jpg',
    mp3: 'tut-progress-first',
    portrait: 'tut-progress',
    title: 'Your Progress',
    text: 'This is your progress map — streaks, scores and the terms you stumble on. Revisit weak spots to master the subject.',
    highlight: null,
    accent: 'purple'
  },
  {
    screen: 'quiz-done',
    img: '/wizard/slides/slide-9-quiz-done.jpg',
    mp3: 'tut-quiz-done',
    portrait: 'tut-done',
    title: 'All Done!',
    text: 'First trial complete! Practice these and the weak spots fade. You can replay this tour anytime in Settings.',
    highlight: null,
    accent: 'green'
  }
]

// ── Audio cache ──
// Narration clips load lazily: current + next slide only, instead of
// ~1.1MB of MP3s upfront on a possibly-metered connection.
const audioCache = new Map()
let audioEl = null
let audioUnlocked = false
let pendingPlayName = null

function cacheAudio(name) {
  if (audioCache.has(name)) return
  const a = new Audio()
  a.preload = 'auto'
  a.src = `/wizard/${name}.mp3`
  a.load()
  audioCache.set(name, a)
}

function preloadAudioAround(idx) {
  cacheAudio(SLIDES[idx].mp3)
  if (SLIDES[idx + 1]) cacheAudio(SLIDES[idx + 1].mp3)
}

// Browsers block audio until the user interacts with the page — if play()
// is refused, remember the clip and replay it on the first gesture.
function setupAudioUnlock() {
  if (audioUnlocked) return
  const unlock = () => {
    audioUnlocked = true
    if (pendingPlayName) {
      const n = pendingPlayName
      pendingPlayName = null
      playAudio(n)
    }
  }
  addEventListener('click', unlock, { once: true })
  addEventListener('touchstart', unlock, { once: true })
  addEventListener('keydown', unlock, { once: true })
}

function voiceOn() {
  return loadSettings().wizardVoice !== false
}

function playAudio(name) {
  if (!voiceOn()) return Promise.resolve()
  const cached = audioCache.get(name)
  if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'auto' }
  try {
    audioEl.src = cached ? cached.src : `/wizard/${name}.mp3`
    audioEl.volume = 1
    audioEl.muted = false
    const p = audioEl.play()
    if (p && p.catch) p.catch(err => {
      if (err && err.name === 'NotAllowedError') pendingPlayName = name
    })
    return new Promise(resolve => {
      audioEl.onended = () => { audioEl.onended = null; resolve() }
      audioEl.onerror = () => { audioEl.onerror = null; resolve() }
      setTimeout(resolve, 15000)
    })
  } catch { return Promise.resolve() }
}

function stopAudio() {
  if (audioEl) { try { audioEl.pause() } catch {} }
}

function iconArrow() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>'
}

function iconBack() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
}

export function render(root, ctx) {
  let idx = 0
  preloadAudioAround(0)
  setupAudioUnlock()

  // Resume quiz state from the same session
  let previousScreen = null
  try {
    const s = loadSettings()
    previousScreen = ctx.state.screen
  } catch {}

  root.innerHTML = `
    <div class="tut-wrap">
      <div class="onb-top">
        <button class="onb-skip" id="tut-skip" data-tooltip="Skip the tutorial">Skip</button>
        <div class="onb-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="1" aria-valuemax="${SLIDES.length}" aria-valuenow="1" id="tut-progress">
          <div class="onb-progress-fill" id="tut-progress-fill"></div>
        </div>
      </div>
      <div class="onb-viewport">
        <div class="tut-slides" id="tut-slides">
          ${SLIDES.map((s, i) => `
            <div class="tut-slide" data-accent="${s.accent}">
              <div class="tut-stage">
                <div class="tut-phone">
                  ${i < 2
                    ? `<img class="tut-screenshot" src="${s.img}" alt="${s.title}" decoding="async" fetchpriority="high" />`
                    : `<img class="tut-screenshot" data-src="${s.img}" alt="${s.title}" decoding="async" loading="lazy" />`}
                  ${s.highlight ? `
                  <div class="tut-highlight-ring" style="left:${s.highlight.x}%;top:${s.highlight.y}%;width:${s.highlight.w}%;height:${s.highlight.h}%;">
                    <div class="tut-highlight-glow"></div>
                    <div class="tut-highlight-label">${s.highlight.label}</div>
                  </div>` : ''}
                </div>
              </div>
              <div class="tut-copy">
                <div class="tut-portrait">
                  <img class="tut-wiz" src="/wizard/${s.portrait}.jpg" alt="" decoding="async" />
                  <div class="tut-portrait-glow"></div>
                </div>
                <div class="tut-text">
                  <h2>${s.title}</h2>
                  <p>${s.text}</p>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="tut-dots" aria-hidden="true">
          ${SLIDES.map((_, i) => `<span class="onb-dot ${i === 0 ? 'on' : ''}"></span>`).join('')}
        </div>
        <div class="onb-cta-row">
          <button class="onb-back" id="tut-back" type="button" aria-label="Previous slide" hidden>
            ${iconBack()}
          </button>
          <button class="btn btn-primary onb-next" id="tut-next">
            <span class="onb-next-label">Continue</span>
            ${iconArrow()}
          </button>
        </div>
      </div>
    </div>
  `

  const slidesEl = root.querySelector('#tut-slides')
  const dots = [...root.querySelectorAll('.onb-dot')]
  const nextBtn = root.querySelector('#tut-next')
  const backBtn = root.querySelector('#tut-back')
  const nextLabel = root.querySelector('.onb-next-label')
  const progressEl = root.querySelector('#tut-progress')
  const progressFill = root.querySelector('#tut-progress-fill')
  const wrap = root.querySelector('.tut-wrap')

  // Promote lazy screenshots to real srcs: the current slide plus the next
  // one, so swiping never shows a blank frame while the image streams in.
  function loadSlideImage(i) {
    const img = slidesEl.children[i]?.querySelector('img[data-src]')
    if (img) {
      img.src = img.dataset.src
      img.removeAttribute('data-src')
    }
  }
  function loadImagesAround() {
    loadSlideImage(idx)
    if (idx + 1 < SLIDES.length) loadSlideImage(idx + 1)
  }

  async function finish() {
    stopAudio()
    // mark THIS account as having seen the tutorial (per-profile, not global)
    const aid = ctx.state.account?.id || null
    const doneMap = { ...(loadSettings().tutorialDoneAccounts || {}) }
    if (aid) doneMap[aid] = true
    saveSettings({ tutorialDone: true, tutorialDoneAccounts: doneMap })
    ctx.go('library')
  }

  function update() {
    slidesEl.style.transform = `translateX(-${idx * 100}%)`
    // replay the active slide's entrance choreography
    ;[...slidesEl.children].forEach((el, i) => el.classList.toggle('active', i === idx))
    loadImagesAround()
    dots.forEach((d, i) => d.classList.toggle('on', i === idx))
    const isLast = idx === SLIDES.length - 1
    nextLabel.textContent = isLast ? 'Get Started' : 'Continue'
    backBtn.hidden = idx === 0
    wrap.dataset.idx = String(idx)
    const pct = ((idx + 1) / SLIDES.length) * 100
    progressFill.style.width = pct + '%'
    progressEl.setAttribute('aria-valuenow', String(idx + 1))
    // Play voice for this slide
    stopAudio()
    preloadAudioAround(idx)
    setTimeout(() => playAudio(SLIDES[idx].mp3), 200)
  }

  // Smooth Continue: ripple at the tap point, arrow fly, direction-aware push
  function pressFx(btn, e) {
    const ripple = document.createElement('span')
    ripple.className = 'press-ripple'
    if (e) {
      const r = btn.getBoundingClientRect()
      ripple.style.left = (e.clientX - r.left) + 'px'
      ripple.style.top = (e.clientY - r.top) + 'px'
    } else {
      ripple.style.left = '50%'
      ripple.style.top = '50%'
    }
    btn.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
    btn.classList.remove('fly')
    void btn.offsetWidth
    btn.classList.add('fly')
  }
  function pushFx(dir) {
    const vp = root.querySelector('.onb-viewport')
    if (!vp) return
    vp.classList.remove('push-forward', 'push-back')
    void vp.offsetWidth
    vp.classList.add(dir > 0 ? 'push-forward' : 'push-back')
  }

  nextBtn.addEventListener('click', e => {
    pressFx(nextBtn, e)
    if (idx < SLIDES.length - 1) {
      idx++
      pushFx(1)
      update()
    } else {
      finish()
    }
  })

  backBtn.addEventListener('click', () => {
    if (idx > 0) { idx--; pressFx(backBtn); pushFx(-1); update() }
  })

  root.querySelector('#tut-skip').addEventListener('click', finish)

  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      if (idx < SLIDES.length - 1) { idx++; pressFx(nextBtn); pushFx(1); update() }
      else finish()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (idx > 0) { idx--; pressFx(backBtn); pushFx(-1); update() }
    } else if (e.key === 'Escape') {
      finish()
    }
  }
  root.addEventListener('keydown', onKey)
  root.tabIndex = 0
  root.focus()

  let touchStartX = null
  const viewport = root.querySelector('.onb-viewport')
  viewport.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX }, { passive: true })
  viewport.addEventListener('touchend', e => {
    if (touchStartX == null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (dx < -45 && idx < SLIDES.length - 1) { idx++; pushFx(1); update() }
    else if (dx > 45 && idx > 0) { idx--; pushFx(-1); update() }
    touchStartX = null
  }, { passive: true })

  update()
}

export function unmount(root) {
  stopAudio()
  if (!root) return
}
