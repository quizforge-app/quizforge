import{t as e}from"./topics-2sMjMAqj.js";import{E as t,H as n,K as r,O as i,S as a,k as o,p as s,x as c,y as l}from"./index-CybBJgOJ.js";import{r as u}from"./gemini-BQvNqYOp.js";import{n as d}from"./quiz-ai-DuRyqvKb.js";import{t as f}from"./shareModal-BmXSxBJv.js";var p=[`mcq`,`tf`,`fib`,`id`,`matching`,`ordering`,`short`];async function m(m,v){let y=await n(v.state.currentDocId);if(!y){v.go(`library`);return}let b=v.getConfig(y.id),x=b.count,S={...b.mix},C=b.difficulty,w=b.shuffle,T=b.timerSec,E=b.fresh,D=b.ai!==!1,O=!!b.focusWeak,k=b.deepVisual!==!1,A=Array.isArray(y.topics)&&y.topics.length?y.topics:e(y.text).topics,j=new Set(b.topics||[]),M=i(y,{...b,topics:[...j]});x>M&&(x=Math.max(1,M)),m.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to library">${a(`chevronLeft`)}</button>
      <h2>Quiz Setup</h2>
      <button class="icon-btn" id="theme-btn" data-tooltip="${v.state.theme===`dark`?`Switch to light mode`:`Switch to dark mode`}">${v.state.theme===`dark`?a(`sun`):a(`moon`)}</button>
    </header>
    <div class="screen has-actionbar">
      <div class="setup-hero">
        <div class="doc-icon ${y.type}">${a(`fileText`)}</div>
        <div style="min-width:0">
          <div class="doc-name">${s(y.name)}</div>
          <div class="doc-meta">${c(y.type)} · ${y.wordCount.toLocaleString()} words</div>
        </div>
      </div>

      ${l(`Number of questions`)}
      <div class="card row" style="padding:13px 16px;border-top:none">
        <span class="label">Questions</span>
        <div class="stepper" data-tooltip="How many questions to generate (1–200)">
          <button id="count-minus" data-tooltip="Fewer questions">−</button>
          <span class="val" id="count-val">${x}</span>
          <button id="count-plus" data-tooltip="More questions">+</button>
        </div>
      </div>
      <p class="faint" id="pool-hint" style="font-size:12px;margin:8px 4px 0"></p>
      ${l(`Question types`)}
      <div class="type-grid">
        ${p.map(e=>`
          <button class="type-card ${S[e]?`on`:``}" data-type="${e}" data-tooltip="${_(e)}">
            <div class="t-head">${h(e)}${t[e].name}</div>
            <div class="t-sub">${g(e)}</div>
            <div class="t-count" data-count-for="${e}"></div>
          </button>`).join(``)}
      </div>

      ${A.length?`
      ${l(`Topics in this document`)}
      <div class="chip-row" id="topic-row">
        <button class="chip ${j.size===0?`on`:``}" data-topic-all data-tooltip="Include every topic in the quiz">All topics</button>
        ${A.map(e=>`
          <button class="chip ${j.has(e.title)?`on`:``}" data-topic="${s(e.title)}" data-tooltip="Focus questions on this topic only">
            ${s(e.title)} <span class="chip-count">${e.count}</span>
          </button>`).join(``)}
      </div>
      <p class="faint" id="topic-hint" style="font-size:12px;margin:8px 4px 0"></p>`:``}

      ${l(`Difficulty`)}
      <div class="seg" id="diff-seg" data-tooltip="Easier = common terms · Harder = rare terms">
        <button data-diff="easy" class="${C===`easy`?`on`:``}" data-tooltip="Common, frequently-appearing terms">Easy</button>
        <button data-diff="medium" class="${C===`medium`?`on`:``}" data-tooltip="Balanced mix of terms">Medium</button>
        <button data-diff="hard" class="${C===`hard`?`on`:``}" data-tooltip="Rare, specific technical terms">Hard</button>
      </div>

      ${l(`Options`)}
      <div class="card" style="padding:2px 16px;border-top:1px solid var(--border)">
        <div class="row" data-tooltip="Google Gemini writes complete exam-style questions from the parsed content">
          <div><div class="label">AI-written questions</div><div class="sub">${u()?`Gemini · key set`:`Gemini · add a free key in Settings`}</div></div>
          <div class="switch ${D?`on`:``}" id="sw-ai" data-tooltip="Toggle AI question writing"></div>
        </div>
        <div class="row" data-tooltip="When on, the next attempt uses a new random order">
          <div><div class="label">Shuffle questions</div><div class="sub">Randomize order every attempt</div></div>
          <div class="switch ${w?`on`:``}" id="sw-shuffle" data-tooltip="Toggle shuffling"></div>
        </div>
        <div class="row">
          <div><div class="label">Timer</div><div class="sub">Seconds per question</div></div>
          <div class="seg" id="timer-seg" style="grid-auto-columns:auto;width:auto" data-tooltip="Add time pressure per question">
            ${[0,15,30].map(e=>`<button data-sec="${e}" style="padding:8px 14px" class="${T===e?`on`:``}">${e===0?`Off`:e+`s`}</button>`).join(``)}
          </div>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="On = brand-new questions each time; Off = identical quiz">
          <div><div class="label">Fresh questions each attempt</div><div class="sub">Regenerate from the document instead of repeating</div></div>
          <div class="switch ${E?`on`:``}" id="sw-fresh" data-tooltip="Toggle fresh generation"></div>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Weight questions toward terms you've gotten wrong before, across all your quizzes">
          <div><div class="label">Focus my weak spots</div><div class="sub">Bias generation toward your past mistakes</div></div>
          <div class="switch ${O?`on`:``}" id="sw-weak" data-tooltip="Toggle weakness-aware generation"></div>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Gemini analyzes page images, diagrams, code & charts; GLM writes the questions so you're quizzed on the visuals too">
          <div><div class="label">Deep visual analysis</div><div class="sub">Questions from diagrams, code & charts</div></div>
          <div class="switch ${k?`on`:``}" id="sw-visual" data-tooltip="Toggle visual analysis"></div>
        </div>
      </div>

      <div class="setup-actionbar">
        <button class="btn btn-primary" id="start-btn" style="font-size:15px;padding:15px">
          ${a(`play`)} Start Quiz
        </button>
        <button class="btn btn-secondary" id="share-btn" style="margin-top:10px;width:100%" data-tooltip="Generate this quiz and get a link to send — no app or key needed to play">
          ${a(`share`)} Share quiz link
        </button>
        <p class="center faint" id="gen-note" style="font-size:12px;margin-top:10px"></p>
      </div>
    </div>
  `;let N=m.querySelector(`#pool-hint`),P=m.querySelector(`#gen-note`),F=m.querySelector(`#topic-hint`);function I(){m.querySelectorAll(`#topic-row [data-topic]`).forEach(e=>{e.classList.toggle(`on`,j.has(e.dataset.topic))}),m.querySelector(`[data-topic-all]`)?.classList.toggle(`on`,j.size===0),F&&(F.textContent=j.size?`Focusing on ${j.size} topic${j.size===1?``:`s`} — other topics are excluded`:`Questions will cover the whole document`)}m.querySelectorAll(`#topic-row [data-topic]`).forEach(e=>e.addEventListener(`click`,()=>{let t=e.dataset.topic;j.has(t)?j.delete(t):j.add(t),I(),L(),R()})),m.querySelector(`[data-topic-all]`)?.addEventListener(`click`,()=>{j.clear(),I(),L(),R()}),I();function L(){M=i(y,{count:999,mix:{...S},difficulty:C,topics:[...j]}),x>M&&(x=Math.max(1,M)),m.querySelector(`#count-val`).textContent=x,N&&(N.textContent=M<5?`This document supports about ${M} question${M===1?``:`s`} with current settings`:`Up to ~${M} questions available from this document`)}function R(){let e=p.filter(e=>S[e]),t=e.length?x:0;for(let n of p){let r=m.querySelector(`[data-count-for="${n}"]`);r.textContent=S[n]?`~${Math.max(1,Math.round(t/e.length))} questions`:`Off`}P.textContent=e.length?``:`Select at least one question type`,m.querySelector(`#start-btn`).disabled=!e.length}R(),L();function z(e){x=Math.min(M||200,Math.min(200,Math.max(1,e))),m.querySelector(`#count-val`).textContent=x,R()}m.querySelector(`#count-minus`).addEventListener(`click`,()=>z(x-(x>10?5:1))),m.querySelector(`#count-plus`).addEventListener(`click`,()=>z(x+(x>=10?5:1))),m.querySelectorAll(`.type-card`).forEach(e=>e.addEventListener(`click`,()=>{let t=e.dataset.type,n=Object.values(S).filter(Boolean).length;S[t]&&n===1||(S[t]=!S[t],e.classList.toggle(`on`,S[t]),R())})),m.querySelectorAll(`#diff-seg button`).forEach(e=>e.addEventListener(`click`,()=>{C=e.dataset.diff,m.querySelectorAll(`#diff-seg button`).forEach(t=>t.classList.toggle(`on`,t===e)),L(),R()})),m.querySelectorAll(`#timer-seg button`).forEach(e=>e.addEventListener(`click`,()=>{T=parseInt(e.dataset.sec,10),m.querySelectorAll(`#timer-seg button`).forEach(t=>t.classList.toggle(`on`,t===e))})),m.querySelector(`#sw-ai`).addEventListener(`click`,e=>{D=!D,e.currentTarget.classList.toggle(`on`,D)}),m.querySelector(`#sw-shuffle`).addEventListener(`click`,e=>{w=!w,e.currentTarget.classList.toggle(`on`,w)}),m.querySelector(`#sw-fresh`).addEventListener(`click`,e=>{E=!E,e.currentTarget.classList.toggle(`on`,E)}),m.querySelector(`#sw-weak`).addEventListener(`click`,e=>{O=!O,e.currentTarget.classList.toggle(`on`,O)}),m.querySelector(`#sw-visual`).addEventListener(`click`,e=>{k=!k,e.currentTarget.classList.toggle(`on`,k)}),m.querySelector(`#back-btn`).addEventListener(`click`,()=>v.go(`library`)),m.querySelector(`#theme-btn`).addEventListener(`click`,()=>v.toggleTheme()),m.querySelector(`#start-btn`).addEventListener(`click`,async()=>{let e={count:x,mix:{...S},difficulty:C,shuffle:w,timerSec:T,fresh:E,topics:[...j],ai:D,focusWeak:O,deepVisual:k,fixedSeed:null};if(O)try{e.weakTerms=await r(y.id)}catch{e.weakTerms=[]}v.saveConfig(y.id,e),v.go(`quiz`)}),m.querySelector(`#share-btn`).addEventListener(`click`,async()=>{let e=m.querySelector(`#share-btn`),t=e.innerHTML;e.disabled=!0,e.textContent=`Generating…`;try{let e={count:x,mix:{...S},difficulty:C,shuffle:w,timerSec:T,fresh:E,topics:[...j],ai:D,focusWeak:O,deepVisual:k};if(O)try{e.weakTerms=await r(y.id)}catch{e.weakTerms=[]}let t=null;if(e.ai&&u()&&(t=await d(y,e,()=>{})),(!t||t.error===`not_enough_content`||!t.questions||!t.questions.length)&&(t=o(y,e)),!t||!t.questions||!t.questions.length){v.toast(`Not enough content to build a shareable quiz`,!0);return}f(v,{title:y.name,questions:t.questions,timerSec:e.timerSec,mode:`quiz`})}catch{v.toast(`Could not create a share link`,!0)}finally{e.disabled=!1,e.innerHTML=t}})}function h(e){return{mcq:a(`listChecks`),tf:a(`check`),fib:a(`fileText`),id:a(`target`),matching:a(`gitCompare`),ordering:a(`listOrdered`),short:a(`edit`)}[e]}function g(e){return{mcq:`Pick from 4 choices`,tf:`Judge the statement`,fib:`Complete the sentence`,id:`Name the missing term`,matching:`Match terms to definitions`,ordering:`Put steps in order`,short:`Write a short answer`}[e]}function _(e){return{mcq:`Choose the correct answer from 4 options`,tf:`Decide if the statement is true or false`,fib:`Fill the blank — complete the sentence`,id:`Type the term that matches the description`,matching:`Pair each term with the sentence that defines it`,ordering:`Arrange the shuffled steps into the correct sequence`,short:`Type a short phrase — graded automatically`}[e]}export{m as render};