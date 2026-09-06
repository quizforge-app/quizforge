const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-rFn9O_LP.js","assets/topics-2sMjMAqj.js","assets/assets-C7X78vgS.js","assets/index-D_wIOZq8.css","assets/mistakes-BabzbVSY.js"])))=>i.map(i=>d[i]);
import{i as e}from"./topics-2sMjMAqj.js";import{$ as t,E as n,K as r,S as i,et as a,n as o,p as s,rt as c,y as l}from"./index-rFn9O_LP.js";import{startMistakeReview as u,startWeakReview as d}from"./mistakes-BabzbVSY.js";import{r as f}from"./gemini-BQvNqYOp.js";import{r as p}from"./export-CXckpnF6.js";import{t as m}from"./explain-WFycShmV.js";import{t as h}from"./shareModal-CrfQT1pV.js";async function g(g,y){let b=y.state.lastResult;if(!b){y.go(`library`);return}let x=f()&&c().aiExplain!==!1,S=y.state.challenge||b.challenge||null,C=0,w=0;try{let[e,t]=await Promise.all([r(null),a(60)]);C=e.length,w=t.length}catch{}let T=null;try{let{getDoc:n}=await o(async()=>{let{getDoc:e}=await import(`./index-rFn9O_LP.js`).then(e=>e.pt);return{getDoc:e}},__vite__mapDeps([0,1,2,3])),r=(await t()).filter(e=>e.id!==b.docId),i=new Set(e(b.review?.map(e=>e.correct).join(`. `)||``).map(e=>e.term.toLowerCase()).slice(0,12));if(i.size){let t=null;for(let a of r.slice(0,12)){let r=await n(a.id).catch(()=>null);if(!r?.text)continue;let o=new Set(e(r.text).map(e=>e.term.toLowerCase()).slice(0,16)),s=0;for(let e of i)o.has(e)&&s++;(!t||s>t.overlap)&&(t={doc:{...a},overlap:s})}t&&t.overlap>=2&&(T=t)}}catch{}let E=b.percent>=90?[`Outstanding!`,`You have mastered this material.`]:b.percent>=75?[`Great job!`,`Solid understanding — review the misses to perfect it.`]:b.percent>=50?[`Good effort`,`A quick review will push you higher.`]:[`Keep practicing`,`Revisit the document and try again.`];g.innerHTML=`
    <div class="screen">
      <canvas class="confetti-canvas" id="confetti"></canvas>

      <div class="result-ring-wrap">
        <div class="result-ring">
          <svg width="172" height="172" viewBox="0 0 172 172">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
            <circle class="rr-bg" cx="86" cy="86" r="76" fill="none" stroke-width="13"/>
            <circle class="rr-fill" id="ring-fill" cx="86" cy="86" r="76" fill="none" stroke-width="13"
              stroke-linecap="round"
              stroke-dasharray="${2*Math.PI*76}"
              stroke-dashoffset="${2*Math.PI*76}"/>
          </svg>
          <div class="rr-center">
            <div class="rr-pct" id="rr-pct">0%</div>
            <div class="rr-lbl">${b.correct} of ${b.total} correct</div>
          </div>
        </div>
      </div>

      <div class="result-verdict">
        <h2>${E[0]}</h2>
        <p>${s(b.docName)} · ${Math.round(b.durationSec)}s</p>
      </div>

      ${S?`
      <div class="card challenge-compare">
        <div class="cc-row ${b.percent>=S.p?`win`:``}">
          <span class="cc-who">${i(`sparkles`)} You</span>
          <div class="cc-bar"><div class="cc-fill you" style="width:${b.percent}%"></div></div>
          <span class="cc-score">${b.percent}%</span>
        </div>
        <div class="cc-row ${S.p>b.percent?`win`:``}">
          <span class="cc-who">${i(`users`)} ${s(S.n||`Friend`)}</span>
          <div class="cc-bar"><div class="cc-fill them" style="width:${S.p}%"></div></div>
          <span class="cc-score">${S.p}%</span>
        </div>
        <p class="cc-note">${b.percent>=S.p?`You matched or beat the challenge!`:s(S.n||`Friend`)+` is still ahead — try again!`}</p>
      </div>`:``}

      ${Object.keys(b.byType).length>1?`
      ${l(`By question type`)}
      <div class="card breakdown">
        ${Object.entries(b.byType).map(([e,t])=>`
          <div class="bd-row">
            <span class="bd-name">${n[e]?.name||e}</span>
            <div class="bd-bar"><div class="bd-fill" style="width:${Math.round(t.c/t.t*100)}%"></div></div>
            <span class="bd-score">${t.c}/${t.t}</span>
          </div>`).join(``)}
      </div>`:``}

      ${!b.mistakeMode&&(C>0||w>0)?`
      <div class="next-steps">
        <div class="ns-head">${i(`sparkles`)} What's next?</div>
        <div class="ns-lines">
          ${C>0?`<div class="ns-line">You're weak on <b>${C} term${C===1?``:`s`}</b> across your quizzes.</div>`:``}
          ${w>0?`<div class="ns-line"><b>${w} review card${w===1?` is`:`s are`} due</b> — spaced repetition works best today, not tomorrow.</div>`:``}
        </div>
        <div class="ns-actions">
          ${C>0?`<button class="btn btn-primary ns-btn" id="weak-review-btn">${i(`target`)} Drill my weak spots</button>`:``}
          ${w>0?`<button class="btn btn-secondary ns-btn" id="due-review-btn">${i(`timer`)} Review ${w} due card${w===1?``:`s`}</button>`:``}
        </div>
      </div>`:``}
      ${T&&T.overlap>=2?`
      <button class="also-like" id="also-like-btn" data-tooltip="Open this document's reviewer">
        <span class="al-icon">${i(`book`)}</span>
        <span class="al-main">
          <span class="al-title">You might also like: ${s(T.doc.name)}</span>
          <span class="al-sub">${T.overlap} key term${T.overlap===1?``:`s`} in common with this quiz</span>
        </span>
        <span class="al-go">${i(`chevronRight`)}</span>
      </button>`:``}

      <button class="btn btn-secondary" id="toggle-review" style="margin-top:22px;width:100%" data-tooltip="See each question with the correct answer">
        ${i(`eye`)} Review answers
      </button>
      <div id="review-panel" class="card hidden" style="margin-top:12px;max-height:340px;overflow-y:auto">
        ${b.review.map((e,t)=>`
          <div class="review-item">
            <div class="review-q"><strong style="color:${e.ok?`var(--good)`:`var(--bad)`}">${t+1}.</strong> ${s(e.prompt)}</div>
            <div class="review-a" style="color:${e.ok?`var(--good)`:`var(--bad)`}">
              ${i(e.ok?`check`:`x`)} ${s(e.answer)}
            </div>
            <div class="review-explain" data-i="${t}">${b.questions?.[t]?.explanation?`<div class="explain-box">${s(b.questions[t].explanation)}</div>`:``}</div>
          </div>`).join(``)}
      </div>
      ${x?`<button class="btn btn-secondary" id="explain-all-btn" style="margin-top:10px;width:100%" data-tooltip="Ask Gemini to explain every answer">${i(`sparkles`)} Explain all answers</button>`:``}
      ${`<button class="btn btn-secondary" id="export-quiz-btn" style="margin-top:10px;width:100%" data-tooltip="Save this quiz as Markdown or PDF">${i(`download`)} Export quiz</button>`}
      <button class="btn btn-secondary" id="share-btn" style="margin-top:10px;width:100%" data-tooltip="Get a link or QR to send this quiz — no app or key needed">${i(`share`)} Share quiz link</button>
      <button class="btn btn-primary" id="challenge-btn" style="margin-top:10px;width:100%" data-tooltip="Challenge a friend to beat your score">${i(`users`)} Challenge a friend</button>

      <button class="btn btn-primary" id="retake-btn" style="margin-top:18px;width:100%" data-tooltip="${b.mistakeMode?`Try the mistake review again`:`Generate a new quiz from the same document`}">${i(`refresh`)} ${b.mistakeMode?`Review Again`:`Retake Quiz`}</button>
      ${b.wrongCount>0&&!b.mistakeMode&&b.docId?`<button class="btn btn-secondary" id="review-mistakes-btn" style="margin-top:10px;width:100%" data-tooltip="Practice only the questions you got wrong">${i(`alert`)} Review ${b.wrongCount} mistake${b.wrongCount===1?``:`s`}</button>`:``}
      <button class="btn btn-secondary" id="library-btn" style="margin-top:10px;width:100%">Back to Library</button>
    </div>
  `,requestAnimationFrame(()=>{setTimeout(()=>{let e=2*Math.PI*76;g.querySelector(`#ring-fill`).style.strokeDashoffset=String(e*(1-b.percent/100)),_(g.querySelector(`#rr-pct`),b.percent,`%`),D(g)},150)}),b.percent>=70&&v(g.querySelector(`#confetti`));function D(e){let t=e.querySelector(`.result-ring`);if(!t||matchMedia(`(prefers-reduced-motion: reduce)`).matches)return;let n=[];for(let e=0;e<14;e++){let e=document.createElement(`span`);e.className=`ring-spark`,t.appendChild(e),n.push(e)}let r=performance.now(),i=0;function a(e){let t=Math.min(1,(e-r)/1e3),o=t*(b.percent/100);n.forEach((e,t)=>{let n=Math.max(0,o-t*.035),r=n*2*Math.PI-Math.PI/2,i=86+76*Math.cos(r)*1,a=86+76*Math.sin(r),s=1-t/14;e.style.left=i+`px`,e.style.top=a+`px`,e.style.opacity=String(s*+(n>0)),e.style.transform=`translate(-50%, -50%) scale(${.55+s*.45})`}),t<1?i=requestAnimationFrame(a):n.forEach(e=>e.remove())}return i=requestAnimationFrame(a),()=>{cancelAnimationFrame(i),n.forEach(e=>e.remove())}}g.querySelector(`#toggle-review`).addEventListener(`click`,()=>{g.querySelector(`#review-panel`).classList.toggle(`hidden`)});let O=g.querySelector(`#explain-all-btn`);O?.addEventListener(`click`,async()=>{g.querySelector(`#review-panel`).classList.remove(`hidden`);let e=(b.questions||[]).map((e,t)=>[e,t]).filter(([e])=>!e.explanation);if(!e.length){y.toast(`All answers already explained`);return}O.disabled=!0;let t=0;for(let[n,r]of e){O.textContent=`Explaining ${t+1}/${e.length}…`;try{let e=await m(n,b.review[r]?.chosen??null);n.explanation=e;let t=g.querySelector(`.review-explain[data-i="${r}"]`);t&&e&&(t.innerHTML=`<div class="explain-box">${s(e)}</div>`)}catch{}t++}O.textContent=`${i(`sparkles`)} Explain all answers`,O.disabled=!1}),g.querySelector(`#export-quiz-btn`)?.addEventListener(`click`,()=>{p(b.docName||`Quiz`,b)||y.toast(`Nothing to export`)}),g.querySelector(`#share-btn`)?.addEventListener(`click`,()=>h(y,{title:b.docName,questions:b.questions,timerSec:b.cfg?.timerSec||0,mode:`quiz`})),g.querySelector(`#challenge-btn`)?.addEventListener(`click`,()=>h(y,{title:b.docName,questions:b.questions,timerSec:b.cfg?.timerSec||0,mode:`challenge`,score:{percent:b.percent,correct:b.correct,total:b.total}})),g.querySelector(`#retake-btn`).addEventListener(`click`,()=>{b.mistakeMode?y.go(`library`):b.shared?(y.state.sharedQuiz={title:b.docName,questions:b.questions,cfg:b.cfg},b.challenge&&(y.state.challenge=b.challenge),y.go(`quiz`)):y.go(`quiz`)}),g.querySelector(`#review-mistakes-btn`)?.addEventListener(`click`,()=>u(y,b.docId)),g.querySelector(`#weak-review-btn`)?.addEventListener(`click`,()=>d(y)),g.querySelector(`#due-review-btn`)?.addEventListener(`click`,()=>{o(()=>import(`./mistakes-BabzbVSY.js`).then(e=>e.startDueReview(y)),__vite__mapDeps([4,1,0,2,3]))}),g.querySelector(`#also-like-btn`)?.addEventListener(`click`,()=>{y.go(`reviewer`,T.doc.id)}),g.querySelector(`#library-btn`).addEventListener(`click`,()=>{b.shared&&(y.state.sharedQuiz=null,y.state.challenge=null),y.go(`library`)})}function _(e,t,n=``){let r=performance.now();function i(a){let o=Math.min(1,(a-r)/900),s=1-(1-o)**3;e.textContent=Math.round(s*t)+n,o<1&&requestAnimationFrame(i)}requestAnimationFrame(i)}function v(e){e.width=innerWidth,e.height=innerHeight;let t=e.getContext(`2d`),n=[`#6366f1`,`#a855f7`,`#34d399`,`#fbbf24`,`#fb7185`,`#60a5fa`],r=Array.from({length:130},()=>({x:Math.random()*e.width,y:-20-Math.random()*e.height*.5,w:7+Math.random()*7,h:9+Math.random()*9,c:n[Math.floor(Math.random()*n.length)],vy:2.4+Math.random()*3.4,vx:-1.6+Math.random()*3.2,rot:Math.random()*Math.PI,vr:-.14+Math.random()*.28})),i=0;function a(){t.clearRect(0,0,e.width,e.height);for(let e of r)e.x+=e.vx,e.y+=e.vy,e.rot+=e.vr,t.save(),t.translate(e.x,e.y),t.rotate(e.rot),t.fillStyle=e.c,t.fillRect(-e.w/2,-e.h/2,e.w,e.h),t.restore();i++,i<260?requestAnimationFrame(a):e.remove()}requestAnimationFrame(a)}export{g as render};