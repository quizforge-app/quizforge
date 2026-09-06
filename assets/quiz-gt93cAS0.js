import{n as e}from"./topics-2sMjMAqj.js";import{t}from"./assets-C7X78vgS.js";import{E as n,G as r,H as i,S as a,W as o,c as s,dt as c,gt as l,it as u,j as ee,k as d,p as f,q as p,rt as m}from"./index-rFn9O_LP.js";import{r as h}from"./gemini-BQvNqYOp.js";import{n as te,r as g}from"./quiz-ai-CsSp0gI8.js";import{t as _}from"./explain-WFycShmV.js";import{t as v}from"./imgZoom-BMtI0Ckh.js";function y(e){return JSON.stringify([e.count,e.mix,e.difficulty,e.shuffle,e.timerSec,e.fresh,e.topics,!!e.ai,!!e.focusWeak])}function b(){return`quizard-active-quiz-${x()}`}function x(){return window.__quizAccountId||`default`}function S(e,t,n){if(!(t.mistakeMode||!e))try{localStorage.setItem(b(),JSON.stringify({docId:e.id,docName:e.name,questions:n,index:t.index,correct:t.correct,answers:t.answers,savedAt:Date.now()}))}catch{}}function C(){localStorage.removeItem(b())}function ne(e,t){e.innerHTML=`
    <div class="screen screen-center">
      <div class="empty-state">
        <div class="art">${a(`sparkles`)}</div>
        <h3 style="margin-top:14px">AI is writing your quiz</h3>
        <p class="faint" id="ai-gen-label" style="margin-top:6px">Connecting to Gemini…</p>
      </div>
      <div style="width:min(280px,80%);height:8px;border-radius:99px;background:var(--border);overflow:hidden;margin-top:18px">
        <div id="ai-gen-bar" style="height:100%;width:0%;background:var(--accent);transition:width .25s"></div>
      </div>
    </div>`}function re(e,t,n){let r=e.querySelector(`#ai-gen-bar`),i=e.querySelector(`#ai-gen-label`);r&&(r.style.width=n?`${Math.round(t/n*100)}%`:`0%`),i&&n&&(i.textContent=`Writing question ${Math.min(t+1,n)} of ${n}…`)}var w=null;function T(){w&&(w(),w=null)}async function E(x,T){w&&w();let E=T.state.mistakeReview||null,D=null,O=null,k=null,A;if(T.state.resumeRequested){T.state.resumeRequested=!1;try{let e=JSON.parse(localStorage.getItem(b()));e?.questions?.length&&(D=await i(e.docId)),e&&D?(A=e.questions,k={questions:A,index:e.index,correct:e.correct,answers:e.answers,startTime:Date.now(),resumed:!0},O=T.getConfig(D.id),T.toast(`Resumed at question ${e.index+1} of ${A.length}`)):C()}catch{C()}}if(!k&&T.state.examSession){let e=T.state.examSession;T.state.examSession=null,A=e.questions,O={timerSec:0,count:A.length},k={questions:A,index:0,correct:0,answers:[],examMode:!0,examId:e.examId,docName:e.docName||`Exam Prep`}}else if(!k&&T.state.sharedQuiz){let e=T.state.sharedQuiz;A=e.questions,O={timerSec:e.cfg?.timerSec||0,count:A.length},k={questions:A,index:0,correct:0,answers:[],shared:!0,docName:e.title||`Shared Quiz`}}else if(!k&&E)T.state.mistakeReview=null,A=E.questions,k={questions:A,index:0,correct:0,answers:[],mistakeMode:!0,docName:E.docName||`Mistake Review`};else if(!k){if(D=await i(T.state.currentDocId),!D){T.go(`library`);return}if(O=T.getConfig(D.id),O.fresh||!T.state.cachedQuiz?.[D.id]){let e=null;if(O.ai){ne(x,D.name);try{e=await te(D,O,(e,t)=>re(x,e,t))}catch{e=null}if(T.state.screen!==`quiz`)return;e?.aiNote===`no_key`?T.toast(`Add a Gemini key in Settings for AI questions`,!0):e?.aiNote&&T.toast(`Gemini unavailable (${e.aiNote}) — used built-in questions`,!0)}if((!e||e.error===`not_enough_content`||!e.questions.length)&&(e=d(D,O)),e.error===`not_enough_content`||!e.questions.length){x.innerHTML=`
          <div class="screen screen-center">
            <div class="empty-state">
              <div class="art">${a(`sparkles`)}</div>
              <h3>Not enough content</h3>
              <p>This document doesn't have enough readable text to build a quiz. Try a text-rich file.</p>
              <button class="btn btn-secondary" id="goback" style="max-width:200px;margin:0 auto">Back</button>
            </div>
          </div>`,x.querySelector(`#goback`).addEventListener(`click`,()=>T.go(`setup`));return}A=e.questions,T.state.cachedQuiz={[D.id]:{questions:A,configKey:y(O),index:0,correct:0,answers:[]}}}else{let e=T.state.cachedQuiz[D.id];if(e.configKey!==y(O)){T.go(`quiz`);return}A=e.questions}k=T.state.cachedQuiz[D.id]}k.startTime=Date.now();let j=null,M=!1,N=x,P={},F=[...new Set(A.filter(e=>e.imageId).map(e=>e.imageId))];for(let e of F)try{let t=await o(e);t?.blob&&(P[e]=URL.createObjectURL(t.blob))}catch{}function I(){for(let e of Object.values(P))URL.revokeObjectURL(e)}function L(){return A[k.index]}function R(){return A.length}function z(){let e=L();clearInterval(j),M=!1;let r=``;e.type===`mcq`?r=e.options.map((e,t)=>`
        <button class="opt-btn" data-i="${t}">
          <span class="opt-key">${String.fromCharCode(65+t)}</span>
          <span>${f(e)}</span>
        </button>`).join(``):e.type===`fib`?r=e.choices.map((e,t)=>`
        <button class="opt-btn" data-i="${t}">
          <span class="opt-key">${t+1}</span>
          <span>${f(e)}</span>
        </button>`).join(``):e.type===`tf`?r=`
        <div class="tf-row">
          <button class="tf-btn true-opt" data-ans="true">${a(`check`)} True</button>
          <button class="tf-btn false-opt" data-ans="false">${a(`x`)} False</button>
        </div>`:e.type===`id`?r=`
        <input class="text-input" id="id-input" placeholder="Type your answer…" aria-label="Type your answer" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <button class="btn btn-primary" id="id-submit" style="margin-top:12px">Submit</button>`:e.type===`matching`?r=`
        <div class="match-grid">
          <div class="match-col">
            ${e.pairs.map((e,t)=>`<button class="match-cell match-left" data-left="${t}">${f(e.left)}</button>`).join(``)}
          </div>
          <div class="match-col">
            ${e.rightOrder.map((t,n)=>`<button class="match-cell match-right" data-right="${n}" data-pair="${t}">${f(e.pairs[t].right)}</button>`).join(``)}
          </div>
        </div>
        <button class="btn btn-primary" id="match-submit" style="margin-top:14px;width:100%" disabled data-tooltip="Pair every term first">Check matches</button>`:e.type===`ordering`?r=`
        <div class="order-pool" id="order-pool"></div>
        <div class="order-answer" id="order-answer"></div>
        <button class="btn btn-primary" id="order-submit" style="margin-top:14px;width:100%" disabled data-tooltip="Place every step first">Check order</button>`:e.type===`short`&&(r=`
        <input class="text-input" id="short-input" placeholder="Type your answer…" aria-label="Type your answer" autocomplete="off" />
        <button class="btn btn-primary" id="short-submit" style="margin-top:12px">Submit</button>`);let i=e.type===`matching`||e.type===`ordering`?``:e.type===`short`?`<p class="q-stem">${f(e.prompt||e.stem||e.statement||e.clue||``)}</p>`:e.type===`tf`?`<p class="q-stem">${f(e.statement)}</p>`:e.type===`id`?`<p class="q-stem">Identify the missing term:<br/><span style="font-size:15px;color:var(--text-dim);display:block;margin-top:10px;line-height:1.6">“${f(e.clue)}”</span></p>`:`<p class="q-stem">${s(e.stem)}</p>`,o=e.imageId&&P[e.imageId]?`<img class="q-image" src="${P[e.imageId]}" alt="Question image" loading="lazy" />`:``;N.innerHTML=`
      <div class="quiz-topbar">
        <button class="icon-btn" id="quit-btn" data-tooltip="Quit quiz">${a(`x`)}</button>
        <div class="progress-track" data-tooltip="Your progress through the quiz"><div class="progress-fill" id="progress-fill"></div></div>
        <span class="q-counter" id="q-counter" data-tooltip="Question number"></span>
        ${O?.timerSec>0?`<span class="timer-chip" id="timer-chip" data-tooltip="Time remaining">`+a(`timer`)+`<span id="timer-val"></span></span>`:``}
      </div>
      <div class="quiz-body">
        <img class="q-wiz" src="${t(`wizard/wizard-thinking.jpg`)}" alt="" />
        ${o}
        <div class="q-type-badge"><span class="chip on">${n[e.type].short}</span></div>
        ${i}
        <div id="answers">${r}</div>
        <div id="feedback-zone"></div>
      </div>
    `,N.querySelector(`#progress-fill`).style.width=`${(k.index+1)/R()*100}%`,N.querySelector(`#q-counter`).textContent=`${k.index+1}/${R()}`,O?.timerSec>0&&V(O.timerSec),Y(e);let c=N.querySelector(`.q-image`);c&&c.addEventListener(`click`,()=>B(c.src))}function B(e){let t=document.getElementById(`quiz-img-viewer`);if(!t){t=document.createElement(`div`),t.id=`quiz-img-viewer`,t.className=`img-viewer hidden`,t.innerHTML=`
        <div class="iv-zoom-bar">
          <button class="iv-zoom" id="qiv-zoom-out" aria-label="Zoom out">${a(`minus`)}</button>
          <button class="iv-zoom" id="qiv-reset" aria-label="Reset zoom">${a(`refresh`)}</button>
          <button class="iv-zoom" id="qiv-zoom-in" aria-label="Zoom in">${a(`plus`)}</button>
        </div>
        <button class="iv-close" id="qiv-close" aria-label="Close">${a(`x`)}</button>
        <img id="qiv-img" alt="Viewing image" />`,document.body.appendChild(t),t.addEventListener(`click`,e=>{(e.target===t||e.target.id===`qiv-close`)&&t.classList.add(`hidden`)});let e=t.querySelector(`#qiv-img`);t._zoom=v(t,e),t.querySelector(`#qiv-zoom-in`).addEventListener(`click`,e=>{e.stopPropagation(),t._zoom.zoomIn()}),t.querySelector(`#qiv-zoom-out`).addEventListener(`click`,e=>{e.stopPropagation(),t._zoom.zoomOut()}),t.querySelector(`#qiv-reset`).addEventListener(`click`,e=>{e.stopPropagation(),t._zoom.reset()})}t.querySelector(`#qiv-img`).src=e,t._zoom?.reset(),t.classList.remove(`hidden`)}function V(e){let t=e,n=N.querySelector(`#timer-val`),r=N.querySelector(`#timer-chip`);n.textContent=t,j=setInterval(()=>{t--,n.textContent=Math.max(0,t),t<=5&&r.classList.add(`danger`),t<=0&&(clearInterval(j),K(null))},1e3)}function H(){clearInterval(j)}let U=!0;function W(e,n,r=null,i=null){U=!r;let o=N.querySelector(`#feedback-zone`),s=L(),c=h()&&m().aiExplain!==!1&&!s.explanation,l=async()=>{!U&&r&&(U=!0,await p(r,e?`good`:`again`).catch(()=>{})),(k.index<R()-1?X:Z)()};o.innerHTML=`
      <img class="q-wiz-fb" src="${t(`wizard/${e?`wizard-celebrating`:`wizard-encouraging`}.jpg`)}" alt="" />
      <div class="feedback-banner ${e?`good`:`bad`}">
        ${a(e?`check`:`x`)}
        <div>
          ${e?`Correct!`:`Incorrect`}
          ${!e&&n?`<span class="fb-answer">Answer: ${f(n)}</span>`:``}
        </div>
      </div>
      ${c?`
      <button class="btn btn-ghost explain-btn" id="explain-btn" style="margin-top:14px;width:100%" data-tooltip="Ask Gemini why this answer is right">${a(`sparkles`)} Why? Explain answer</button>
      <div id="explain-zone"></div>`:``}
      ${r==null?``:`
      <div style="margin-top:12px">
        <p class="faint" style="font-size:11.5px;text-align:center;margin-bottom:8px">Schedule next review</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
          <button class="btn srs-btn srs-again" data-grade="again">Again</button>
          <button class="btn srs-btn srs-hard" data-grade="hard">Hard</button>
          <button class="btn srs-btn srs-good" data-grade="good">Good</button>
          <button class="btn srs-btn srs-easy" data-grade="easy">Easy</button>
        </div>
      </div>`}
      ${k.index<R()-1?`<button class="btn btn-secondary" id="next-btn" style="margin-top:14px;width:100%">Next Question ${a(`chevronRight`)}</button>`:`<button class="btn btn-good" id="finish-btn" style="margin-top:14px;width:100%">${a(`trophy`)} See Results</button>`}
    `,(N.querySelector(`#next-btn`)||N.querySelector(`#finish-btn`)).focus({preventScroll:!0}),N.querySelector(`#next-btn`)?.addEventListener(`click`,l),N.querySelector(`#finish-btn`)?.addEventListener(`click`,l),r!=null&&N.querySelectorAll(`.srs-btn`).forEach(e=>e.addEventListener(`click`,async()=>{U=!0,await p(r,e.dataset.grade).catch(()=>{}),(k.index<R()-1?X:Z)()}));let u=N.querySelector(`#explain-btn`);u&&u.addEventListener(`click`,async()=>{u.disabled=!0,u.textContent=`Thinking…`;try{let e=await _(L(),i);s.explanation=e,N.querySelector(`#explain-zone`).innerHTML=`<div class="explain-box">${f(e)}</div>`,u.remove()}catch{N.querySelector(`#explain-zone`).innerHTML=`<div class="explain-box faint">Couldn't load an explanation right now.</div>`,u.remove()}})}function G(e,t){let n=(e,t,n)=>{e.classList.remove(`dimmed`),t?e.classList.add(`correct`):n?e.classList.add(`wrong`):e.classList.add(`dimmed`),e.setAttribute(`disabled`,``)};N.querySelectorAll(`.opt-btn`).forEach((r,i)=>{let a=e.answerIndex!=null&&i===e.answerIndex;n(r,a,i===t&&!a)}),N.querySelectorAll(`.tf-btn`).forEach(r=>{let i=r.dataset.ans===`true`;n(r,i===e.answer,i!==e.answer&&(t===!0&&r.classList.contains(`true-opt`)||t===!1&&r.classList.contains(`false-opt`)))})}async function K(t){if(M)return;M=!0,H();let n=L(),r=!1;if(n.type===`mcq`||n.type===`fib`)r=t!=null&&t===n.answerIndex,G(n,t);else if(n.type===`tf`)r=t===n.answer,G(n,t);else if(n.type===`id`){let t=N.querySelector(`#id-input`);r=e(t?.value??``,n.answer),t&&t.setAttribute(`disabled`,``)}else return;J(r,q(n,t))}function q(e,t){return e.type===`mcq`||e.type===`fib`?t==null?null:(e.options??e.choices)?.[t]??null:e.type===`tf`?t===!0?`True`:t===!1?`False`:null:e.type===`id`?N.querySelector(`#id-input`)?.value?.trim()??null:null}async function J(e,t){let n=L(),i=n.type===`id`?n.answer:n.type===`tf`?String(n.answer):n.type===`short`?n.answer:n.type===`ordering`?n.steps.join(` → `):n.type===`matching`?n.pairs.map(e=>e.left).join(`, `):n.options?.[n.answerIndex]??n.choices?.[n.answerIndex];k.answers.push({type:n.type,sentence:n.meta?.sentence||n.statement||n.prompt||``,term:n.meta?.term||n.answer,chosen:t,correct:i,userOk:e}),e&&k.correct++;let a=D?.id||n.meta?.docId,o=n.meta?.sentence||n.statement||``,s=n.meta?.term||n.answer,d=null;if(a&&o&&s){e?u(a,s,o).catch(()=>{}):ee({docId:a,sentence:o,term:s,type:n.type}).catch(()=>{});try{d=c(a,s,o),await r(d)||await l({docId:a,sentence:o,term:s,type:n.type}),k.mistakeMode||await p(d,e?`good`:`again`)}catch{}}S(D,k,A),W(e,i,k.mistakeMode?d:null,t)}function Y(e){if(e.type===`mcq`||e.type===`fib`)N.querySelectorAll(`.opt-btn`).forEach((e,t)=>e.addEventListener(`click`,()=>K(t)));else if(e.type===`tf`)N.querySelectorAll(`.tf-btn`).forEach(e=>e.addEventListener(`click`,()=>K(e.dataset.ans===`true`)));else if(e.type===`id`){let e=()=>K(N.querySelector(`#id-input`).value);N.querySelector(`#id-submit`).addEventListener(`click`,e);let t=N.querySelector(`#id-input`);t.focus({preventScroll:!0}),t.addEventListener(`keydown`,t=>{t.key===`Enter`&&e()})}else if(e.type===`matching`)ie(e);else if(e.type===`ordering`)ae(e);else if(e.type===`short`){let e=()=>oe(N.querySelector(`#short-input`).value);N.querySelector(`#short-submit`).addEventListener(`click`,e);let t=N.querySelector(`#short-input`);t.focus({preventScroll:!0}),t.addEventListener(`keydown`,t=>{t.key===`Enter`&&e()})}N.querySelector(`#quit-btn`).addEventListener(`click`,ce)}function ie(e){let t=[...N.querySelectorAll(`.match-left`)],n=[...N.querySelectorAll(`.match-right`)],r={},i=null;function a(){let t=Object.keys(r).length===e.pairs.length,n=N.querySelector(`#match-submit`);n&&(n.disabled=!t)}t.forEach(e=>e.addEventListener(`click`,()=>{t.forEach(e=>e.classList.remove(`sel`)),e.classList.add(`sel`),i=e})),n.forEach(e=>e.addEventListener(`click`,()=>{if(!i)return;let o=Object.keys(r).find(t=>r[t]===e);o!=null&&delete r[o],r[i.dataset.left]=e,n.forEach(e=>e.classList.remove(`linked`)),t.forEach(e=>e.classList.remove(`linked`)),e.classList.add(`linked`),i.classList.add(`linked`),i.classList.remove(`sel`),i=null,a()})),N.querySelector(`#match-submit`).addEventListener(`click`,()=>{let n=!0;for(let i=0;i<e.pairs.length;i++){let e=r[i],a=e&&Number(e.dataset.pair)===i;a||(n=!1),e?.classList.add(a?`correct`:`wrong`),t[i].classList.add(a?`correct`:`wrong`)}J(n,`Matched ${Object.keys(r).filter(e=>Number(r[e].dataset.pair)===Number(e)).length}/${e.pairs.length}`)})}function ae(e){let t=N.querySelector(`#order-pool`),n=N.querySelector(`#order-answer`),r=[];function i(){t.innerHTML=e.shuffled.filter(e=>!r.includes(e)).map(t=>`<button class="order-cell" data-step="${t}">${f(e.steps[t])}</button>`).join(``),n.innerHTML=r.map((t,n)=>`<button class="order-ans" data-k="${n}"><span class="order-pos">${n+1}</span>${f(e.steps[t])}</button>`).join(``);let a=N.querySelector(`#order-submit`);a&&(a.disabled=r.length!==e.steps.length),t.querySelectorAll(`.order-cell`).forEach(e=>e.addEventListener(`click`,()=>{r.push(Number(e.dataset.step)),i()})),n.querySelectorAll(`.order-ans`).forEach(e=>e.addEventListener(`click`,()=>{r.splice(Number(e.dataset.k),1),i()}))}i(),N.querySelector(`#order-submit`).addEventListener(`click`,()=>{let t=r.every((e,t)=>e===t);n.querySelectorAll(`.order-ans`).forEach((e,t)=>e.classList.add(r[t]===t?`correct`:`wrong`)),J(t,`Order: ${r.map(t=>e.steps[t]).join(` → `)}`)})}async function oe(t){if(M)return;M=!0,H();let n=L(),r=(t||``).trim(),i=e(r,n.answer),a=await g(r,n).catch(()=>null);a!=null&&(i=a),J(i,r)}function X(){if(k.index>=R()-1)return Z();k.index++,z(),window.scrollTo(0,0)}async function Z(){H(),I();let e=(Date.now()-k.startTime)/1e3,t=Math.round(k.correct/R()*100),n=k.answers.filter(e=>!e.userOk).length,r={};for(let e of k.answers)r[e.type]=r[e.type]||{c:0,t:0},r[e.type].t++,e.userOk&&r[e.type].c++;(!k.mistakeMode&&D||k.examMode)&&await T.saveAttemptRecord({docId:D?.id||null,docName:k.docName||D?.name||`Exam Prep`,examId:k.examId||void 0,correct:k.correct,total:R(),percent:t,durationSec:e,byType:r}),T.state.lastResult={docId:D?.id||null,docName:k.docName||D?.name,correct:k.correct,total:R(),percent:t,durationSec:e,wrongCount:n,mistakeMode:!!k.mistakeMode,shared:!!k.shared,examMode:!!k.examMode,challenge:k.challenge||null,cfg:{timerSec:O?.timerSec||0},byType:r,review:A.map((e,t)=>{let n=e.statement||e.stem||e.clue||e.prompt||``,r=e.type===`id`||e.type===`short`?e.answer:e.type===`tf`?String(e.answer):(e.options??e.choices)?.[e.answerIndex];return e.type===`matching`?(n=`Match terms: ${(e.pairs||[]).map(e=>e.left).join(` / `)}`,r=(e.pairs||[]).map(e=>`${e.left} → ${e.right}`).join(`  |  `)):e.type===`ordering`&&(n=e.prompt||`Put the steps in order`,r=(e.steps||[]).join(` → `)),{prompt:n,answer:r,chosen:k.answers[t]?.chosen??null,ok:k.answers[t]?.userOk}}),questions:A.map(e=>({...e}))},!k.mistakeMode&&D&&delete T.state.cachedQuiz[D.id],C(),$(),se()}function se(){clearInterval(j),T.go(`results`)}function ce(){let e=document.createElement(`div`);e.className=`quit-dialog-mask`,e.innerHTML=`
      <div class="quit-dialog">
        <h3>Quit this quiz?</h3>
        <p>Your progress in this attempt won't be saved.</p>
        <div class="quit-actions">
          <button class="btn btn-danger-ghost" id="qd-yes">Yes, quit</button>
          <button class="btn btn-primary" id="qd-no">Keep going</button>
        </div>
      </div>`,document.body.appendChild(e),e.addEventListener(`click`,t=>{t.target===e&&e.remove()}),e.querySelector(`#qd-yes`).addEventListener(`click`,()=>{e.remove(),le()}),e.querySelector(`#qd-no`).addEventListener(`click`,()=>e.remove())}function le(){clearInterval(j),I(),D&&delete T.state.cachedQuiz[D.id],T.state.mistakeReview=null,C(),$(),T.go(`library`)}let Q=null;function $(){Q&&(document.removeEventListener(`keydown`,Q),Q=null)}Q=e=>{if(document.querySelector(`.quit-dialog-mask`))return;let t=A[k.index];if(t&&e.target.tagName!==`INPUT`){if(M){e.key===`Enter`&&(N.querySelector(`#next-btn`)?.click(),N.querySelector(`#finish-btn`)?.click());return}if(t.type===`mcq`||t.type===`fib`){let n=t.options||t.choices,r=parseInt(e.key,10);if(r>=1&&r<=n.length){K(r-1);return}let i=e.key.toUpperCase(),a=[`A`,`B`,`C`,`D`].indexOf(i);a>=0&&a<n.length&&K(a)}else if(t.type===`tf`){let t=e.key.toLowerCase();t===`t`?K(!0):t===`f`&&K(!1)}}},document.addEventListener(`keydown`,Q),w=$,window.__quizSession={session:A,st:k,cfg:O,doc:D},z()}export{E as render,T as unmount};