import{s as e,t}from"./topics-2sMjMAqj.js";import{H as n,Q as r,S as i,gt as a,k as o,lt as s,p as c,rt as ee,x as l}from"./index-rFn9O_LP.js";import{n as te}from"./summarize-QAQ0x1JH.js";import{a as ne,i as re,n as ie}from"./export-CXckpnF6.js";import{t as ae}from"./imgZoom-BMtI0Ckh.js";var u=``.replace(/\/+$/,``)+`/.netlify/functions/tts`,d=null,f=null,p=!1,m=null,h=[],g=null,_=[`google uk english male`,`daniel`,`arthur`,`oliver`,`george`,`microsoft guy`,`microsoft davis`,`microsoft george`,`microsoft ryan`,`microsoft david`,`en-gb`,`alex`,`aaron`,`fred`,`male`];function v(){return typeof window<`u`&&`speechSynthesis`in window}function y(){if(!v())return null;let e=window.speechSynthesis.getVoices();if(!e.length)return null;let t=e.filter(e=>/^en/i.test(e.lang)),n=t.length?t:e;for(let e of _){let t=n.find(t=>t.name.toLowerCase().includes(e)||t.lang.toLowerCase().includes(e));if(t)return t}return n.find(e=>e.default)||n[0]}v()&&(window.speechSynthesis.onvoiceschanged=()=>{g=y()});function b(e){return e.replace(/([.!?])\s+/g,`$1 … `).replace(/\s+—\s+/g,` … `)}function x(e,t,n){let r=Math.floor(e.sampleRate*t),i=e.createBuffer(2,r,e.sampleRate);for(let e=0;e<2;e++){let t=i.getChannelData(e);for(let e=0;e<r;e++)t[e]=(Math.random()*2-1)*(1-e/r)**n}return i}var S=null;function C(){return S=S||new(window.AudioContext||window.webkitAudioContext),S.state===`suspended`&&S.resume(),S}var w=null;function T(){if(w)return w;let e=document.createElement(`audio`);e.preload=`auto`,e.style.display=`none`,document.body.appendChild(e);let t=C(),n=t.createMediaElementSource(e),r=t.createGain();r.gain.value=.85;let i=t.createGain();i.gain.value=.5;let a=t.createConvolver();return a.buffer=x(t,2.8,2.6),n.connect(r),r.connect(t.destination),n.connect(a),a.connect(i),i.connect(t.destination),w={el:e,ac:t,urls:[],abort:null},w}async function E(e,t,n){if(typeof navigator<`u`&&navigator.onLine===!1)throw Error(`offline`);let r=AbortSignal.timeout(8e3),i=n?AbortSignal.any([n,r]):r,a=await fetch(u,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({text:e,speed:t}),signal:i});if(!a.ok)throw Error(`fish_unavailable`);return URL.createObjectURL(await a.blob())}function D(e,t,n){m=`fish`;let r=T(),i=[n,...e.slice(1).map(()=>null)];r.urls=i,(async()=>{for(let n=1;n<e.length;n++){if(p)return;try{i[n]=await E(e[n],t,r.abort.signal)}catch{return}}})();let a=0,o=()=>{if(p)return;if(a>=e.length){f?.();return}let t=i[a];if(!t){setTimeout(o,500);return}r.el.src=t,r.el.onplay=()=>{p||d?.(a)},r.el.onended=()=>{p||(a++,setTimeout(o,420))},r.el.onerror=()=>{p||(a++,o())},r.el.play().catch(()=>{})};o()}var O=null;function oe(){try{let e=C(),t=e.createConvolver();t.buffer=x(e,2.8,2.6);let n=e.createGain();n.gain.value=0,n.gain.setTargetAtTime(.05,e.currentTime,1.3);let r=[55,82.41,110].map((n,r)=>{let i=e.createOscillator();i.type=`triangle`,i.frequency.value=n,i.detune.value=r*4-4;let a=e.createGain();return a.gain.value=r===0?.5:.2,i.connect(a),a.connect(t),i.start(),i});t.connect(n),n.connect(e.destination),O={oscs:r,master:n}}catch{}}function k(){if(O){try{let{oscs:e,master:t}=O;t.gain.setTargetAtTime(1e-4,S.currentTime,.5),setTimeout(()=>{e.forEach(e=>{try{e.stop()}catch{}})},1800)}catch{}O=null}}function se(e,{rate:t=1}={}){m=`local`,oe(),g||(g=y());let n=Math.max(.5,t*.92);h=e.map(e=>{let t=new SpeechSynthesisUtterance(b(e));return t.rate=n,t.pitch=.6,t.volume=1,g?(t.voice=g,t.lang=g.lang):t.lang=navigator.language||`en-US`,t});let r=0,i=()=>{if(p)return;if(r>=h.length){k(),f?.();return}let e=h[r],t=r;r++,e.addEventListener(`start`,()=>{p||d?.(t)});let n=()=>{p||(t>=h.length-1?f?.():setTimeout(i,420))};e.addEventListener(`end`,n),e.addEventListener(`error`,n),window.speechSynthesis.speak(e)};i()}async function ce(e,{rate:t=1,onindex:n=null,onend:r=null}={}){if(A(),p=!1,d=n,f=r,!e.length){f?.();return}let i=Math.min(2,Math.max(.5,t*.95)),a=new AbortController;T().abort=a;try{let t=await E(e[0],i,a.signal);if(p){URL.revokeObjectURL(t);return}D(e,i,t)}catch{if(p)return;se(e,{rate:t})}}function le(){m===`fish`&&w?w.el.pause():v()&&window.speechSynthesis.pause()}function ue(){m===`fish`&&w?w.el.play().catch(()=>{}):v()&&window.speechSynthesis.resume()}function A(){if(p=!0,m=null,w){w.abort?.abort();try{w.el.pause()}catch{}w.el.removeAttribute(`src`),w.urls.forEach(e=>{e&&URL.revokeObjectURL(e)}),w.urls=[]}v()&&(window.speechSynthesis.cancel(),h=[]),k()}function j(e,t=3){let n=[];for(let r=0;r<e.length;r+=t)n.push(e.slice(r,r+t).join(` `));return n}var M=null;function N(){M&&(M(),M=null)}async function P(u,d){M&&M();let f=await n(d.state.currentDocId);if(!f){d.go(`library`);return}let p=ee(),m=p.readerScale||1,h=p.reviewerView||`summary`;h===`gallery`&&(h=`summary`);let g=await r(f.id),_=new Map,y,b,x,S,C,w,T,E=!1;function D(){y=e(f.text);let n=t(f.text);b=n.topics;let r=n.membership;if(x=te(f.text),S=[],b.length&&y.length){let e=new Map(b.map(e=>[e.title,[]])),t=[];for(let n of y){let i=r.get(n);i&&e.has(i)?e.get(i).push(n):t.push(n)}t.length>=2&&S.push({title:`Overview`,paras:j(t)});for(let t of b){let n=e.get(t.title);n?.length&&S.push({title:t.title,paras:j(n)})}}else S.push({title:null,paras:j(y.length?y:f.text.split(/(?<=[.!?])\s+/))});w=[];let i=new Set;for(let e of x.sections)for(let t of e.terms){let e=t.toLowerCase();if(i.has(e)||w.length>=8)continue;i.add(e);let n=y.find(t=>t.toLowerCase().includes(e)&&t.length>20);n&&w.push({term:t,def:n})}T=(o(f,{count:6,mix:{mcq:!0,tf:!0,fib:!0,id:!0,matching:!0,ordering:!0},difficulty:`medium`,shuffle:!1,fixedSeed:7}).questions||[]).filter(e=>e.type!==`short`),C={summary:x.sections.flatMap(e=>e.points),full:S.flatMap(e=>e.paras)}}function O(){if(!x.tldr.length)return`<div class="empty-state"><h3>Not enough to summarize</h3><p>This document has too little readable text. Try the Full text tab.</p></div>`;let e=[];return e.push(`
      <div class="rvw-head">
        <div class="rvw-eyebrow">${i(`book`)} Study Reviewer</div>
        <h1 class="rvw-title">${c(f.name)}</h1>
        <div class="rvw-meta">${l(f.type)} · ${f.wordCount.toLocaleString()} words · ${S.length} section${S.length===1?``:`s`} · ${w.length} key term${w.length===1?``:`s`}</div>
      </div>`),x.tldr.length&&e.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">I</span><h3>Overview</h3></div>
          ${x.tldr.map(e=>`<p class="rvw-overview" data-point>${c(e)}</p>`).join(``)}
        </div>`),w.length&&e.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">II</span><h3>Key Terms &amp; Definitions</h3></div>
          <dl class="rvw-terms">
            ${w.map(e=>`<div class="rvw-term"><dt>${c(e.term)}</dt><dd>${c(e.def)}</dd></div>`).join(``)}
          </dl>
        </div>`),x.sections.length&&e.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">III</span><h3>Section Notes</h3></div>
          ${x.sections.map((e,t)=>`
            <div class="sum-section">
              <div class="sum-head">
                <span class="sum-num">${String(t+1).padStart(2,`0`)}</span>
                <h4>${c(e.title)}</h4>
                <span class="chip-count">${e.sentenceCount} sentence${e.sentenceCount===1?``:`s`}</span>
              </div>
              <ul class="sum-points">
                ${e.points.map(e=>`<li>${c(e)}</li>`).join(``)}
              </ul>
            </div>`).join(``)}
        </div>`),T.length&&e.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">IV</span><h3>Test Yourself</h3></div>
          <ol class="rvq-list">
            ${T.map(e=>oe(e)).join(``)}
          </ol>
        </div>`),e.join(``)+`<p class="sum-note">Forged from your document — open <strong>Full text</strong> to read everything.</p>`}function oe(e){let t={mcq:``,tf:`TRUE or FALSE`,fib:``,id:``,matching:`MATCHING`,ordering:`ORDERING`},n=``,r=``,i=``,a=(e,t=!1)=>`<div class="rvq-opts">${(e||[]).map((e,n)=>`<span>${t?n+1+`.`:String.fromCharCode(65+n)+`.`} ${c(e)}</span>`).join(``)}</div>`;if(e.type===`mcq`)n=c(e.stem),r=a(e.options),i=e.options?.[e.answerIndex]??``;else if(e.type===`tf`)n=`<span class="rvq-tag">T/F</span> ${c(e.statement)}`,i=e.answer?`True`:`False`;else if(e.type===`fib`)n=c(e.stem),r=a(e.choices,!0),i=e.choices?.[e.answerIndex]??``;else if(e.type===`id`)n=`Identify the term: ${c(e.clue)}`,i=e.answer??``;else if(e.type===`matching`)n=`${c(e.prompt)}`,r=`
        <div class="rvq-opts rvq-match">
          <div class="rvq-match-col"><b>Terms</b>${(e.pairs||[]).map(e=>`<span>${c(e.left)}</span>`).join(``)}</div>
          <div class="rvq-match-col"><b>Definitions</b>${(e.rightOrder||[]).map(t=>`<span>${c(e.pairs?.[t]?.right||``)}</span>`).join(``)}</div>
        </div>`,i=(e.pairs||[]).map(e=>`${e.left} → ${e.right}`).join(` · `);else if(e.type===`ordering`)n=`${c(e.prompt)}`,r=a(e.shuffled||e.steps,!0),i=(e.steps||[]).map((e,t)=>`${t+1}. ${e}`).join(`  ·  `);else return``;return`<li class="rvq">
      <div class="rvq-q">${t[e.type]?`<span class="rvq-tag">${t[e.type]}</span> `:``}${n}${r}</div>
      <details class="rvq-reveal"><summary>Check answer</summary><span>${c(i)}</span></details>
    </li>`}function k(){return S.map(e=>`
      <section class="reader-section">
        ${e.title?`<h2>${c(e.title)}</h2>`:``}
        ${e.paras.map(e=>`<p data-para>${c(e)}</p>`).join(``)}
      </section>`).join(``)+`<p class="reader-end">· · ·</p>`}function se(){return`
      <div class="gallery-grid">
        ${g.map((e,t)=>`
          <button class="gallery-item" data-i="${t}" data-tooltip="Image ${t+1}${e.slideNumber?` · slide `+e.slideNumber:``}">
            <img src="${N(e)}" alt="Extracted image ${t+1}" loading="lazy" />
            ${e.slideNumber?`<span class="gi-badge">slide ${e.slideNumber}</span>`:``}
          </button>`).join(``)}
      </div>
      <p class="sum-note">${g.length} image${g.length===1?``:`s`} extracted from this document.</p>
    `}function N(e){return _.has(e.id)||_.set(e.id,URL.createObjectURL(e.blob)),_.get(e.id)}let P=[{id:`summary`,label:`Reviewer`,icon:`book`},...g.length?[{id:`gallery`,label:`Gallery`,icon:`fileText`}]:[],{id:`full`,label:`Full text`,icon:`listChecks`}];u.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back">${i(`chevronLeft`)}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c(f.name)}</div>
        <div style="font-size:11.5px;color:var(--text-faint)">${l(f.type)} · ${f.wordCount.toLocaleString()} words</div>
      </div>
      <div style="display:flex;gap:4px" id="font-controls">
        <button class="icon-btn text-btn" id="font-minus" data-tooltip="Smaller text">A−</button>
        <button class="icon-btn text-btn" id="font-plus" data-tooltip="Larger text">A+</button>
      </div>
    </header>
    <div class="screen">
      <div class="review-toggle">
        <div class="seg" style="width:100%">
          ${P.map(e=>`<button id="tab-${e.id}" data-tab="${e.id}" class="${h===e.id?`on`:``}" style="flex:1">${i(e.icon)} ${e.label}</button>`).join(``)}
        </div>
      </div>
      <div id="tts-bar" class="tts-bar">
        <button class="icon-btn" id="tts-play" data-tooltip="Read aloud — in the wizard's voice">${i(`play`)}</button>
        <button class="icon-btn hidden" id="tts-pause" data-tooltip="Pause">${i(`timer`)}</button>
        <button class="icon-btn hidden" id="tts-stop" data-tooltip="Stop">${i(`x`)}</button>
        <div class="tts-rate">
          <span class="faint" style="font-size:11px">Speed</span>
          <input type="range" id="tts-rate" min="0.8" max="1.5" step="0.1" value="${p.ttsRate||1}" aria-label="Read-aloud speed" />
        </div>
      </div>
      <div id="find-bar" class="find-bar hidden">
        <input type="search" id="find-input" class="text-input" placeholder="Find in document…" aria-label="Find in document" autocomplete="off" />
        <span class="faint" id="find-count"></span>
      </div>
      <article class="reader" id="review-content"></article>
      <div class="reader-actions">
        <button class="btn btn-primary" id="quiz-btn">${i(`play`)} Quiz me on this</button>
        <button class="btn btn-primary" id="pdf-btn" style="margin-top:10px;width:100%" data-tooltip="Download this reviewer as a formatted PDF handout">${i(`download`)} Export PDF handout</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:10px">
          <button class="btn btn-secondary" id="export-md-btn" data-tooltip="Download the study sheet as Markdown">${i(`download`)} Export .md</button>
          <button class="btn btn-secondary" id="print-btn" data-tooltip="Open a printable study sheet">${i(`print`)} Print sheet</button>
        </div>
      </div>
    </div>
    <div class="img-viewer hidden" id="img-viewer">
      <div class="iv-zoom-bar">
        <button class="iv-zoom" id="iv-zoom-out" aria-label="Zoom out">${i(`minus`)}</button>
        <button class="iv-zoom" id="iv-reset" aria-label="Reset zoom">${i(`refresh`)}</button>
        <button class="iv-zoom" id="iv-zoom-in" aria-label="Zoom in">${i(`plus`)}</button>
      </div>
      <button class="iv-close" id="iv-close">${i(`x`)}</button>
      <button class="iv-nav iv-prev" id="iv-prev">${i(`chevronLeft`)}</button>
      <img id="iv-img" alt="Viewing image" />
      <button class="iv-nav iv-next" id="iv-next">${i(`chevronRight`)}</button>
      <div class="iv-caption" id="iv-caption"></div>
    </div>
  `;let F=u.querySelector(`#review-content`),I=u.querySelector(`#font-controls`),de=u.querySelector(`#tts-bar`),L=0;function R(){if(Q(),h===`gallery`){F.innerHTML=se(),F.classList.remove(`summary-mode`),I.style.visibility=`hidden`,F.querySelectorAll(`.gallery-item`).forEach(e=>e.addEventListener(`click`,()=>ge(parseInt(e.dataset.i,10)))),u.querySelectorAll(`.review-toggle [data-tab]`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===h));return}if(!x){F.innerHTML=`<div class="reader-loading">Preparing your document…</div>`,E||(E=!0,setTimeout(()=>{D(),E=!1,R()},0));return}h===`summary`?(F.innerHTML=O(),F.classList.add(`summary-mode`),I.style.visibility=`hidden`):(F.innerHTML=k(),F.classList.remove(`summary-mode`),G(),I.style.visibility=`visible`),pe(),u.querySelector(`#find-bar`)?.classList.toggle(`hidden`,h!==`full`),h!==`full`&&U(),u.querySelectorAll(`.review-toggle [data-tab]`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===h))}u.querySelector(`#find-bar`);let z=u.querySelector(`#find-input`),B=u.querySelector(`#find-count`),V=[],H=-1;function U(){V=[],H=-1,B&&(B.textContent=``),F.querySelectorAll(`mark.find-hit, mark.find-current`).forEach(e=>{let t=e.parentNode;t.replaceChild(document.createTextNode(e.textContent),e),t.normalize()})}function fe(){U();let e=(z?.value||``).trim();if(e.length<2)return;let t=document.createTreeWalker(F,NodeFilter.SHOW_TEXT),n=[];for(;t.nextNode();){let r=t.currentNode;r.nodeValue.toLowerCase().includes(e.toLowerCase())&&n.push(r)}for(let t of n){let n=t.nodeValue,r=document.createDocumentFragment(),i=0,a=n.toLowerCase(),o=a.indexOf(e.toLowerCase());for(;o!==-1;){r.appendChild(document.createTextNode(n.slice(i,o)));let t=document.createElement(`mark`);t.className=`find-hit`,t.textContent=n.slice(o,o+e.length),r.appendChild(t),V.push(t),i=o+e.length,o=a.indexOf(e.toLowerCase(),i)}r.appendChild(document.createTextNode(n.slice(i))),t.parentNode.replaceChild(r,t)}W(0)}function W(e){if(!V.length){B&&(B.textContent=`0/0`);return}H=e===0?0:(H+e+V.length)%V.length,V.forEach((e,t)=>e.classList.toggle(`find-current`,t===H)),B&&(B.textContent=`${H+1}/${V.length}`),V[H]?.scrollIntoView({block:`center`,behavior:`smooth`})}function pe(){let e=null,t=null;F.querySelectorAll(`[data-para]`).forEach(n=>{let r=r=>{(r.pointerType!==`mouse`||r.button===0)&&(t=null,e=setTimeout(async()=>{t=n;try{let e=n.textContent.trim().slice(0,300),t=w.find(t=>e.toLowerCase().includes(t.term.toLowerCase()))?.term||me(e);await a({docId:f.id,sentence:e,term:t,type:`note`}),n.classList.add(`saved-flash`),setTimeout(()=>n.classList.remove(`saved-flash`),900),d.toast(`Saved to your review deck ✦`)}catch{d.toast(`Could not save this line`,!0)}},550))},i=()=>{t===null&&clearTimeout(e)};n.addEventListener(`pointerdown`,r),n.addEventListener(`pointerup`,i),n.addEventListener(`pointerleave`,i),n.addEventListener(`pointercancel`,i),n.addEventListener(`contextmenu`,e=>{t&&e.preventDefault()})})}function me(e){let t=/^(The|This|That|These|Those|It|Its|In|At|On|And|But|For|With|When|After|Today|Just|Only|Most|Many|Both|Each|Such|Then|They|There)$/,n=e.split(/\s+/).slice(0,6);for(let e=0;e<Math.min(3,n.length);e++){let r=n.slice(e).join(` `).match(/^([A-Z][a-zA-Z'’-]+(?:\s+(?:of|the|de|van|von|da)?[A-Z][a-zA-Z'’-]+)*)/);if(r&&r[1].length>3&&!t.test(r[1].split(` `)[0]))return r[1].split(` `).slice(0,3).join(` `)}return n.slice(0,4).join(` `)}let he=F;function G(){he.style.fontSize=(15*m).toFixed(1)+`px`}u.querySelectorAll(`.review-toggle [data-tab]`).forEach(e=>e.addEventListener(`click`,()=>{h=e.dataset.tab,s({reviewerView:h}),R()})),z?.addEventListener(`input`,()=>fe()),z?.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.preventDefault(),W(e.shiftKey?-1:1)),e.key===`Escape`&&(U(),z.value=``)});let K=u.querySelector(`#img-viewer`);function ge(e){L=e;let t=g[e];u.querySelector(`#iv-img`).src=N(t),u.querySelector(`#iv-caption`).textContent=`Image ${e+1} of ${g.length}${t.slideNumber?` · slide ${t.slideNumber}`:``}`,q.reset(),K.classList.remove(`hidden`)}function _e(){K.classList.add(`hidden`)}function ve(e){L=(L+e+g.length)%g.length,ge(L)}u.querySelector(`#iv-close`).addEventListener(`click`,_e),u.querySelector(`#iv-prev`).addEventListener(`click`,()=>ve(-1)),u.querySelector(`#iv-next`).addEventListener(`click`,()=>ve(1)),K.addEventListener(`click`,e=>{e.target===K&&_e()});let ye=u.querySelector(`#iv-img`),q=ae(K,ye);u.querySelector(`#iv-zoom-in`).addEventListener(`click`,e=>{e.stopPropagation(),q.zoomIn()}),u.querySelector(`#iv-zoom-out`).addEventListener(`click`,e=>{e.stopPropagation(),q.zoomOut()}),u.querySelector(`#iv-reset`).addEventListener(`click`,e=>{e.stopPropagation(),q.reset()});let J=u.querySelector(`#tts-play`),be=u.querySelector(`#tts-pause`),xe=u.querySelector(`#tts-stop`),Y=u.querySelector(`#tts-rate`),X=!1;function Z(e){J.classList.toggle(`hidden`,e===`playing`),be.classList.toggle(`hidden`,e!==`playing`),xe.classList.toggle(`hidden`,e===`idle`),J.innerHTML=i(`play`)}function Q(){A(),X=!1,Z(`idle`),F.querySelectorAll(`.speaking`).forEach(e=>e.classList.remove(`speaking`))}v()?(J.addEventListener(`click`,()=>{if(X){ue(),Z(`playing`);return}let e=C[h===`full`?`full`:`summary`];if(!e.length){d.toast(`Nothing to read in this view`);return}X=!0,Z(`playing`),ce(e,{rate:parseFloat(Y.value),onend:()=>{X=!1,Z(`idle`)},onindex:e=>{F.querySelectorAll(`.speaking`).forEach(e=>e.classList.remove(`speaking`)),h===`full`?F.querySelectorAll(`[data-para]`)[e]?.classList.add(`speaking`):F.querySelectorAll(`[data-point]`)[e]?.classList.add(`speaking`)}})}),be.addEventListener(`click`,()=>{le(),Z(`paused`)}),xe.addEventListener(`click`,Q),Y.addEventListener(`input`,()=>s({ttsRate:parseFloat(Y.value)}))):de.classList.add(`hidden`),u.querySelector(`#font-minus`).addEventListener(`click`,()=>{m=Math.max(.85,+(m-.1).toFixed(2)),s({readerScale:m}),G()}),u.querySelector(`#font-plus`).addEventListener(`click`,()=>{m=Math.min(1.5,+(m+.1).toFixed(2)),s({readerScale:m}),G()}),u.querySelector(`#back-btn`).addEventListener(`click`,()=>{Q(),_.forEach(e=>URL.revokeObjectURL(e)),d.go(`docdetail`,f.id)}),u.querySelector(`#quiz-btn`).addEventListener(`click`,()=>{Q(),d.go(`setup`,f.id)}),u.querySelector(`#export-md-btn`).addEventListener(`click`,()=>{re(f),d.toast(`Downloaded study sheet (.md)`)});let $=u.querySelector(`#pdf-btn`);$.addEventListener(`click`,async()=>{$.disabled=!0,$.textContent=`Building PDF…`;try{await ie(f,{keyTermDefs:w,reviewQs:T}),d.toast(`PDF handout downloaded ✓`)}catch{d.toast(`Could not build the PDF`,!0)}finally{$.disabled=!1,$.innerHTML=`${i(`download`)} Export PDF handout`}}),u.querySelector(`#print-btn`).addEventListener(`click`,()=>{ne(f)||d.toast(`Allow pop-ups to print`)}),M=()=>{Q(),_.forEach(e=>URL.revokeObjectURL(e))},R()}export{P as render,N as unmount};