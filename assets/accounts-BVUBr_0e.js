import{A as e,B as t,F as n,I as r,J as i,S as a,X as o,_t as s,lt as c,mt as l,p as u,rt as d,ut as f}from"./index-rFn9O_LP.js";var p=[`#C4713B`,`#1A7F37`,`#0A66C2`,`#7C5CBF`,`#B54708`,`#475569`];async function m(e,t){let n=t.state.accountFlow?.mode||`picker`;return n===`create`?_(e,t):n===`lock`?v(e,t):g(e,t)}function h(e,t,n=`lg`){return`<span class="acc-avatar ${n}" style="background:${e}">${u(t)}</span>`}async function g(e,n){let r=await o();e.innerHTML=`
    <div class="acc-screen">
      <div class="acc-brand"><span class="mark">${a(`logo`)}</span>Quizard</div>
      <h1 class="acc-title">Who's studying?</h1>
      <p class="acc-sub">Pick a profile to continue — progress is tracked separately for each.</p>
      <div class="acc-grid">
        ${r.map(e=>`
          <button class="acc-card" data-id="${e.id}" data-tooltip="${e.pinHash?`PIN-protected`:`Open without PIN`}">
            ${h(e.color,e.name.charAt(0).toUpperCase())}
            <span class="acc-name">${u(e.name)}</span>
            ${e.pinHash?`<span class="acc-lock">`+a(`lock`)+`</span>`:``}
          </button>`).join(``)}
        <button class="acc-card acc-add" id="add-account" data-tooltip="Create a new profile">
          <span class="acc-avatar lg ghost">${a(`plus`)}</span>
          <span class="acc-name">Add account</span>
        </button>
      </div>
      <p class="acc-foot">Accounts live only on this device.</p>
    </div>
  `,e.querySelectorAll(`.acc-card[data-id]`).forEach(e=>e.addEventListener(`click`,async()=>{let r=await t(e.dataset.id);r&&(r.pinHash?(n.state.accountFlow={mode:`lock`,accountId:r.id},n.go(`accounts`)):(f(r.id),n.state.account=r,n.toast(`Welcome back, ${r.name}`),n.go(`library`)))})),e.querySelector(`#add-account`).addEventListener(`click`,()=>{n.state.accountFlow={mode:`create`,cameFromPicker:!0},n.go(`accounts`)})}function _(t,s){let l=p[0],u=``,m=``;t.innerHTML=`
    <div class="acc-screen">
      <div class="acc-brand"><span class="mark">${a(`logo`)}</span>Quizard</div>
      <h1 class="acc-title">Create your profile</h1>
      <p class="acc-sub">Your quizzes, progress and mistakes are tracked under this account.</p>

      <div class="acc-form">
        <label class="section-title" for="acc-name">Profile name</label>
        <input class="text-input" id="acc-name" placeholder="e.g. Juan" maxlength="24" autocomplete="off" />

        <label class="section-title">Avatar color</label>
        <div class="swatch-row">
          ${p.map(e=>`<button class="swatch ${e===l?`on`:``}" data-color="${e}" style="background:${e}" aria-label="Color ${e}"></button>`).join(``)}
        </div>

        <label class="section-title" for="acc-pin">PIN <span class="faint" style="text-transform:none;letter-spacing:0">(optional — protects this profile)</span></label>
        <div class="pin-row">
          <input class="text-input pin-input" id="acc-pin" type="tel" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Enter 4-digit PIN" autocomplete="off" />
          <input class="text-input pin-input" id="acc-pin2" type="tel" inputmode="numeric" maxlength="4" placeholder="repeat" aria-label="Repeat 4-digit PIN" autocomplete="off" />
        </div>
        <p class="faint" id="pin-hint" style="font-size:12px;margin-top:6px"></p>

        <button class="btn btn-primary" id="acc-create-btn" style="margin-top:20px">${a(`check`)} Create account</button>
        <button class="btn btn-secondary" id="acc-back-btn" style="margin-top:10px;width:100%">Back</button>
      </div>
    </div>
  `,t.querySelectorAll(`.swatch`).forEach(e=>e.addEventListener(`click`,()=>{l=e.dataset.color,t.querySelectorAll(`.swatch`).forEach(t=>t.classList.toggle(`on`,t===e))}));let h=t.querySelector(`#acc-pin`),g=t.querySelector(`#acc-pin2`),_=t.querySelector(`#pin-hint`);function v(){return u=h.value.trim(),m=g.value.trim(),!u&&!m?(_.textContent=`Leave both empty to skip the PIN`,!1):/^\d{4}$/.test(u)?u===m?(_.textContent=`PIN ready — you will enter it when opening this profile`,!0):(_.textContent=`PINs do not match`,!1):(_.textContent=`PIN must be exactly 4 digits`,!1)}h.addEventListener(`input`,v),g.addEventListener(`input`,v),t.querySelector(`#acc-back-btn`).addEventListener(`click`,()=>{s.state.accountFlow?.cameFromPicker?(s.state.accountFlow={mode:`picker`},s.go(`accounts`)):(s.state.accountFlow=null,s.go(`onboarding`))}),t.querySelector(`#acc-create-btn`).addEventListener(`click`,async()=>{let a=t.querySelector(`#acc-name`).value.trim();if(!a){s.toast(`Enter a profile name`,!0);return}let p=v(),h=u||m;if(h&&!p){s.toast(_.textContent,!0);return}let g=h?await i(u):null,y=await n({name:a,color:l,pinHash:g}),b=(await o()).filter(e=>e.id!==y.id);for(let t of b)await e(t.id)||await r(t.id);f(y.id),s.state.account=y;let x={...d().tutorialDoneAccounts||{}};x[y.id]=!1,c({tutorialAccountId:y.id,tutorialDone:!1,tutorialDoneAccounts:x,tourSeen:[]}),s.toast(`Welcome, ${y.name}!`),s.go(`tutorial`)})}async function v(e,n){let{accountId:r}=n.state.accountFlow,i=await t(r);if(!i){n.state.accountFlow={mode:`picker`},n.go(`accounts`);return}let o=``;e.innerHTML=`
    <div class="acc-screen">
      <div class="acc-brand"><span class="mark">${a(`logo`)}</span>Quizard</div>
      <div style="display:flex;justify-content:center">${h(i.color,i.name.charAt(0).toUpperCase())}</div>
      <h1 class="acc-title">Enter PIN for ${u(i.name)}</h1>
      <p class="acc-sub">This profile is protected.</p>
      <div class="pin-dots" id="pin-dots">
        <span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span>
      </div>
      <div class="pin-pad">
        ${[`1`,`2`,`3`,`4`,`5`,`6`,`7`,`8`,`9`].map(e=>`<button class="pin-key" data-k="${e}">${e}</button>`).join(``)}
        <button class="pin-key ghost" id="pin-cancel">Cancel</button>
        <button class="pin-key" data-k="0">0</button>
        <button class="pin-key ghost" id="pin-del">⌫</button>
      </div>
    </div>
  `;let c=[...e.querySelectorAll(`.pin-dot`)];function d(){c.forEach((e,t)=>e.classList.toggle(`filled`,t<o.length))}async function p(){let t=await s(o,i.pinHash);if(t.ok)t.upgrade&&l(i.id,{pinHash:t.upgrade}).catch(()=>{}),f(i.id),n.state.account=i,n.state.accountFlow=null,n.toast(`Welcome back, ${i.name}`),n.go(`library`);else{let t=e.querySelector(`.pin-pad`);t.classList.add(`shake`),setTimeout(()=>t.classList.remove(`shake`),400),o=``,d(),n.toast(`Wrong PIN`,!0)}}e.querySelectorAll(`.pin-key[data-k]`).forEach(e=>e.addEventListener(`click`,()=>{o.length>=4||(o+=e.dataset.k,d(),o.length===4&&setTimeout(p,120))})),e.querySelector(`#pin-del`).addEventListener(`click`,()=>{o=o.slice(0,-1),d()}),e.querySelector(`#pin-cancel`).addEventListener(`click`,()=>{n.state.accountFlow={mode:`picker`},n.go(`accounts`)})}export{m as render};