import{t as e}from"./assets-C7X78vgS.js";import{lt as t,rt as n}from"./index-rFn9O_LP.js";var r=[{screen:`library-empty`,img:e(`wizard/slides/slide-1-library-empty.jpg`),mp3:`tut-library-empty`,portrait:`tut-add`,title:`Your Library`,text:`Welcome! Tap the + to add your first PDF, Word or text file — I'll turn its pages into instant practice quizzes.`,highlight:null,accent:`purple`},{screen:`library-tour`,img:e(`wizard/slides/slide-2-library-tour.jpg`),mp3:`tut-library-tour`,portrait:`tut-add`,title:`Your Library`,text:`This is your Library — tap + to add a document, or tap Quiz on any document to start studying.`,highlight:null,accent:`purple`},{screen:`import`,img:e(`wizard/slides/slide-3-import.jpg`),mp3:`tut-import`,portrait:`tut-import`,title:`Add a Document`,text:`Drop a file or paste text here. Your document is processed locally — I read it and craft questions from the key ideas.`,highlight:null,accent:`blue`},{screen:`setup`,img:e(`wizard/slides/slide-4-setup.jpg`),mp3:`tut-setup`,portrait:`tut-setup`,title:`Quiz Setup`,text:`Pick how many questions and which styles fit your goal, then hit Start Quiz. You can tweak difficulty and focus your weak spots anytime.`,highlight:{x:10,y:73,w:80,h:7,label:`Start Quiz`},accent:`amber`},{screen:`quiz-first`,img:e(`wizard/slides/slide-5-quiz-first.jpg`),mp3:`tut-quiz-first`,portrait:`tut-quiz`,title:`Answer Questions`,text:`Read each question carefully and choose the best answer — I'll show you why afterwards.`,highlight:null,accent:`blue`},{screen:`quiz-correct`,img:e(`wizard/slides/slide-6-quiz-correct.jpg`),mp3:`tut-quiz-correct`,portrait:`tut-correct`,title:`Correct!`,text:`Well reasoned — that's the right one! Tap Next Question to continue.`,highlight:null,accent:`green`},{screen:`quiz-wrong`,img:e(`wizard/slides/slide-7-quiz-wrong.jpg`),mp3:`tut-quiz-wrong`,portrait:`tut-wrong`,title:`Not Quite`,text:`Not quite — here's the reasoning so it sticks next time. Review the explanation and tap Next.`,highlight:null,accent:`amber`},{screen:`progress`,img:e(`wizard/slides/slide-8-progress.jpg`),mp3:`tut-progress-first`,portrait:`tut-progress`,title:`Your Progress`,text:`This is your progress map — streaks, scores and the terms you stumble on. Revisit weak spots to master the subject.`,highlight:null,accent:`purple`},{screen:`quiz-done`,img:e(`wizard/slides/slide-9-quiz-done.jpg`),mp3:`tut-quiz-done`,portrait:`tut-done`,title:`All Done!`,text:`First trial complete! Practice these and the weak spots fade. You can replay this tour anytime in Settings.`,highlight:null,accent:`green`}],i=new Map,a=null,o=!1,s=null;function c(t){if(i.has(t))return;let n=new Audio;n.preload=`auto`,n.src=e(`wizard/${t}.mp3`),n.load(),i.set(t,n)}function l(e){c(r[e].mp3),r[e+1]&&c(r[e+1].mp3)}function u(){if(o)return;let e=()=>{if(o=!0,s){let e=s;s=null,f(e)}};addEventListener(`click`,e,{once:!0}),addEventListener(`touchstart`,e,{once:!0}),addEventListener(`keydown`,e,{once:!0})}function d(){return n().wizardVoice!==!1}function f(t){if(!d())return Promise.resolve();let n=i.get(t);a||(a=new Audio,a.preload=`auto`);try{a.src=n?n.src:e(`wizard/${t}.mp3`),a.volume=1,a.muted=!1;let r=a.play();return r&&r.catch&&r.catch(e=>{e&&e.name===`NotAllowedError`&&(s=t)}),new Promise(e=>{a.onended=()=>{a.onended=null,e()},a.onerror=()=>{a.onerror=null,e()},setTimeout(e,15e3)})}catch{return Promise.resolve()}}function p(){if(a)try{a.pause()}catch{}}function m(){return`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`}function h(){return`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`}function g(i,a){let o=0;l(0),u();try{n(),a.state.screen}catch{}i.innerHTML=`
    <div class="tut-wrap">
      <div class="onb-top">
        <button class="onb-skip" id="tut-skip" data-tooltip="Skip the tutorial">Skip</button>
        <div class="onb-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="1" aria-valuemax="${r.length}" aria-valuenow="1" id="tut-progress">
          <div class="onb-progress-fill" id="tut-progress-fill"></div>
        </div>
      </div>
      <div class="onb-viewport">
        <div class="tut-slides" id="tut-slides">
          ${r.map((t,n)=>`
            <div class="tut-slide" data-accent="${t.accent}">
              <div class="tut-stage">
                <div class="tut-phone">
                  ${n<2?`<img class="tut-screenshot" src="${t.img}" alt="${t.title}" decoding="async" fetchpriority="high" />`:`<img class="tut-screenshot" data-src="${t.img}" alt="${t.title}" decoding="async" loading="lazy" />`}
                  ${t.highlight?`
                  <div class="tut-highlight-ring" style="left:${t.highlight.x}%;top:${t.highlight.y}%;width:${t.highlight.w}%;height:${t.highlight.h}%;">
                    <div class="tut-highlight-glow"></div>
                    <div class="tut-highlight-label">${t.highlight.label}</div>
                  </div>`:``}
                </div>
              </div>
              <div class="tut-copy">
                <div class="tut-portrait">
                  <img class="tut-wiz" src="${e(`wizard/${t.portrait}.jpg`)}" alt="" decoding="async" />
                  <div class="tut-portrait-glow"></div>
                </div>
                <div class="tut-text">
                  <h2>${t.title}</h2>
                  <p>${t.text}</p>
                </div>
              </div>
            </div>`).join(``)}
        </div>
      </div>
      <div class="onb-bottom">
        <div class="onb-dots" id="tut-dots" aria-hidden="true">
          ${r.map((e,t)=>`<span class="onb-dot ${t===0?`on`:``}"></span>`).join(``)}
        </div>
        <div class="onb-cta-row">
          <button class="onb-back" id="tut-back" type="button" aria-label="Previous slide" hidden>
            ${h()}
          </button>
          <button class="btn btn-primary onb-next" id="tut-next">
            <span class="onb-next-label">Continue</span>
            ${m()}
          </button>
        </div>
      </div>
    </div>
  `;let s=i.querySelector(`#tut-slides`),c=[...i.querySelectorAll(`.onb-dot`)],d=i.querySelector(`#tut-next`),g=i.querySelector(`#tut-back`),_=i.querySelector(`.onb-next-label`),v=i.querySelector(`#tut-progress`),y=i.querySelector(`#tut-progress-fill`),b=i.querySelector(`.tut-wrap`);function x(e){let t=s.children[e]?.querySelector(`img[data-src]`);t&&(t.src=t.dataset.src,t.removeAttribute(`data-src`))}function S(){x(o),o+1<r.length&&x(o+1)}async function C(){p();let e=a.state.account?.id||null,r={...n().tutorialDoneAccounts||{}};e&&(r[e]=!0),t({tutorialDone:!0,tutorialDoneAccounts:r}),a.go(`library`)}function w(){s.style.transform=`translateX(-${o*100}%)`,[...s.children].forEach((e,t)=>e.classList.toggle(`active`,t===o)),S(),c.forEach((e,t)=>e.classList.toggle(`on`,t===o));let e=o===r.length-1;_.textContent=e?`Get Started`:`Continue`,g.hidden=o===0,b.dataset.idx=String(o);let t=(o+1)/r.length*100;y.style.width=t+`%`,v.setAttribute(`aria-valuenow`,String(o+1)),p(),l(o),setTimeout(()=>f(r[o].mp3),200)}function T(e,t){let n=document.createElement(`span`);if(n.className=`press-ripple`,t){let r=e.getBoundingClientRect();n.style.left=t.clientX-r.left+`px`,n.style.top=t.clientY-r.top+`px`}else n.style.left=`50%`,n.style.top=`50%`;e.appendChild(n),setTimeout(()=>n.remove(),600),e.classList.remove(`fly`),e.offsetWidth,e.classList.add(`fly`)}function E(e){let t=i.querySelector(`.onb-viewport`);t&&(t.classList.remove(`push-forward`,`push-back`),t.offsetWidth,t.classList.add(e>0?`push-forward`:`push-back`))}d.addEventListener(`click`,e=>{T(d,e),o<r.length-1?(o++,E(1),w()):C()}),g.addEventListener(`click`,()=>{o>0&&(o--,T(g),E(-1),w())}),i.querySelector(`#tut-skip`).addEventListener(`click`,C),i.addEventListener(`keydown`,e=>{e.key===`ArrowRight`||e.key===` `?(e.preventDefault(),o<r.length-1?(o++,T(d),E(1),w()):C()):e.key===`ArrowLeft`?(e.preventDefault(),o>0&&(o--,T(g),E(-1),w())):e.key===`Escape`&&C()}),i.tabIndex=0,i.focus();let D=null,O=i.querySelector(`.onb-viewport`);O.addEventListener(`touchstart`,e=>{D=e.touches[0].clientX},{passive:!0}),O.addEventListener(`touchend`,e=>{if(D==null)return;let t=e.changedTouches[0].clientX-D;t<-45&&o<r.length-1?(o++,E(1),w()):t>45&&o>0&&(o--,E(-1),w()),D=null},{passive:!0}),w()}function _(e){p()}export{g as render,_ as unmount};