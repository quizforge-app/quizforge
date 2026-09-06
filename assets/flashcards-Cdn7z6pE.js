import{i as e,s as t,t as n}from"./topics-2sMjMAqj.js";import{G as r,H as i,S as a,dt as o,gt as s,j as c,p as l,q as u}from"./index-rFn9O_LP.js";function d(r,i=[]){let a=r.text,o=t(a),s=e(a),{membership:c}=n(a),l=o;if(i.length){let e=new Set(i.map(e=>e.toLowerCase()));l=o.filter(t=>{let n=c.get(t);return n&&e.has(n.toLowerCase())})}let u=l.join(` `),d=i.length&&l.length?e(u):s,p=l.map(e=>e.toLowerCase()),m=[],h=new Set;for(let e of d.slice(0,30)){let t=e.term,n=[];for(let e=0;e<l.length;e++)h.has(l[e])||new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`),`i`).test(p[e])&&n.push({text:l[e],index:e});if(!n.length)continue;let r=n.sort((e,t)=>e.text.length-t.text.length).slice(0,2);if(r.forEach(e=>h.add(e.text)),m.push({front:(e.phrase,f(e.term)),back:r.map(e=>e.text).join(` `),term:e.term}),m.length>=25)break}return m}function f(e){return e.charAt(0).toUpperCase()+e.slice(1)}async function p(e,t){let n=await i(t.state.currentDocId);if(!n){t.go(`library`);return}let f=d(n,[]);if(f.length<3){e.innerHTML=`
      <header class="back-header">
        <button class="icon-btn" id="back-btn">${a(`chevronLeft`)}</button>
        <h2>Flashcards</h2>
        <div class="spacer"></div>
      </header>
      <div class="screen">
        <div class="empty-state">
          <div class="art">${a(`sparkles`)}</div>
          <h3>Not enough terms</h3>
          <p>This document doesn't have enough distinct key terms to build flashcards. Try a longer, text-rich document.</p>
        </div>
      </div>
    `,e.querySelector(`#back-btn`).addEventListener(`click`,()=>t.go(`docdetail`,n.id));return}let p=0,m=!1,h=[];e.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Exit flashcards">${a(`x`)}</button>
      <h2>Flashcards</h2>
      <span class="q-counter" id="fc-progress"></span>
    </header>
    <div class="screen fc-screen">
      <div class="fc-progress-track"><div class="progress-fill" id="fc-progress-fill"></div></div>
      <div class="fc-stage">
        <button class="fc-card" id="fc-card" data-tooltip="Tap to flip">
          <div class="fc-inner" id="fc-inner">
            <div class="fc-face fc-front">
              <span class="fc-hint">TERM</span>
              <div class="fc-front-text" id="fc-front"></div>
              <span class="fc-tap">Tap to flip</span>
            </div>
            <div class="fc-face fc-back">
              <span class="fc-hint">CONTEXT</span>
              <div class="fc-back-text" id="fc-back"></div>
            </div>
          </div>
        </button>
      </div>
      <div class="fc-controls">
        <button class="btn fc-btn-again" id="fc-again" data-tooltip="Review this card later">${a(`refresh`)} Again</button>
        <button class="btn btn-primary fc-btn-got" id="fc-got" data-tooltip="I knew this one">${a(`check`)} Got it</button>
      </div>
      <p class="center faint" style="font-size:12px;margin-top:14px">${f.length} cards from “${l(n.name)}”</p>
    </div>
  `;let g=e.querySelector(`#fc-inner`),_=e.querySelector(`#fc-card`),v=e.querySelector(`#fc-front`),y=e.querySelector(`#fc-back`),b=e.querySelector(`#fc-progress`),x=e.querySelector(`#fc-progress-fill`);function S(){return p<f.length?f[p]:h[0]}function C(){let e=S();if(!e)return;v.textContent=e.front,y.textContent=e.back;let t=f.length+h.length,n=p;b.textContent=`${Math.min(p+1,t)}/${t}`,x.style.width=`${n/t*100}%`,m?g.classList.add(`flipped`):g.classList.remove(`flipped`)}function w(){m=!m,g.classList.toggle(`flipped`,m)}async function T(e){let t=S();if(t){try{let i=o(n.id,t.term,t.back);await r(i)||await s({docId:n.id,sentence:t.back,term:t.term,type:`id`}),await u(i,e?`good`:`again`),e||await c({docId:n.id,sentence:t.back,term:t.term,type:`id`}).catch(()=>{})}catch{}if(e||h.push(t),p++,m=!1,p>=f.length){if(h.length)f.push(...h.splice(0));else return E()}C()}}function E(){e.querySelector(`.fc-screen`).innerHTML=`
      <div class="empty-state" style="padding-top:80px">
        <div class="art">${a(`trophy`)}</div>
        <h3>Deck complete!</h3>
        <p>You reviewed all ${f.length} flashcards from “${l(n.name)}”.</p>
        <button class="btn btn-primary" id="fc-restart" style="max-width:200px;margin:0 auto">${a(`refresh`)} Study again</button>
        <button class="btn btn-secondary" id="fc-back" style="max-width:200px;margin:10px auto 0">Back to document</button>
      </div>
    `,e.querySelector(`#fc-restart`).addEventListener(`click`,()=>t.refresh()),e.querySelector(`#fc-back`).addEventListener(`click`,()=>t.go(`docdetail`,n.id))}_.addEventListener(`click`,w),e.querySelector(`#fc-again`).addEventListener(`click`,()=>T(!1)),e.querySelector(`#fc-got`).addEventListener(`click`,()=>T(!0)),e.querySelector(`#back-btn`).addEventListener(`click`,()=>t.go(`docdetail`,n.id)),document.addEventListener(`keydown`,function e(t){if(!document.body.contains(_)){document.removeEventListener(`keydown`,e);return}t.key===` `&&(t.preventDefault(),w()),t.key===`ArrowRight`&&T(!0),t.key===`ArrowLeft`&&T(!1)}),C()}export{p as render};