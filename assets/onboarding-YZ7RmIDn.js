import{t as e}from"./assets-C7X78vgS.js";import{X as t,lt as n,s as r}from"./index-rFn9O_LP.js";var i=[{art:`logo`,eyebrow:`Meet Quizard`,title:`Turn any document into practice`,body:`Your notes, slides and readings become instant quizzes. Study from what you already have — anywhere, even offline.`,accent:`purple`},{art:`fileText`,eyebrow:`Any format`,title:`PDF, Word, PowerPoint & text`,body:`Drop a file or paste text. We extract the key ideas on-device in seconds — no upload, no account needed.`,accent:`blue`},{art:`zap`,eyebrow:`Your way`,title:`Four question types, fully tunable`,body:`Multiple choice, true/false, fill-in-the-blank and identification. Set the count, difficulty and timer — then go.`,accent:`amber`},{art:`lock`,eyebrow:`Private by design`,title:`Your data stays on this device`,body:`Your files, scores and questions are generated locally. AI question writing and wizard voice are optional cloud features — everything else works offline.`,accent:`green`}];function a(a,o){let s=0;a.innerHTML=`
    <div class="onb-wrap">
      <div class="onb-top">
        <button class="onb-skip" id="onb-skip" data-tooltip="Skip the introduction">Skip</button>
        <div class="onb-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="1" aria-valuemax="${i.length}" aria-valuenow="1" id="onb-progress">
          <div class="onb-progress-fill" id="onb-progress-fill"></div>
        </div>
      </div>
      <div class="onb-viewport">
        <div class="onb-slides" id="onb-slides">
          ${i.map((t,n)=>`
            <div class="onb-slide" data-accent="${t.accent}">
              <div class="onb-stage">
                <div class="onb-glow"></div>
                <div class="onb-illust">${n===0?`<img class="wiz-hero" src="${e(`wizard/wizard-image.jpg`)}" alt="Quizard wizard">`:r[n]}</div>
              </div>
              <div class="onb-copy">
                <div class="onb-eyebrow">${t.eyebrow}</div>
                <h2>${t.title}</h2>
                <p>${t.body}</p>
              </div>
            </div>`).join(``)}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="onb-dots" aria-hidden="true">
          ${i.map((e,t)=>`<span class="onb-dot ${t===0?`on`:``}"></span>`).join(``)}
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
  `;let c=a.querySelector(`#onb-slides`),l=[...a.querySelectorAll(`.onb-dot`)],u=a.querySelector(`#onb-next`),d=a.querySelector(`#onb-back`),f=a.querySelector(`.onb-next-label`),p=a.querySelector(`#onb-progress`),m=a.querySelector(`#onb-progress-fill`),h=a.querySelector(`.onb-wrap`);async function g(){n({onboarded:!0});let e=await t();!e.length||e.length===1&&e[0].name===`My account`?(o.state.accountFlow={mode:`create`},o.go(`accounts`)):o.go(`library`)}function _(){c.style.transform=`translateX(-${s*100}%)`,[...c.children].forEach((e,t)=>e.classList.toggle(`active`,t===s)),l.forEach((e,t)=>e.classList.toggle(`on`,t===s));let e=s===i.length-1;f.textContent=e?`Get Started`:`Continue`,d.hidden=s===0,h.dataset.idx=String(s);let t=(s+1)/i.length*100;m.style.width=t+`%`,p.setAttribute(`aria-valuenow`,String(s+1))}function v(e,t){let n=document.createElement(`span`);if(n.className=`press-ripple`,t){let r=e.getBoundingClientRect();n.style.left=t.clientX-r.left+`px`,n.style.top=t.clientY-r.top+`px`}else n.style.left=`50%`,n.style.top=`50%`;e.appendChild(n),setTimeout(()=>n.remove(),600),e.classList.remove(`fly`),e.offsetWidth,e.classList.add(`fly`)}function y(e){let t=a.querySelector(`.onb-viewport`);t&&(t.classList.remove(`push-forward`,`push-back`),t.offsetWidth,t.classList.add(e>0?`push-forward`:`push-back`))}u.addEventListener(`click`,e=>{v(u,e),s<i.length-1?(s++,y(1),_()):g()}),d.addEventListener(`click`,()=>{s>0&&(s--,v(d),y(-1),_())}),a.querySelector(`#onb-skip`).addEventListener(`click`,g),a.addEventListener(`keydown`,e=>{e.key===`ArrowRight`||e.key===` `?(e.preventDefault(),s<i.length-1?(s++,v(u),y(1),_()):g()):e.key===`ArrowLeft`?(e.preventDefault(),s>0&&(s--,v(d),y(-1),_())):e.key===`Escape`&&g()}),a.tabIndex=0,a.focus();let b=null,x=a.querySelector(`.onb-viewport`);x.addEventListener(`touchstart`,e=>{b=e.touches[0].clientX},{passive:!0}),x.addEventListener(`touchend`,e=>{if(b==null)return;let t=e.changedTouches[0].clientX-b;t<-45&&s<i.length-1?(s++,y(1),_()):t>45&&s>0&&(s--,y(-1),_()),b=null},{passive:!0}),_()}function o(e){}export{a as render,o as unmount};