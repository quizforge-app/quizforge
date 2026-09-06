import{S as e,at as t,p as n}from"./index-rFn9O_LP.js";import{a as r,r as i}from"./share-Df8piYTe.js";async function a(a,o){let s=location.hash.match(/quiz=([^&]+)/);if(!s){o.go(`library`);return}let c;try{c=await i(decodeURIComponent(s[1]))}catch(t){a.innerHTML=`
      <div class="screen screen-center">
        <div class="empty-state">
          <div class="art">${e(`alert`)}</div>
          <h3>We couldn't open that quiz</h3>
          <p>${n(t.message||`Invalid link`)}</p>
          <button class="btn btn-primary" id="to-lib" style="max-width:220px;margin:0 auto">Go to Library</button>
        </div>
      </div>`,a.querySelector(`#to-lib`).addEventListener(`click`,()=>o.go(`library`));return}history.replaceState(null,``,location.pathname);let l=!!c.c,u=(c.q||[]).length,d=c.t||`Shared Quiz`;a.innerHTML=`
    <div class="screen screen-center">
      <div class="empty-state" style="max-width:420px">
        <div class="art">${e(l?`users`:`share`)}</div>
        <h3 style="margin-top:14px">${n(d)}</h3>
        <p class="faint">${u} question${u===1?``:`s`} · no app or account needed to play</p>
        ${l?`
          <div class="challenge-banner">
            <div class="cb-avatar">${n((c.c.n||`?`)[0]?.toUpperCase()||`?`)}</div>
            <div class="cb-text"><strong>${n(c.c.n||`Friend`)}</strong> scored <strong>${c.c.p}%</strong>${c.c.t?` (${c.c.c}/${c.c.t})`:``}.</div>
          </div>
          <p class="faint" style="margin-top:10px">Can you beat them?</p>`:``}
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary" id="start">${e(`play`)} ${l?`Take the challenge`:`Start quiz`}</button>
          <button class="btn btn-secondary" id="save">${e(`layers`)} Save to library</button>
          <button class="btn btn-secondary" id="copy">${e(`link`)} Copy link</button>
        </div>
      </div>
    </div>`,a.querySelector(`#start`).addEventListener(`click`,()=>{o.state.sharedQuiz={title:d,questions:c.q,cfg:{timerSec:c.ts||0}},l&&(o.state.challenge=c.c),o.go(`quiz`)}),a.querySelector(`#copy`).addEventListener(`click`,async()=>{try{await navigator.clipboard.writeText(r(s[1])),o.toast(`Link copied`)}catch{o.toast(`Could not copy`,!0)}}),a.querySelector(`#save`).addEventListener(`click`,async n=>{let r=n.currentTarget;r.disabled=!0;try{await t({name:d,questions:c.q,source:l?`challenge`:`shared`}),o.toast(`Saved to your library`),r.textContent=e(`check`)+` Saved`}catch{o.toast(`Could not save`,!0),r.disabled=!1}})}export{a as render};