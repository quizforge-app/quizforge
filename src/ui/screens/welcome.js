import { icon } from '../icons.js'

export function render(root, ctx) {
  root.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-inner">
        <div class="welcome-mark">
          <span class="wm-circle"></span>
          <span class="wm-icon">${icon('logo')}</span>
        </div>
        <h1 class="welcome-title">
          <span class="wt-line">Welcome to</span>
          <span class="wt-name">QuizForge</span>
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
    const accountsExist = ctx.state.accountsExist
    if (accountsExist) ctx.go('accounts')
    else ctx.go('onboarding')
  }

  const timer = setTimeout(advance, 2400)
  root.querySelector('#welcome').addEventListener('click', () => {
    clearTimeout(timer)
    advance()
  })
}
