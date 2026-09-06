import { icon } from '../icons.js'
import { assetUrl } from '../../lib/assets.js'

const SPARKS = Array.from({ length: 10 }, (_, i) =>
  `<i style="--a:${i * 36}deg;--d:${(0.45 + i * 0.045).toFixed(2)}s"></i>`
).join('')

const DUST = [
  { l: '16%', t: '24%', d: '0s' },   { l: '82%', t: '18%', d: '.5s' },
  { l: '70%', t: '64%', d: '1s' },   { l: '24%', t: '70%', d: '1.4s' },
  { l: '10%', t: '48%', d: '.8s' },  { l: '88%', t: '46%', d: '1.8s' },
  { l: '40%', t: '14%', d: '1.1s' }, { l: '58%', t: '82%', d: '.3s' }
].map(p => `<i style="left:${p.l};top:${p.t};animation-delay:${p.d}"></i>`).join('')

export function render(root, ctx) {
  root.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-dust" aria-hidden="true">${DUST}</div>
      <div class="welcome-inner">
        <div class="welcome-mark">
          <span class="wm-halo"></span>
          <span class="wm-rune"></span>
          <span class="wm-rune r2"></span>
          <span class="wm-circle"></span>
          <span class="wm-icon"><img class="wiz-hero" src="${assetUrl('wizard/wizard-welcome.jpg')}" alt="Quizard wizard"></span>
          <span class="wm-sparks" aria-hidden="true">${SPARKS}</span>
        </div>
        <h1 class="welcome-title">
          <span class="wt-line">Welcome to</span>
          <span class="wt-name">Quizard</span>
        </h1>
        <p class="welcome-sub">Your documents, forged into quizzes.</p>
      </div>
      <div class="welcome-progress"><span></span></div>
    </div>
  `

  let done = false
  function advance() {
    if (done) return
    done = true
    // play the "poof" exit before handing over to the post-intro screen
    // (main.js computes it per boot: library, onboarding, accounts, …)
    root.querySelector('#welcome').classList.add('exit')
    setTimeout(() => {
      ctx.go(ctx.state.afterIntro || (ctx.state.accountsExist ? 'accounts' : 'onboarding'))
      // a quiz was in progress when the app closed — resume straight into it
      if (ctx.state.pendingResumeAsk) {
        ctx.state.pendingResumeAsk = false
        if (ctx.state.resumeBanner) {
          ctx.requestResume()
          ctx.go('quiz')
        }
      }
    }, 430)
  }

  // First launch: full 2s show. Repeat launches: a quick beat, then through.
  const short = ctx.state.shortIntro
  const timer = setTimeout(advance, short ? 1100 : 2050)
  root.querySelector('#welcome').addEventListener('click', () => {
    clearTimeout(timer)
    advance()
  })
}
