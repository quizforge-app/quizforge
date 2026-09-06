import{lt as e,rt as t}from"./index-CybBJgOJ.js";var n=[{screen:`library-empty`,img:`/wizard/slides/slide-1-library-empty.jpg`,mp3:`tut-library-empty`,portrait:`tut-add`,title:`Your Library`,text:`Welcome! Tap the + to add your first PDF, Word or text file — I'll turn its pages into instant practice quizzes.`,highlight:null,accent:`purple`},{screen:`library-tour`,img:`/wizard/slides/slide-2-library-tour.jpg`,mp3:`tut-library-tour`,portrait:`tut-add`,title:`Your Library`,text:`This is your Library — tap + to add a document, or tap Quiz on any document to start studying.`,highlight:null,accent:`purple`},{screen:`import`,img:`/wizard/slides/slide-3-import.jpg`,mp3:`tut-import`,portrait:`tut-import`,title:`Add a Document`,text:`Drop a file or paste text here. Your document is processed locally — I read it and craft questions from the key ideas.`,highlight:null,accent:`blue`},{screen:`setup`,img:`/wizard/slides/slide-4-setup.jpg`,mp3:`tut-setup`,portrait:`tut-setup`,title:`Quiz Setup`,text:`Pick how many questions and which styles fit your goal, then hit Start Quiz. You can tweak difficulty and focus your weak spots anytime.`,highlight:{x:10,y:73,w:80,h:7,label:`Start Quiz`},accent:`amber`},{screen:`quiz-first`,img:`/wizard/slides/slide-5-quiz-first.jpg`,mp3:`tut-quiz-first`,portrait:`tut-quiz`,title:`Answer Questions`,text:`Read each question carefully and choose the best answer — I'll show you why afterwards.`,highlight:null,accent:`blue`},{screen:`quiz-correct`,img:`/wizard/slides/slide-6-quiz-correct.jpg`,mp3:`tut-quiz-correct`,portrait:`tut-correct`,title:`Correct!`,text:`Well reasoned — that's the right one! Tap Next Question to continue.`,highlight:null,accent:`green`},{screen:`quiz-wrong`,img:`/wizard/slides/slide-7-quiz-wrong.jpg`,mp3:`tut-quiz-wrong`,portrait:`tut-wrong`,title:`Not Quite`,text:`Not quite — here's the reasoning so it sticks next time. Review the explanation and tap Next.`,highlight:null,accent:`amber`},{screen:`progress`,img:`/wizard/slides/slide-8-progress.jpg`,mp3:`tut-progress-first`,portrait:`tut-progress`,title:`Your Progress`,text:`This is your progress map — streaks, scores and the terms you stumble on. Revisit weak spots to master the subject.`,highlight:null,accent:`purple`},{screen:`quiz-done`,img:`/wizard/slides/slide-9-quiz-done.jpg`,mp3:`tut-quiz-done`,portrait:`tut-done`,title:`All Done!`,text:`First trial complete! Practice these and the weak spots fade. You can replay this tour anytime in Settings.`,highlight:null,accent:`green`}],r=new Map,i=null,a=!1,o=null;function s(e){if(r.has(e))return;let t=new Audio;t.preload=`auto`,t.src=`/wizard/${e}.mp3`,t.load(),r.set(e,t)}function c(e){s(n[e].mp3),n[e+1]&&s(n[e+1].mp3)}function l(){if(a)return;let e=()=>{if(a=!0,o){let e=o;o=null,d(e)}};addEventListener(`click`,e,{once:!0}),addEventListener(`touchstart`,e,{once:!0}),addEventListener(`keydown`,e,{once:!0})}function u(){return t().wizardVoice!==!1}function d(e){if(!u())return Promise.resolve();let t=r.get(e);i||(i=new Audio,i.preload=`auto`);try{i.src=t?t.src:`/wizard/${e}.mp3`,i.volume=1,i.muted=!1;let n=i.play();return n&&n.catch&&n.catch(t=>{t&&t.name===`NotAllowedError`&&(o=e)}),new Promise(e=>{i.onended=()=>{i.onended=null,e()},i.onerror=()=>{i.onerror=null,e()},setTimeout(e,15e3)})}catch{return Promise.resolve()}}function f(){if(i)try{i.pause()}catch{}}function p(){return`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`}function m(){return`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`}function h(r,i){let a=0;c(0),l();try{t(),i.state.screen}catch{}r.innerHTML=`
    <div class="tut-wrap">
      <div class="onb-top">
        <button class="onb-skip" id="tut-skip" data-tooltip="Skip the tutorial">Skip</button>
        <div class="onb-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="1" aria-valuemax="${n.length}" aria-valuenow="1" id="tut-progress">
          <div class="onb-progress-fill" id="tut-progress-fill"></div>
        </div>
      </div>
      <div class="onb-viewport">
        <div class="tut-slides" id="tut-slides">
          ${n.map((e,t)=>`
            <div class="tut-slide" data-accent="${e.accent}">
              <div class="tut-stage">
                <div class="tut-phone">
                  ${t<2?`<img class="tut-screenshot" src="${e.img}" alt="${e.title}" decoding="async" fetchpriority="high" />`:`<img class="tut-screenshot" data-src="${e.img}" alt="${e.title}" decoding="async" loading="lazy" />`}
                  ${e.highlight?`
                  <div class="tut-highlight-ring" style="left:${e.highlight.x}%;top:${e.highlight.y}%;width:${e.highlight.w}%;height:${e.highlight.h}%;">
                    <div class="tut-highlight-glow"></div>
                    <div class="tut-highlight-label">${e.highlight.label}</div>
                  </div>`:``}
                </div>
              </div>
              <div class="tut-copy">
                <div class="tut-portrait">
                  <img class="tut-wiz" src="/wizard/${e.portrait}.jpg" alt="" decoding="async" />
                  <div class="tut-portrait-glow"></div>
                </div>
                <div class="tut-text">
                  <h2>${e.title}</h2>
                  <p>${e.text}</p>
                </div>
              </div>
            </div>`).join(``)}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="tut-dots" aria-hidden="true">
          ${n.map((e,t)=>`<span class="onb-dot ${t===0?`on`:``}"></span>`).join(``)}
        </div>
        <div class="onb-cta-row">
          <button class="onb-back" id="tut-back" type="button" aria-label="Previous slide" hidden>
            ${m()}
          </button>
          <button class="btn btn-primary onb-next" id="tut-next">
            <span class="onb-next-label">Continue</span>
            ${p()}
          </button>
        </div>
      </div>
    </div>
  `;let o=r.querySelector(`#tut-slides`),s=[...r.querySelectorAll(`.onb-dot`)],u=r.querySelector(`#tut-next`),h=r.querySelector(`#tut-back`),g=r.querySelector(`.onb-next-label`),_=r.querySelector(`#tut-progress`),v=r.querySelector(`#tut-progress-fill`),y=r.querySelector(`.tut-wrap`);function b(e){let t=o.children[e]?.querySelector(`img[data-src]`);t&&(t.src=t.dataset.src,t.removeAttribute(`data-src`))}function x(){b(a),a+1<n.length&&b(a+1)}async function S(){f();let n=i.state.account?.id||null,r={...t().tutorialDoneAccounts||{}};n&&(r[n]=!0),e({tutorialDone:!0,tutorialDoneAccounts:r}),i.go(`library`)}function C(){o.style.transform=`translateX(-${a*100}%)`,[...o.children].forEach((e,t)=>e.classList.toggle(`active`,t===a)),x(),s.forEach((e,t)=>e.classList.toggle(`on`,t===a));let e=a===n.length-1;g.textContent=e?`Get Started`:`Continue`,h.hidden=a===0,y.dataset.idx=String(a);let t=(a+1)/n.length*100;v.style.width=t+`%`,_.setAttribute(`aria-valuenow`,String(a+1)),f(),c(a),setTimeout(()=>d(n[a].mp3),200)}function w(e,t){let n=document.createElement(`span`);if(n.className=`press-ripple`,t){let r=e.getBoundingClientRect();n.style.left=t.clientX-r.left+`px`,n.style.top=t.clientY-r.top+`px`}else n.style.left=`50%`,n.style.top=`50%`;e.appendChild(n),setTimeout(()=>n.remove(),600),e.classList.remove(`fly`),e.offsetWidth,e.classList.add(`fly`)}function T(e){let t=r.querySelector(`.onb-viewport`);t&&(t.classList.remove(`push-forward`,`push-back`),t.offsetWidth,t.classList.add(e>0?`push-forward`:`push-back`))}u.addEventListener(`click`,e=>{w(u,e),a<n.length-1?(a++,T(1),C()):S()}),h.addEventListener(`click`,()=>{a>0&&(a--,w(h),T(-1),C())}),r.querySelector(`#tut-skip`).addEventListener(`click`,S),r.addEventListener(`keydown`,e=>{e.key===`ArrowRight`||e.key===` `?(e.preventDefault(),a<n.length-1?(a++,w(u),T(1),C()):S()):e.key===`ArrowLeft`?(e.preventDefault(),a>0&&(a--,w(h),T(-1),C())):e.key===`Escape`&&S()}),r.tabIndex=0,r.focus();let E=null,D=r.querySelector(`.onb-viewport`);D.addEventListener(`touchstart`,e=>{E=e.touches[0].clientX},{passive:!0}),D.addEventListener(`touchend`,e=>{if(E==null)return;let t=e.changedTouches[0].clientX-E;t<-45&&a<n.length-1?(a++,T(1),C()):t>45&&a>0&&(a--,T(-1),C()),E=null},{passive:!0}),C()}function g(e){f()}export{h as render,g as unmount};