import{t as e}from"./assets-C7X78vgS.js";import"./index-rFn9O_LP.js";var t=Array.from({length:10},(e,t)=>`<i style="--a:${t*36}deg;--d:${(.45+t*.045).toFixed(2)}s"></i>`).join(``),n=[{l:`16%`,t:`24%`,d:`0s`},{l:`82%`,t:`18%`,d:`.5s`},{l:`70%`,t:`64%`,d:`1s`},{l:`24%`,t:`70%`,d:`1.4s`},{l:`10%`,t:`48%`,d:`.8s`},{l:`88%`,t:`46%`,d:`1.8s`},{l:`40%`,t:`14%`,d:`1.1s`},{l:`58%`,t:`82%`,d:`.3s`}].map(e=>`<i style="left:${e.l};top:${e.t};animation-delay:${e.d}"></i>`).join(``);function r(r,i){r.innerHTML=`
    <div class="welcome" id="welcome">
      <div class="welcome-dust" aria-hidden="true">${n}</div>
      <div class="welcome-inner">
        <div class="welcome-mark">
          <span class="wm-halo"></span>
          <span class="wm-rune"></span>
          <span class="wm-rune r2"></span>
          <span class="wm-circle"></span>
          <span class="wm-icon"><img class="wiz-hero" src="${e(`wizard/wizard-welcome.jpg`)}" alt="Quizard wizard"></span>
          <span class="wm-sparks" aria-hidden="true">${t}</span>
        </div>
        <h1 class="welcome-title">
          <span class="wt-line">Welcome to</span>
          <span class="wt-name">Quizard</span>
        </h1>
        <p class="welcome-sub">Your documents, forged into quizzes.</p>
      </div>
      <div class="welcome-progress"><span></span></div>
    </div>
  `;let a=!1;function o(){a||(a=!0,r.querySelector(`#welcome`).classList.add(`exit`),setTimeout(()=>{i.go(i.state.afterIntro||(i.state.accountsExist?`accounts`:`onboarding`)),i.state.pendingResumeAsk&&(i.state.pendingResumeAsk=!1,i.state.resumeBanner&&(i.requestResume(),i.go(`quiz`)))},430))}let s=i.state.shortIntro,c=setTimeout(o,s?1100:2050);r.querySelector(`#welcome`).addEventListener(`click`,()=>{clearTimeout(c),o()})}export{r as render};