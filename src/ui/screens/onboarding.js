import { saveSettings, listAccounts } from '../../lib/storage.js'
import { onboardingArt } from '../art.js'

const SLIDES = [
  {
    art: 'logo',
    title: 'Welcome to QuizForge',
    body: 'Turn your documents into instant practice quizzes. Study smarter with questions generated right from your own material.'
  },
  {
    art: 'fileText',
    title: 'Any document format',
    body: 'PDF, Word (.docx) and PowerPoint (.pptx) are all supported. Text is extracted directly on your phone in seconds.'
  },
  {
    art: 'zap',
    title: 'Instant quizzes, your way',
    body: 'Choose multiple choice, true or false, fill-in-the-blank and identification. Set the count, difficulty, timer — everything is customizable.'
  },
  {
    art: 'lock',
    title: 'Private by design',
    body: 'Your files and scores stay on this device. Tip: add a free Gemini key in Settings for AI-polished questions.'
  }
]

export function render(root, ctx) {
  let idx = 0

  root.innerHTML = `
    <div class="onb-wrap">
      <button class="onb-skip" id="onb-skip" data-tooltip="Skip the introduction">Skip</button>
      <div class="onb-viewport">
        <div class="onb-slides" id="onb-slides">
          ${SLIDES.map((s, i) => `
            <div class="onb-slide">
              <div class="onb-illust">${onboardingArt[i]}</div>
              <h2>${s.title}</h2>
              <p>${s.body}</p>
            </div>`).join('')}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="onb-dots">
          ${SLIDES.map((_, i) => `<span class="onb-dot ${i === 0 ? 'on' : ''}"></span>`).join('')}
        </div>
        <button class="btn btn-primary" id="onb-next">Continue</button>
      </div>
    </div>
  `

  const slidesEl = root.querySelector('#onb-slides')
  const dots = [...root.querySelectorAll('.onb-dot')]
  const nextBtn = root.querySelector('#onb-next')

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
    dots.forEach((d, i) => d.classList.toggle('on', i === idx))
    nextBtn.textContent = idx === SLIDES.length - 1 ? 'Get Started' : 'Continue'
  }

  nextBtn.addEventListener('click', () => {
    if (idx < SLIDES.length - 1) {
      idx++
      update()
    } else {
      finish()
    }
  })

  root.querySelector('#onb-skip').addEventListener('click', finish)

  let touchStartX = null
  const viewport = root.querySelector('.onb-viewport')
  viewport.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX }, { passive: true })
  viewport.addEventListener('touchend', e => {
    if (touchStartX == null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (dx < -45 && idx < SLIDES.length - 1) { idx++; update() }
    else if (dx > 45 && idx > 0) { idx--; update() }
    touchStartX = null
  }, { passive: true })
}
