import { saveSettings, listAccounts } from '../../lib/storage.js'
import { onboardingArt } from '../art.js'
import { assetUrl } from '../../lib/assets.js'

const SLIDES = [
  {
    art: 'logo',
    eyebrow: 'Meet Quizard',
    title: 'Turn any document into practice',
    body: 'Your notes, slides and readings become instant quizzes. Study from what you already have — anywhere, even offline.',
    accent: 'purple'
  },
  {
    art: 'fileText',
    eyebrow: 'Any format',
    title: 'PDF, Word, PowerPoint & text',
    body: 'Drop a file or paste text. We extract the key ideas on-device in seconds — no upload, no account needed.',
    accent: 'blue'
  },
  {
    art: 'zap',
    eyebrow: 'Your way',
    title: 'Four question types, fully tunable',
    body: 'Multiple choice, true/false, fill-in-the-blank and identification. Set the count, difficulty and timer — then go.',
    accent: 'amber'
  },
  {
    art: 'lock',
    eyebrow: 'Private by design',
    title: 'Your data stays on this device',
    body: 'Your files, scores and questions are generated locally. AI question writing and wizard voice are optional cloud features — everything else works offline.',
    accent: 'green'
  }
]

export function render(root, ctx) {
  let idx = 0

  root.innerHTML = `
    <div class="onb-wrap">
      <div class="onb-top">
        <button class="onb-skip" id="onb-skip" data-tooltip="Skip the introduction">Skip</button>
        <div class="onb-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="1" aria-valuemax="${SLIDES.length}" aria-valuenow="1" id="onb-progress">
          <div class="onb-progress-fill" id="onb-progress-fill"></div>
        </div>
      </div>
      <div class="onb-viewport">
        <div class="onb-slides" id="onb-slides">
          ${SLIDES.map((s, i) => `
            <div class="onb-slide" data-accent="${s.accent}">
              <div class="onb-stage">
                <div class="onb-glow"></div>
                <div class="onb-illust">${i === 0 ? `<img class="wiz-hero" src="${assetUrl('wizard/wizard-image.jpg')}" alt="Quizard wizard">` : onboardingArt[i]}</div>
              </div>
              <div class="onb-copy">
                <div class="onb-eyebrow">${s.eyebrow}</div>
                <h2>${s.title}</h2>
                <p>${s.body}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="onb-dots" aria-hidden="true">
          ${SLIDES.map((_, i) => `<span class="onb-dot ${i === 0 ? 'on' : ''}"></span>`).join('')}
        </div>
        <div class="onb-cta-row">
          <button class="onb-back" id="onb-back" type="button" aria-label="Previous slide" hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="btn btn-primary onb-next" id="onb-next">
            <span class="onb-next-label">Continue</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  `

  const slidesEl = root.querySelector('#onb-slides')
  const dots = [...root.querySelectorAll('.onb-dot')]
  const nextBtn = root.querySelector('#onb-next')
  const backBtn = root.querySelector('#onb-back')
  const nextLabel = root.querySelector('.onb-next-label')
  const progressEl = root.querySelector('#onb-progress')
  const progressFill = root.querySelector('#onb-progress-fill')
  const wrap = root.querySelector('.onb-wrap')

  async function finish() {
    saveSettings({ onboarded: true })
    const accounts = await listAccounts()
    if (!accounts.length || (accounts.length === 1 && accounts[0].name === 'My account')) {
      ctx.state.accountFlow = { mode: 'create' }
      ctx.go('accounts')
    } else {
      ctx.go('library')
    }
  }

  function update() {
    slidesEl.style.transform = `translateX(-${idx * 100}%)`
    // mark the active slide so its art + copy replay their entrance
    ;[...slidesEl.children].forEach((el, i) => el.classList.toggle('active', i === idx))
    dots.forEach((d, i) => d.classList.toggle('on', i === idx))
    const isLast = idx === SLIDES.length - 1
    nextLabel.textContent = isLast ? 'Get Started' : 'Continue'
    backBtn.hidden = idx === 0
    wrap.dataset.idx = String(idx)
    const pct = ((idx + 1) / SLIDES.length) * 100
    progressFill.style.width = pct + '%'
    progressEl.setAttribute('aria-valuenow', String(idx + 1))
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

  root.querySelector('#onb-skip').addEventListener('click', finish)

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
  if (!root) return
  // The keydown listener is bound to root; removing root from the DOM on
  // screen transitions automatically drops the listener, so no teardown is
  // required. This stub exists so renderScreen()'s generic unmount path works.
}
