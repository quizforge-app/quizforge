import{$ as e,K as t,N as n,P as r,S as i,Z as a,_ as o,b as s,f as c,h as l,l as u,o as d,p as f,v as p,y as m}from"./index-rFn9O_LP.js";import{startDueReview as h,startMistakeReview as g,startWeakReview as _}from"./mistakes-BabzbVSY.js";function v(e){let t=new Date(e);return`${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`}function y(e){if(!e.length)return 0;let t=new Set(e.map(e=>v(e.date))),n=new Date,r=new Date(Date.now()-864e5),i=null;if(t.has(v(n.getTime())))i=n;else if(t.has(v(r.getTime())))i=r;else return 0;let a=0,o=new Date(i);for(;t.has(v(o.getTime()));)a++,o.setDate(o.getDate()-1);return a}function b(e){let t=e.slice(0,20).reverse();if(!t.length)return``;let n=t.length,r=320/n,i=Math.min(18,r*.62),a=t.map((e,t)=>{let a=Math.max(4,e.percent/100*82),o=t*r+(r-i)/2,s=96-a,c=e.percent>=80?`var(--good)`:e.percent>=50?`var(--warn)`:`var(--bad)`;return`<rect x="${o.toFixed(1)}" y="${s.toFixed(1)}" width="${i.toFixed(1)}" height="${a.toFixed(1)}" rx="3.5" fill="${c}" opacity="${t===n-1?1:.55}"/>`}).join(``),o=t[n-1].percent;return`
    <div class="chart-wrap">
      <div class="chart-head">
        <span class="section-title" style="margin:0">Last ${n} quiz${n>1?`zes`:``}</span>
        <span class="score-pill ${p(o)}">${o}% latest</span>
      </div>
      <svg viewBox="0 0 320 110" preserveAspectRatio="none" class="trend-svg">
        <line x1="0" y1="96" x2="320" y2="96" stroke="var(--surface-3)" stroke-width="1.5"/>
        ${a}
      </svg>
      <div class="chart-x"><span>older</span><span>now</span></div>
    </div>`}async function x(v,x){let[S,C,w,T,E]=await Promise.all([a(),e(),r(),n(),t(null)]),D=S.reduce((e,t)=>e+t.total,0),O=S.reduce((e,t)=>e+t.correct,0),k=D?Math.round(O/D*100):null,A=y(S),j=`
    <header class="app-header">
      <div class="brand"><span class="mark">${i(`logo`)}</span>Progress</div>
      <button class="icon-btn" id="theme-btn" data-tooltip="${x.state.theme===`dark`?`Switch to light mode`:`Switch to dark mode`}">${x.state.theme===`dark`?i(`sun`):i(`moon`)}</button>
    </header>
    <div class="screen">
      ${s([{value:A,label:`Day Streak`},{value:S.length,label:`Quizzes`},{value:k==null?`—`:k+`%`,label:`Accuracy`}])}
      ${T?u(`
        ${o(`
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:var(--accent-strong);display:flex">${i(`zap`)}</span>
            <div>
              <div class="label">${T} card${T===1?``:`s`} due for review</div>
              <div class="sub">Spaced repetition — review them before you forget</div>
            </div>
          </div>
        `,{borderless:!0})}
        <button class="btn btn-primary" id="due-review-btn" style="padding:11px">${i(`refresh`)} Start spaced review</button>
      `,{style:`padding:14px 16px;margin-bottom:14px;border-color:var(--accent-border);background:var(--accent-soft)`}):``}
      ${u(`
        ${o(`
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:${w?`var(--warn)`:`var(--good)`};display:flex">${i(w?`alert`:`check`)}</span>
            <div>
              <div class="label">${w} mistake${w===1?``:`s`} in the bank</div>
              <div class="sub">${w?`Questions you got wrong — review them until they stick`:`Nothing to review. Keep it up!`}</div>
            </div>
          </div>
        `,{borderless:!0})}
        ${w?`<button class="btn btn-primary" id="review-mistakes-btn" style="padding:11px" data-tooltip="Practice the questions you previously got wrong">${i(`refresh`)} Review all mistakes</button>`:``}
      `,{style:`padding:14px 16px;margin-bottom:14px`})}
      ${E.length?u(`
        ${o(`
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:var(--bad);display:flex">${i(`target`)}</span>
            <div>
              <div class="label">${E.length} weak term${E.length===1?``:`s`} tracked</div>
              <div class="sub">Questions are weighted toward the terms you miss most often</div>
            </div>
          </div>
        `,{borderless:!0})}
        <button class="btn btn-primary" id="weak-review-btn" style="padding:11px" data-tooltip="Review your weakest terms first">${i(`target`)} Review weak spots</button>
      `,{style:`padding:14px 16px;margin-bottom:14px`}):``}
  `;j+=b(S);let M=C.filter(e=>e.attempts>0);if(M.length){let e=``;for(let t of M.slice(0,6)){let n=t.bestScore==null?0:t.bestScore,r=n>=80?`var(--good)`:n>=50?`var(--warn)`:`var(--bad)`;e+=`
        <div class="bd-row">
          <span class="bd-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px">${f(t.name)}</span>
          <div class="bd-bar"><div class="bd-fill" style="width:${n}%;background:${r}"></div></div>
          <span class="bd-score">${t.bestScore==null?`—`:t.bestScore+`%`}</span>
        </div>`}j+=m(`Document mastery`)+u(e,{cls:`breakdown`})}if(!S.length){j+=`
      <div class="empty-state">
        <div class="empty-illust">${d}</div>
        <h3>No progress yet</h3>
        <p>Take your first quiz and your streak, scores and mastery will appear here.</p>
      </div>
    </div>`,v.innerHTML=j,v.querySelector(`#theme-btn`).addEventListener(`click`,()=>x.toggleTheme()),v.querySelector(`#review-mistakes-btn`)?.addEventListener(`click`,()=>g(x,null)),v.querySelector(`#weak-review-btn`)?.addEventListener(`click`,()=>_(x));return}j+=m(`Recent activity`);let N=new Map;for(let e of S.slice(0,40)){let t=c(e.date);N.has(t)||N.set(t,[]),N.get(t).push(e)}for(let[e,t]of N){j+=`<div class="history-day">`;for(let e of t){let t=p(e.percent);j+=`
        <div class="history-item">
          <div class="hi-icon" style="color:${t===`high`?`var(--good)`:t===`mid`?`var(--warn)`:`var(--bad)`};background:${t===`high`?`var(--good-bg)`:t===`mid`?`var(--warn-bg)`:`var(--bad-bg)`}">${i(e.percent>=50?`trophy`:`flame`)}</div>
          <div class="hi-main">
            <div class="hi-name">${f(e.docName)}</div>
            <div class="hi-meta">${l(e.date)} · ${e.correct}/${e.total} correct · ${Math.round(e.durationSec)}s</div>
          </div>
          <span class="score-pill ${t}">${e.percent}%</span>
        </div>`}j+=`</div>`}j+=`</div>`,v.innerHTML=j,v.querySelector(`#theme-btn`).addEventListener(`click`,()=>x.toggleTheme()),v.querySelector(`#review-mistakes-btn`)?.addEventListener(`click`,()=>g(x,null)),v.querySelector(`#weak-review-btn`)?.addEventListener(`click`,()=>_(x)),v.querySelector(`#due-review-btn`)?.addEventListener(`click`,()=>h(x))}export{x as render};