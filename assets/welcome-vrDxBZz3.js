var e=Array.from({length:10},(e,t)=>`<i style="--a:${t*36}deg;--d:${(.45+t*.045).toFixed(2)}s"></i>`).join(``),t=[{l:`16%`,t:`24%`,d:`0s`},{l:`82%`,t:`18%`,d:`.5s`},{l:`70%`,t:`64%`,d:`1s`},{l:`24%`,t:`70%`,d:`1.4s`},{l:`10%`,t:`48%`,d:`.8s`},{l:`88%`,t:`46%`,d:`1.8s`},{l:`40%`,t:`14%`,d:`1.1s`},{l:`58%`,t:`82%`,d:`.3s`}].map(e=>`<i style="left:${e.l};top:${e.t};animation-delay:${e.d}"></i>`).join(``);function n(n,r){n.innerHTML=`
    <div class="welcome" id="welcome">
      <div class="welcome-dust" aria-hidden="true">${t}</div>
      <div class="welcome-inner">
        <div class="welcome-mark">
          <span class="wm-halo"></span>
          <span class="wm-rune"></span>
          <span class="wm-rune r2"></span>
          <span class="wm-circle"></span>
          <span class="wm-icon"><img class="wiz-hero" src="/wizard/wizard-welcome.jpg" alt="Quizard wizard"></span>
          <span class="wm-sparks" aria-hidden="true">${e}</span>
        </div>
        <h1 class="welcome-title">
          <span class="wt-line">Welcome to</span>
          <span class="wt-name">Quizard</span>
        </h1>
        <p class="welcome-sub">Your documents, forged into quizzes.</p>
      </div>
      <div class="welcome-progress"><span></span></div>
    </div>
  `;let i=!1;function a(){i||(i=!0,n.querySelector(`#welcome`).classList.add(`exit`),setTimeout(()=>{r.go(r.state.afterIntro||(r.state.accountsExist?`accounts`:`onboarding`)),r.state.pendingResumeAsk&&(r.state.pendingResumeAsk=!1,r.state.resumeBanner&&(r.requestResume(),r.go(`quiz`)))},430))}let o=r.state.shortIntro,s=setTimeout(a,o?1100:2050);n.querySelector(`#welcome`).addEventListener(`click`,()=>{clearTimeout(s),a()})}export{n as render};