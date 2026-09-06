import{X as e,lt as t,s as n}from"./index-CybBJgOJ.js";var r=[{art:`logo`,eyebrow:`Meet Quizard`,title:`Turn any document into practice`,body:`Your notes, slides and readings become instant quizzes. Study from what you already have — anywhere, even offline.`,accent:`purple`},{art:`fileText`,eyebrow:`Any format`,title:`PDF, Word, PowerPoint & text`,body:`Drop a file or paste text. We extract the key ideas on-device in seconds — no upload, no account needed.`,accent:`blue`},{art:`zap`,eyebrow:`Your way`,title:`Four question types, fully tunable`,body:`Multiple choice, true/false, fill-in-the-blank and identification. Set the count, difficulty and timer — then go.`,accent:`amber`},{art:`lock`,eyebrow:`Private by design`,title:`Your data stays on this device`,body:`Your files, scores and questions are generated locally. AI question writing and wizard voice are optional cloud features — everything else works offline.`,accent:`green`}];function i(i,a){let o=0;i.innerHTML=`
    <div class="onb-wrap">
      <div class="onb-top">
        <button class="onb-skip" id="onb-skip" data-tooltip="Skip the introduction">Skip</button>
        <div class="onb-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="1" aria-valuemax="${r.length}" aria-valuenow="1" id="onb-progress">
          <div class="onb-progress-fill" id="onb-progress-fill"></div>
        </div>
      </div>
      <div class="onb-viewport">
        <div class="onb-slides" id="onb-slides">
          ${r.map((e,t)=>`
            <div class="onb-slide" data-accent="${e.accent}">
              <div class="onb-stage">
                <div class="onb-glow"></div>
                <div class="onb-illust">${t===0?`<img class="wiz-hero" src="/wizard/wizard-image.jpg" alt="Quizard wizard">`:n[t]}</div>
              </div>
              <div class="onb-copy">
                <div class="onb-eyebrow">${e.eyebrow}</div>
                <h2>${e.title}</h2>
                <p>${e.body}</p>
              </div>
            </div>`).join(``)}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="onb-dots" aria-hidden="true">
          ${r.map((e,t)=>`<span class="onb-dot ${t===0?`on`:``}"></span>`).join(``)}
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
  `;let s=i.querySelector(`#onb-slides`),c=[...i.querySelectorAll(`.onb-dot`)],l=i.querySelector(`#onb-next`),u=i.querySelector(`#onb-back`),d=i.querySelector(`.onb-next-label`),f=i.querySelector(`#onb-progress`),p=i.querySelector(`#onb-progress-fill`),m=i.querySelector(`.onb-wrap`);async function h(){t({onboarded:!0});let n=await e();!n.length||n.length===1&&n[0].name===`My account`?(a.state.accountFlow={mode:`create`},a.go(`accounts`)):a.go(`library`)}function g(){s.style.transform=`translateX(-${o*100}%)`,[...s.children].forEach((e,t)=>e.classList.toggle(`active`,t===o)),c.forEach((e,t)=>e.classList.toggle(`on`,t===o));let e=o===r.length-1;d.textContent=e?`Get Started`:`Continue`,u.hidden=o===0,m.dataset.idx=String(o);let t=(o+1)/r.length*100;p.style.width=t+`%`,f.setAttribute(`aria-valuenow`,String(o+1))}function _(e,t){let n=document.createElement(`span`);if(n.className=`press-ripple`,t){let r=e.getBoundingClientRect();n.style.left=t.clientX-r.left+`px`,n.style.top=t.clientY-r.top+`px`}else n.style.left=`50%`,n.style.top=`50%`;e.appendChild(n),setTimeout(()=>n.remove(),600),e.classList.remove(`fly`),e.offsetWidth,e.classList.add(`fly`)}function v(e){let t=i.querySelector(`.onb-viewport`);t&&(t.classList.remove(`push-forward`,`push-back`),t.offsetWidth,t.classList.add(e>0?`push-forward`:`push-back`))}l.addEventListener(`click`,e=>{_(l,e),o<r.length-1?(o++,v(1),g()):h()}),u.addEventListener(`click`,()=>{o>0&&(o--,_(u),v(-1),g())}),i.querySelector(`#onb-skip`).addEventListener(`click`,h),i.addEventListener(`keydown`,e=>{e.key===`ArrowRight`||e.key===` `?(e.preventDefault(),o<r.length-1?(o++,_(l),v(1),g()):h()):e.key===`ArrowLeft`?(e.preventDefault(),o>0&&(o--,_(u),v(-1),g())):e.key===`Escape`&&h()}),i.tabIndex=0,i.focus();let y=null,b=i.querySelector(`.onb-viewport`);b.addEventListener(`touchstart`,e=>{y=e.touches[0].clientX},{passive:!0}),b.addEventListener(`touchend`,e=>{if(y==null)return;let t=e.changedTouches[0].clientX-y;t<-45&&o<r.length-1?(o++,v(1),g()):t>45&&o>0&&(o--,v(-1),g()),y=null},{passive:!0}),g()}function a(e){}export{i as render,a as unmount};