import{n as e}from"./topics-2sMjMAqj.js";import{E as t,G as n,H as r,S as i,W as a,c as o,dt as s,gt as c,it as l,j as u,k as d,p as f,q as p,rt as m}from"./index-CybBJgOJ.js";import{r as h}from"./gemini-BQvNqYOp.js";import{n as ee,r as te}from"./quiz-ai-DuRyqvKb.js";import{t as g}from"./explain-WFycShmV.js";import{t as _}from"./imgZoom-BMtI0Ckh.js";function v(e){return JSON.stringify([e.count,e.mix,e.difficulty,e.shuffle,e.timerSec,e.fresh,e.topics,!!e.ai,!!e.focusWeak])}function y(){return`quizard-active-quiz-${b()}`}function b(){return window.__quizAccountId||`default`}function x(e,t,n){if(!(t.mistakeMode||!e))try{localStorage.setItem(y(),JSON.stringify({docId:e.id,docName:e.name,questions:n,index:t.index,correct:t.correct,answers:t.answers,savedAt:Date.now()}))}catch{}}function S(){localStorage.removeItem(y())}function C(e,t){e.innerHTML=`
    <div class="screen screen-center">
      <div class="empty-state">
        <div class="art">${i(`sparkles`)}</div>
        <h3 style="margin-top:14px">AI is writing your quiz</h3>
        <p class="faint" id="ai-gen-label" style="margin-top:6px">Connecting to Gemini…</p>
      </div>
      <div style="width:min(280px,80%);height:8px;border-radius:99px;background:var(--border);overflow:hidden;margin-top:18px">
        <div id="ai-gen-bar" style="height:100%;width:0%;background:var(--accent);transition:width .25s"></div>
      </div>
    </div>`}function w(e,t,n){let r=e.querySelector(`#ai-gen-bar`),i=e.querySelector(`#ai-gen-label`);r&&(r.style.width=n?`${Math.round(t/n*100)}%`:`0%`),i&&n&&(i.textContent=`Writing question ${Math.min(t+1,n)} of ${n}…`)}var T=null;function E(){T&&(T(),T=null)}async function D(b,E){T&&T();let D=E.state.mistakeReview||null,O=null,k=null,A=null,j;if(E.state.resumeRequested){E.state.resumeRequested=!1;try{let e=JSON.parse(localStorage.getItem(y()));e?.questions?.length&&(O=await r(e.docId)),e&&O?(j=e.questions,A={questions:j,index:e.index,correct:e.correct,answers:e.answers,startTime:Date.now(),resumed:!0},k=E.getConfig(O.id),E.toast(`Resumed at question ${e.index+1} of ${j.length}`)):S()}catch{S()}}if(!A&&E.state.examSession){let e=E.state.examSession;E.state.examSession=null,j=e.questions,k={timerSec:0,count:j.length},A={questions:j,index:0,correct:0,answers:[],examMode:!0,examId:e.examId,docName:e.docName||`Exam Prep`}}else if(!A&&E.state.sharedQuiz){let e=E.state.sharedQuiz;j=e.questions,k={timerSec:e.cfg?.timerSec||0,count:j.length},A={questions:j,index:0,correct:0,answers:[],shared:!0,docName:e.title||`Shared Quiz`}}else if(!A&&D)E.state.mistakeReview=null,j=D.questions,A={questions:j,index:0,correct:0,answers:[],mistakeMode:!0,docName:D.docName||`Mistake Review`};else if(!A){if(O=await r(E.state.currentDocId),!O){E.go(`library`);return}if(k=E.getConfig(O.id),k.fresh||!E.state.cachedQuiz?.[O.id]){let e=null;if(k.ai){C(b,O.name);try{e=await ee(O,k,(e,t)=>w(b,e,t))}catch{e=null}if(E.state.screen!==`quiz`)return;e?.aiNote===`no_key`?E.toast(`Add a Gemini key in Settings for AI questions`,!0):e?.aiNote&&E.toast(`Gemini unavailable (${e.aiNote}) — used built-in questions`,!0)}if((!e||e.error===`not_enough_content`||!e.questions.length)&&(e=d(O,k)),e.error===`not_enough_content`||!e.questions.length){b.innerHTML=`
          <div class="screen screen-center">
            <div class="empty-state">
              <div class="art">${i(`sparkles`)}</div>
              <h3>Not enough content</h3>
              <p>This document doesn't have enough readable text to build a quiz. Try a text-rich file.</p>
              <button class="btn btn-secondary" id="goback" style="max-width:200px;margin:0 auto">Back</button>
            </div>
          </div>`,b.querySelector(`#goback`).addEventListener(`click`,()=>E.go(`setup`));return}j=e.questions,E.state.cachedQuiz={[O.id]:{questions:j,configKey:v(k),index:0,correct:0,answers:[]}}}else{let e=E.state.cachedQuiz[O.id];if(e.configKey!==v(k)){E.go(`quiz`);return}j=e.questions}A=E.state.cachedQuiz[O.id]}A.startTime=Date.now();let M=null,N=!1,P=b,F={},I=[...new Set(j.filter(e=>e.imageId).map(e=>e.imageId))];for(let e of I)try{let t=await a(e);t?.blob&&(F[e]=URL.createObjectURL(t.blob))}catch{}function L(){for(let e of Object.values(F))URL.revokeObjectURL(e)}function R(){return j[A.index]}function z(){return j.length}function B(){let e=R();clearInterval(M),N=!1;let n=``;e.type===`mcq`?n=e.options.map((e,t)=>`
        <button class="opt-btn" data-i="${t}">
          <span class="opt-key">${String.fromCharCode(65+t)}</span>
          <span>${f(e)}</span>
        </button>`).join(``):e.type===`fib`?n=e.choices.map((e,t)=>`
        <button class="opt-btn" data-i="${t}">
          <span class="opt-key">${t+1}</span>
          <span>${f(e)}</span>
        </button>`).join(``):e.type===`tf`?n=`
        <div class="tf-row">
          <button class="tf-btn true-opt" data-ans="true">${i(`check`)} True</button>
          <button class="tf-btn false-opt" data-ans="false">${i(`x`)} False</button>
        </div>`:e.type===`id`?n=`
        <input class="text-input" id="id-input" placeholder="Type your answer…" aria-label="Type your answer" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <button class="btn btn-primary" id="id-submit" style="margin-top:12px">Submit</button>`:e.type===`matching`?n=`
        <div class="match-grid">
          <div class="match-col">
            ${e.pairs.map((e,t)=>`<button class="match-cell match-left" data-left="${t}">${f(e.left)}</button>`).join(``)}
          </div>
          <div class="match-col">
            ${e.rightOrder.map((t,n)=>`<button class="match-cell match-right" data-right="${n}" data-pair="${t}">${f(e.pairs[t].right)}</button>`).join(``)}
          </div>
        </div>
        <button class="btn btn-primary" id="match-submit" style="margin-top:14px;width:100%" disabled data-tooltip="Pair every term first">Check matches</button>`:e.type===`ordering`?n=`
        <div class="order-pool" id="order-pool"></div>
        <div class="order-answer" id="order-answer"></div>
        <button class="btn btn-primary" id="order-submit" style="margin-top:14px;width:100%" disabled data-tooltip="Place every step first">Check order</button>`:e.type===`short`&&(n=`
        <input class="text-input" id="short-input" placeholder="Type your answer…" aria-label="Type your answer" autocomplete="off" />
        <button class="btn btn-primary" id="short-submit" style="margin-top:12px">Submit</button>`);let r=e.type===`matching`||e.type===`ordering`?``:e.type===`short`?`<p class="q-stem">${f(e.prompt||e.stem||e.statement||e.clue||``)}</p>`:e.type===`tf`?`<p class="q-stem">${f(e.statement)}</p>`:e.type===`id`?`<p class="q-stem">Identify the missing term:<br/><span style="font-size:15px;color:var(--text-dim);display:block;margin-top:10px;line-height:1.6">“${f(e.clue)}”</span></p>`:`<p class="q-stem">${o(e.stem)}</p>`,a=e.imageId&&F[e.imageId]?`<img class="q-image" src="${F[e.imageId]}" alt="Question image" loading="lazy" />`:``;P.innerHTML=`
      <div class="quiz-topbar">
        <button class="icon-btn" id="quit-btn" data-tooltip="Quit quiz">${i(`x`)}</button>
        <div class="progress-track" data-tooltip="Your progress through the quiz"><div class="progress-fill" id="progress-fill"></div></div>
        <span class="q-counter" id="q-counter" data-tooltip="Question number"></span>
        ${k?.timerSec>0?`<span class="timer-chip" id="timer-chip" data-tooltip="Time remaining">`+i(`timer`)+`<span id="timer-val"></span></span>`:``}
      </div>
      <div class="quiz-body">
        <img class="q-wiz" src="/wizard/wizard-thinking.jpg" alt="" />
        ${a}
        <div class="q-type-badge"><span class="chip on">${t[e.type].short}</span></div>
        ${r}
        <div id="answers">${n}</div>
        <div id="feedback-zone"></div>
      </div>
    `,P.querySelector(`#progress-fill`).style.width=`${(A.index+1)/z()*100}%`,P.querySelector(`#q-counter`).textContent=`${A.index+1}/${z()}`,k?.timerSec>0&&H(k.timerSec),ne(e);let s=P.querySelector(`.q-image`);s&&s.addEventListener(`click`,()=>V(s.src))}function V(e){let t=document.getElementById(`quiz-img-viewer`);if(!t){t=document.createElement(`div`),t.id=`quiz-img-viewer`,t.className=`img-viewer hidden`,t.innerHTML=`
        <div class="iv-zoom-bar">
          <button class="iv-zoom" id="qiv-zoom-out" aria-label="Zoom out">${i(`minus`)}</button>
          <button class="iv-zoom" id="qiv-reset" aria-label="Reset zoom">${i(`refresh`)}</button>
          <button class="iv-zoom" id="qiv-zoom-in" aria-label="Zoom in">${i(`plus`)}</button>
        </div>
        <button class="iv-close" id="qiv-close" aria-label="Close">${i(`x`)}</button>
        <img id="qiv-img" alt="Viewing image" />`,document.body.appendChild(t),t.addEventListener(`click`,e=>{(e.target===t||e.target.id===`qiv-close`)&&t.classList.add(`hidden`)});let e=t.querySelector(`#qiv-img`);t._zoom=_(t,e),t.querySelector(`#qiv-zoom-in`).addEventListener(`click`,e=>{e.stopPropagation(),t._zoom.zoomIn()}),t.querySelector(`#qiv-zoom-out`).addEventListener(`click`,e=>{e.stopPropagation(),t._zoom.zoomOut()}),t.querySelector(`#qiv-reset`).addEventListener(`click`,e=>{e.stopPropagation(),t._zoom.reset()})}t.querySelector(`#qiv-img`).src=e,t._zoom?.reset(),t.classList.remove(`hidden`)}function H(e){let t=e,n=P.querySelector(`#timer-val`),r=P.querySelector(`#timer-chip`);n.textContent=t,M=setInterval(()=>{t--,n.textContent=Math.max(0,t),t<=5&&r.classList.add(`danger`),t<=0&&(clearInterval(M),q(null))},1e3)}function U(){clearInterval(M)}let W=!0;function G(e,t,n=null,r=null){W=!n;let a=P.querySelector(`#feedback-zone`),o=R(),s=h()&&m().aiExplain!==!1&&!o.explanation,c=async()=>{!W&&n&&(W=!0,await p(n,e?`good`:`again`).catch(()=>{})),(A.index<z()-1?X:Z)()};a.innerHTML=`
      <img class="q-wiz-fb" src="/wizard/${e?`wizard-celebrating`:`wizard-encouraging`}.jpg" alt="" />
      <div class="feedback-banner ${e?`good`:`bad`}">
        ${i(e?`check`:`x`)}
        <div>
          ${e?`Correct!`:`Incorrect`}
          ${!e&&t?`<span class="fb-answer">Answer: ${f(t)}</span>`:``}
        </div>
      </div>
      ${s?`
      <button class="btn btn-ghost explain-btn" id="explain-btn" style="margin-top:14px;width:100%" data-tooltip="Ask Gemini why this answer is right">${i(`sparkles`)} Why? Explain answer</button>
      <div id="explain-zone"></div>`:``}
      ${n==null?``:`
      <div style="margin-top:12px">
        <p class="faint" style="font-size:11.5px;text-align:center;margin-bottom:8px">Schedule next review</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
          <button class="btn srs-btn srs-again" data-grade="again">Again</button>
          <button class="btn srs-btn srs-hard" data-grade="hard">Hard</button>
          <button class="btn srs-btn srs-good" data-grade="good">Good</button>
          <button class="btn srs-btn srs-easy" data-grade="easy">Easy</button>
        </div>
      </div>`}
      ${A.index<z()-1?`<button class="btn btn-secondary" id="next-btn" style="margin-top:14px;width:100%">Next Question ${i(`chevronRight`)}</button>`:`<button class="btn btn-good" id="finish-btn" style="margin-top:14px;width:100%">${i(`trophy`)} See Results</button>`}
    `,(P.querySelector(`#next-btn`)||P.querySelector(`#finish-btn`)).focus({preventScroll:!0}),P.querySelector(`#next-btn`)?.addEventListener(`click`,c),P.querySelector(`#finish-btn`)?.addEventListener(`click`,c),n!=null&&P.querySelectorAll(`.srs-btn`).forEach(e=>e.addEventListener(`click`,async()=>{W=!0,await p(n,e.dataset.grade).catch(()=>{}),(A.index<z()-1?X:Z)()}));let l=P.querySelector(`#explain-btn`);l&&l.addEventListener(`click`,async()=>{l.disabled=!0,l.textContent=`Thinking…`;try{let e=await g(R(),r);o.explanation=e,P.querySelector(`#explain-zone`).innerHTML=`<div class="explain-box">${f(e)}</div>`,l.remove()}catch{P.querySelector(`#explain-zone`).innerHTML=`<div class="explain-box faint">Couldn't load an explanation right now.</div>`,l.remove()}})}function K(e,t){let n=(e,t,n)=>{e.classList.remove(`dimmed`),t?e.classList.add(`correct`):n?e.classList.add(`wrong`):e.classList.add(`dimmed`),e.setAttribute(`disabled`,``)};P.querySelectorAll(`.opt-btn`).forEach((r,i)=>{let a=e.answerIndex!=null&&i===e.answerIndex;n(r,a,i===t&&!a)}),P.querySelectorAll(`.tf-btn`).forEach(r=>{let i=r.dataset.ans===`true`;n(r,i===e.answer,i!==e.answer&&(t===!0&&r.classList.contains(`true-opt`)||t===!1&&r.classList.contains(`false-opt`)))})}async function q(t){if(N)return;N=!0,U();let n=R(),r=!1;if(n.type===`mcq`||n.type===`fib`)r=t!=null&&t===n.answerIndex,K(n,t);else if(n.type===`tf`)r=t===n.answer,K(n,t);else if(n.type===`id`){let t=P.querySelector(`#id-input`);r=e(t?.value??``,n.answer),t&&t.setAttribute(`disabled`,``)}else return;Y(r,J(n,t))}function J(e,t){return e.type===`mcq`||e.type===`fib`?t==null?null:(e.options??e.choices)?.[t]??null:e.type===`tf`?t===!0?`True`:t===!1?`False`:null:e.type===`id`?P.querySelector(`#id-input`)?.value?.trim()??null:null}async function Y(e,t){let r=R(),i=r.type===`id`?r.answer:r.type===`tf`?String(r.answer):r.type===`short`?r.answer:r.type===`ordering`?r.steps.join(` → `):r.type===`matching`?r.pairs.map(e=>e.left).join(`, `):r.options?.[r.answerIndex]??r.choices?.[r.answerIndex];A.answers.push({type:r.type,sentence:r.meta?.sentence||r.statement||r.prompt||``,term:r.meta?.term||r.answer,chosen:t,correct:i,userOk:e}),e&&A.correct++;let a=O?.id||r.meta?.docId,o=r.meta?.sentence||r.statement||``,d=r.meta?.term||r.answer,f=null;if(a&&o&&d){e?l(a,d,o).catch(()=>{}):u({docId:a,sentence:o,term:d,type:r.type}).catch(()=>{});try{f=s(a,d,o),await n(f)||await c({docId:a,sentence:o,term:d,type:r.type}),A.mistakeMode||await p(f,e?`good`:`again`)}catch{}}x(O,A,j),G(e,i,A.mistakeMode?f:null,t)}function ne(e){if(e.type===`mcq`||e.type===`fib`)P.querySelectorAll(`.opt-btn`).forEach((e,t)=>e.addEventListener(`click`,()=>q(t)));else if(e.type===`tf`)P.querySelectorAll(`.tf-btn`).forEach(e=>e.addEventListener(`click`,()=>q(e.dataset.ans===`true`)));else if(e.type===`id`){let e=()=>q(P.querySelector(`#id-input`).value);P.querySelector(`#id-submit`).addEventListener(`click`,e);let t=P.querySelector(`#id-input`);t.focus({preventScroll:!0}),t.addEventListener(`keydown`,t=>{t.key===`Enter`&&e()})}else if(e.type===`matching`)re(e);else if(e.type===`ordering`)ie(e);else if(e.type===`short`){let e=()=>ae(P.querySelector(`#short-input`).value);P.querySelector(`#short-submit`).addEventListener(`click`,e);let t=P.querySelector(`#short-input`);t.focus({preventScroll:!0}),t.addEventListener(`keydown`,t=>{t.key===`Enter`&&e()})}P.querySelector(`#quit-btn`).addEventListener(`click`,se)}function re(e){let t=[...P.querySelectorAll(`.match-left`)],n=[...P.querySelectorAll(`.match-right`)],r={},i=null;function a(){let t=Object.keys(r).length===e.pairs.length,n=P.querySelector(`#match-submit`);n&&(n.disabled=!t)}t.forEach(e=>e.addEventListener(`click`,()=>{t.forEach(e=>e.classList.remove(`sel`)),e.classList.add(`sel`),i=e})),n.forEach(e=>e.addEventListener(`click`,()=>{if(!i)return;let o=Object.keys(r).find(t=>r[t]===e);o!=null&&delete r[o],r[i.dataset.left]=e,n.forEach(e=>e.classList.remove(`linked`)),t.forEach(e=>e.classList.remove(`linked`)),e.classList.add(`linked`),i.classList.add(`linked`),i.classList.remove(`sel`),i=null,a()})),P.querySelector(`#match-submit`).addEventListener(`click`,()=>{let n=!0;for(let i=0;i<e.pairs.length;i++){let e=r[i],a=e&&Number(e.dataset.pair)===i;a||(n=!1),e?.classList.add(a?`correct`:`wrong`),t[i].classList.add(a?`correct`:`wrong`)}Y(n,`Matched ${Object.keys(r).filter(e=>Number(r[e].dataset.pair)===Number(e)).length}/${e.pairs.length}`)})}function ie(e){let t=P.querySelector(`#order-pool`),n=P.querySelector(`#order-answer`),r=[];function i(){t.innerHTML=e.shuffled.filter(e=>!r.includes(e)).map(t=>`<button class="order-cell" data-step="${t}">${f(e.steps[t])}</button>`).join(``),n.innerHTML=r.map((t,n)=>`<button class="order-ans" data-k="${n}"><span class="order-pos">${n+1}</span>${f(e.steps[t])}</button>`).join(``);let a=P.querySelector(`#order-submit`);a&&(a.disabled=r.length!==e.steps.length),t.querySelectorAll(`.order-cell`).forEach(e=>e.addEventListener(`click`,()=>{r.push(Number(e.dataset.step)),i()})),n.querySelectorAll(`.order-ans`).forEach(e=>e.addEventListener(`click`,()=>{r.splice(Number(e.dataset.k),1),i()}))}i(),P.querySelector(`#order-submit`).addEventListener(`click`,()=>{let t=r.every((e,t)=>e===t);n.querySelectorAll(`.order-ans`).forEach((e,t)=>e.classList.add(r[t]===t?`correct`:`wrong`)),Y(t,`Order: ${r.map(t=>e.steps[t]).join(` → `)}`)})}async function ae(t){if(N)return;N=!0,U();let n=R(),r=(t||``).trim(),i=e(r,n.answer),a=await te(r,n).catch(()=>null);a!=null&&(i=a),Y(i,r)}function X(){if(A.index>=z()-1)return Z();A.index++,B(),window.scrollTo(0,0)}async function Z(){U(),L();let e=(Date.now()-A.startTime)/1e3,t=Math.round(A.correct/z()*100),n=A.answers.filter(e=>!e.userOk).length,r={};for(let e of A.answers)r[e.type]=r[e.type]||{c:0,t:0},r[e.type].t++,e.userOk&&r[e.type].c++;(!A.mistakeMode&&O||A.examMode)&&await E.saveAttemptRecord({docId:O?.id||null,docName:A.docName||O?.name||`Exam Prep`,examId:A.examId||void 0,correct:A.correct,total:z(),percent:t,durationSec:e,byType:r}),E.state.lastResult={docId:O?.id||null,docName:A.docName||O?.name,correct:A.correct,total:z(),percent:t,durationSec:e,wrongCount:n,mistakeMode:!!A.mistakeMode,shared:!!A.shared,examMode:!!A.examMode,challenge:A.challenge||null,cfg:{timerSec:k?.timerSec||0},byType:r,review:j.map((e,t)=>{let n=e.statement||e.stem||e.clue||e.prompt||``,r=e.type===`id`||e.type===`short`?e.answer:e.type===`tf`?String(e.answer):(e.options??e.choices)?.[e.answerIndex];return e.type===`matching`?(n=`Match terms: ${(e.pairs||[]).map(e=>e.left).join(` / `)}`,r=(e.pairs||[]).map(e=>`${e.left} → ${e.right}`).join(`  |  `)):e.type===`ordering`&&(n=e.prompt||`Put the steps in order`,r=(e.steps||[]).join(` → `)),{prompt:n,answer:r,chosen:A.answers[t]?.chosen??null,ok:A.answers[t]?.userOk}}),questions:j.map(e=>({...e}))},!A.mistakeMode&&O&&delete E.state.cachedQuiz[O.id],S(),$(),oe()}function oe(){clearInterval(M),E.go(`results`)}function se(){let e=document.createElement(`div`);e.className=`quit-dialog-mask`,e.innerHTML=`
      <div class="quit-dialog">
        <h3>Quit this quiz?</h3>
        <p>Your progress in this attempt won't be saved.</p>
        <div class="quit-actions">
          <button class="btn btn-danger-ghost" id="qd-yes">Yes, quit</button>
          <button class="btn btn-primary" id="qd-no">Keep going</button>
        </div>
      </div>`,document.body.appendChild(e),e.addEventListener(`click`,t=>{t.target===e&&e.remove()}),e.querySelector(`#qd-yes`).addEventListener(`click`,()=>{e.remove(),ce()}),e.querySelector(`#qd-no`).addEventListener(`click`,()=>e.remove())}function ce(){clearInterval(M),L(),O&&delete E.state.cachedQuiz[O.id],E.state.mistakeReview=null,S(),$(),E.go(`library`)}let Q=null;function $(){Q&&(document.removeEventListener(`keydown`,Q),Q=null)}Q=e=>{if(document.querySelector(`.quit-dialog-mask`))return;let t=j[A.index];if(t&&e.target.tagName!==`INPUT`){if(N){e.key===`Enter`&&(P.querySelector(`#next-btn`)?.click(),P.querySelector(`#finish-btn`)?.click());return}if(t.type===`mcq`||t.type===`fib`){let n=t.options||t.choices,r=parseInt(e.key,10);if(r>=1&&r<=n.length){q(r-1);return}let i=e.key.toUpperCase(),a=[`A`,`B`,`C`,`D`].indexOf(i);a>=0&&a<n.length&&q(a)}else if(t.type===`tf`){let t=e.key.toLowerCase();t===`t`?q(!0):t===`f`&&q(!1)}}},document.addEventListener(`keydown`,Q),T=$,window.__quizSession={session:j,st:A,cfg:k,doc:O},B()}export{D as render,E as unmount};