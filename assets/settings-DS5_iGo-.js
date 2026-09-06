import{$ as e,B as t,I as n,M as r,S as i,V as a,X as o,Y as s,ft as c,i as l,l as u,lt as d,p as f,r as p,rt as m,t as h,ut as g,y as _,z as v}from"./index-CybBJgOJ.js";import{i as y}from"./gemini-BQvNqYOp.js";var b=21e4,x=`quizard-encrypted`,S=1;function C(e){return btoa(String.fromCharCode(...new Uint8Array(e)))}function w(e){let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e++)n[e]=t.charCodeAt(e);return n}async function T(e,t){let n=await crypto.subtle.importKey(`raw`,new TextEncoder().encode(e),`PBKDF2`,!1,[`deriveKey`]);return crypto.subtle.deriveKey({name:`PBKDF2`,salt:t,iterations:b,hash:`SHA-256`},n,{name:`AES-GCM`,length:256},!1,[`encrypt`,`decrypt`])}async function E(e,t){if(!t||t.length<4)throw Error(`Passphrase must be at least 4 characters`);let n=crypto.getRandomValues(new Uint8Array(16)),r=crypto.getRandomValues(new Uint8Array(12)),i=await T(t,n),a=new TextEncoder().encode(JSON.stringify(e)),o=await crypto.subtle.encrypt({name:`AES-GCM`,iv:r},i,a);return JSON.stringify({app:x,format:S,kdf:{name:`PBKDF2`,hash:`SHA-256`,iterations:b,salt:C(n)},iv:C(r),ct:C(o)})}async function D(e,t){let n;try{n=JSON.parse(e)}catch{throw Error(`Not a Quizard backup file`)}if(n.app!==x||!n.ct)throw Error(`Not an encrypted Quizard backup`);if(n.format!==S)throw Error(`Unsupported backup format version`);let r=await T(t,w(n.kdf.salt)),i;try{i=await crypto.subtle.decrypt({name:`AES-GCM`,iv:w(n.iv)},r,w(n.ct))}catch{throw Error(`Wrong passphrase — decryption failed`)}return JSON.parse(new TextDecoder().decode(i))}function O(e){g(null),e.state.account=null,e.state.resumeBanner=null,e.state.accountFlow={mode:`picker`},e.go(`accounts`)}var k=2592e6;async function A(b,x){let S=m(),C=S.lastBackupAt||null,w=!C||Date.now()-C>k,T=(await e()).length,A=w&&T>0;b.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn">${i(`chevronLeft`)}</button>
      <h2>Settings</h2>
      <div class="spacer"></div>
    </header>
    <div class="screen">

      ${_(`Account`)}
      <div class="settings-group" id="account-section"></div>

      ${_(`Appearance`)}
      <div class="settings-group">
        <div class="row" data-tooltip="App color theme — auto-saved locally">
          <div><div class="label">Theme</div><div class="sub">Follows your choice, saved locally</div></div>
          <div class="seg" id="theme-seg" style="grid-auto-columns:auto;width:auto">
            <button data-t="dark" style="padding:8px 16px" class="${x.state.theme===`dark`?`on`:``}" data-tooltip="Dark theme — easier on eyes at night">Dark</button>
            <button data-t="light" style="padding:8px 16px" class="${x.state.theme===`light`?`on`:``}" data-tooltip="Light theme — bright and clean">Light</button>
          </div>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Watch the welcome walkthrough again">
          <div><div class="label">Replay introduction</div><div class="sub">See the welcome slides shown on first launch</div></div>
          <button class="btn btn-secondary" id="replay-intro-btn">${i(`refresh`)} Replay</button>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Replay the wizard’s guided tour of the app">
          <div><div class="label">Replay wizard tutorial</div><div class="sub">Walk through adding, quizzing and progress again</div></div>
          <button class="btn btn-secondary" id="replay-tour-btn">${i(`refresh`)} Replay</button>
        </div>
        <div class="row" style="border-bottom:none" data-tooltip="Skip the welcome splash and slides — go straight to the app on launch">
          <div><div class="label">Skip intro on launch</div><div class="sub">Open directly into the app every time</div></div>
          <div class="switch ${S.skipIntro?`on`:``}" id="sw-skipintro" data-tooltip="Toggle skip intro"></div>
        </div>
      </div>

      ${_(`Wizard voice`)}
      <div class="settings-group">
        <div class="row" style="border-bottom:none" data-tooltip="Hear the wizard speak during the guided tour">
          <div><div class="label">Wizard voice</div><div class="sub">Play the wizard’s spoken tips in the tutorial</div></div>
          <div class="switch ${S.wizardVoice===!1?``:`on`}" id="sw-wizardvoice" data-tooltip="Toggle wizard voice"></div>
        </div>
      </div>

      ${_(`AI question writing`)}
      ${u(`
        <p class="muted" style="font-size:13px;line-height:1.55;margin-bottom:14px">
          Quizard uses Google Gemini via a built-in relay to write natural exam-style questions.
          The relay rotates across several API keys automatically, so quizzes keep generating even when one key hits its limit.
          Without the relay, quizzes are still generated using built-in rules.
        </p>
        <div class="row" style="border-bottom:none;margin-bottom:12px" data-tooltip="After answering, tap 'Why?' to get a Gemini explanation of the correct answer">
          <div><div class="label">Explain answers</div><div class="sub">Show a “Why?” button to explain quiz answers with Gemini</div></div>
          <div class="seg" id="explain-seg" style="grid-auto-columns:auto;width:auto">
            <button data-e="on" style="padding:8px 14px" class="${S.aiExplain===!1?``:`on`}" data-tooltip="Show explanation button">On</button>
            <button data-e="off" style="padding:8px 14px" class="${S.aiExplain===!1?`on`:``}" data-tooltip="Hide explanation button">Off</button>
          </div>
        </div>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin:0 0 12px">
          Model: <b>gemini-3.5-flash-lite</b> · keys are built-in and auto-rotating.
        </p>
        <div style="display:flex;gap:10px;margin-top:4px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-secondary" id="test-key-btn">${i(`zap`)} Test connection</button>
        </div>
        <p class="faint" id="key-status" style="font-size:12px;margin-top:10px">AI relay ready.</p>
      `,{style:`padding:16px`})}

      ${_(`Study reminders`)}
      <div class="settings-group">
        <div class="row" style="border-bottom:none" data-tooltip="Get reminded to review flashcards that are due for spaced repetition">
          <div><div class="label">Due-card reminders</div><div class="sub">${typeof window<`u`&&window.Capacitor?.isNativePlatform?.()?`Daily local notification on this device`:`Browser notification when due cards are waiting`}</div></div>
          <div class="switch ${S.reminders?`on`:``}" id="sw-reminders" data-tooltip="Toggle due-card reminders"></div>
        </div>
      </div>

      ${_(`Backup &amp; restore`)}
      ${u(`
        ${A?`
        <div class="backup-nudge">
          <span class="bn-icon">${i(`alert`)}</span>
          <div class="bn-text">
            <div class="bn-title">${C?`Backup is over 30 days old`:`No backup yet`}</div>
            <div class="bn-sub">${T} document${T===1?``:`s`} stored only on this device</div>
          </div>
        </div>`:``}
        <p class="muted" style="font-size:13px;line-height:1.55;margin-bottom:14px">
          Your data lives only on this device. Export a backup file regularly — if the app is uninstalled or the phone is reset, local data is gone.
        </p>
        <button class="btn btn-primary" id="export-btn" data-tooltip="Download all data as a single JSON file">${i(`download`)} Export backup (.json)</button>
        <button class="btn btn-secondary" id="import-btn" style="margin-top:10px;width:100%" data-tooltip="Restore from a previously exported backup">${i(`database`)} Import backup</button>
        <input type="file" id="import-input" accept=".json,application/json" aria-label="Import backup file" hidden />
        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0" />
        <div class="label" style="margin-bottom:4px">Encrypted backup — safe for your own cloud storage</div>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin:0 0 12px">
          A passphrase-protected backup (AES-GCM). Unreadable without your passphrase,
          so you can keep it in Google Drive or anywhere — no server, no account.
        </p>
        <button class="btn btn-primary" id="enc-export-btn" data-tooltip="Download a passphrase-encrypted backup">${i(`lock`)} Encrypted backup</button>
        <button class="btn btn-secondary" id="enc-import-btn" style="margin-top:10px;width:100%" data-tooltip="Restore from an encrypted backup file">${i(`database`)} Restore encrypted backup</button>
        <input type="file" id="enc-import-input" accept=".json,application/json" aria-label="Import encrypted backup file" hidden />
        <p class="faint" id="usage-line" style="font-size:12px;margin-top:12px"></p>
      `,{style:`padding:16px`})}

      ${_(`Danger zone`)}
      ${u(`
        <button class="btn btn-danger-ghost" id="clear-btn" style="width:100%" data-tooltip="Permanently delete all documents, quizzes, history and mistakes — cannot be undone">${i(`trash`)} Erase all data</button>
        <p class="faint" style="font-size:11.5px;margin-top:10px;text-align:center">Documents, quizzes, history and mistakes — permanently.</p>
      `,{style:`border-color:var(--bad-border)`})}

      ${_(`About`)}
      ${u(`
        <div style="display:flex;gap:12px;align-items:center">
          <span class="mark" style="width:38px;height:38px;border-radius:11px;background:var(--text);display:grid;place-items:center;color:var(--bg)">${i(`logo`)}</span>
          <div>
            <div class="label">Quizard v1.0.0</div>
            <div class="sub">Your documents never leave this device · AI polish via Google Gemini (optional)</div>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="clear-cache-btn" style="flex:1;min-width:140px" data-tooltip="Delete all cached files and reload — useful if something is broken">${i(`trash`)} Clear cache &amp; reload</button>
        </div>
      `)}
    </div>
  `,b.querySelector(`#back-btn`).addEventListener(`click`,()=>x.go(`library`));function j(){b.querySelector(`#key-status`).textContent=`AI relay ready (gemini-3.5-flash-lite, built-in keys).`}let M=b.querySelector(`#test-key-btn`);M.addEventListener(`click`,async()=>{M.disabled=!0,b.querySelector(`#key-status`).textContent=`Testing…`;let e=await y();M.disabled=!1,b.querySelector(`#key-status`).textContent=e.ok?`✓ Relay reachable — model ${e.model}`:`✗ ${e.message}`,e.ok&&x.toast(`Gemini relay OK ✓`)}),b.querySelectorAll(`#explain-seg button`).forEach(e=>e.addEventListener(`click`,()=>{d({aiExplain:e.dataset.e!==`off`}),b.querySelectorAll(`#explain-seg button`).forEach(t=>t.classList.toggle(`on`,t===e))})),b.querySelector(`#sw-reminders`)?.addEventListener(`click`,async e=>{let t=e.currentTarget.classList.toggle(`on`);if(d({reminders:t}),t){let t=await h();t.enabled?x.toast(`Reminders on ✓`):(x.toast(t.reason||`Reminders unavailable`,!0),e.currentTarget.classList.remove(`on`),d({reminders:!1}))}else x.toast(`Reminders off`)}),j();async function N(){let e=b.querySelector(`#account-section`),r=x.state.account||await t(localStorage.getItem(`quizard-active-account`)),a=await o();if(!r){e.innerHTML=`<div class="row"><span class="sub">No active account</span></div>`;return}let s=a.filter(e=>e.id!==r.id);e.innerHTML=`
      <div class="row" style="border-top:none">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="acc-avatar sm" style="background:${r.color}">${f(r.name.charAt(0).toUpperCase())}</span>
          <div>
            <div class="label">${f(r.name)}</div>
            <div class="sub">${r.pinHash?`PIN-protected`:`No PIN`} · ${s.length?`${s.length} other account${s.length===1?``:`s`}`:`only account`}</div>
          </div>
        </div>
        <button class="btn btn-secondary" id="switch-acc-btn" data-tooltip="Change profile">${i(`refresh`)} Switch</button>
      </div>
      <div class="row" style="border-bottom:none">
        <div><div class="label">Add another profile</div><div class="sub">Separate progress for a family member or classmate</div></div>
        <button class="icon-btn" id="add-acc-btn" data-tooltip="Create new profile" style="color:var(--text)">${i(`plus`)}</button>
      </div>
      ${s.length?`
      <div class="row" style="border-bottom:none">
        <div><div class="label bad-text">Remove an account</div><div class="sub">Deletes that profile with all its data</div></div>
        <button class="icon-btn" id="remove-acc-btn" data-tooltip="Remove an account" style="color:var(--bad)">${i(`trash`)}</button>
      </div>`:``}
      <div class="row" style="border-bottom:none">
        <div><div class="label">Log out</div><div class="sub">${r.pinHash?`Return to the account picker — PIN required to re-enter`:`Return to the account picker`}</div></div>
        <button class="btn btn-secondary" id="logout-btn" data-tooltip="Log out of this profile">${i(`refresh`)} Log out</button>
      </div>
    `,b.querySelector(`#switch-acc-btn`).addEventListener(`click`,()=>{x.state.accountFlow={mode:`picker`},x.go(`accounts`)}),b.querySelector(`#add-acc-btn`).addEventListener(`click`,()=>{x.state.accountFlow={mode:`create`},x.go(`accounts`)}),b.querySelector(`#remove-acc-btn`)?.addEventListener(`click`,async()=>{let e=prompt(`Type the profile name to remove:\n\n${s.map(e=>`· `+e.name).join(`
`)}`);if(!e)return;let t=s.find(t=>t.name.toLowerCase()===e.trim().toLowerCase());if(!t){x.toast(`No profile with that name`,!0);return}await p(`Delete "${t.name}"?`,`All documents, quizzes and mistakes for <b>${f(t.name)}</b> will be permanently removed.`)&&(await n(t.id),x.toast(`Removed ${t.name}`),N())}),b.querySelector(`#logout-btn`).addEventListener(`click`,()=>O(x))}N(),b.querySelector(`#replay-intro-btn`).addEventListener(`click`,()=>{d({onboarded:!1}),x.state.screen=`onboarding`,x.go(`onboarding`)}),b.querySelector(`#replay-tour-btn`)?.addEventListener(`click`,async()=>{let e=x.state.account?.id||a()||localStorage.getItem(`quizard-active-account`);if(!e)try{let t=await o();t.length&&(e=t[0].id,g(e),x.state.account=t[0])}catch{}else if(!a()&&(g(e),!x.state.account))try{x.state.account=await t(e)}catch{}d({tutorialDone:!1,tourSeen:[]}),x.go(`tutorial`)}),b.querySelector(`#sw-wizardvoice`)?.addEventListener(`click`,e=>{let t=e.currentTarget.classList.toggle(`on`);d({wizardVoice:t})}),b.querySelector(`#sw-skipintro`)?.addEventListener(`click`,e=>{let t=e.currentTarget.classList.toggle(`on`);d({skipIntro:t}),x.toast(t?`Intro will be skipped`:`Intro plays on launch`)}),b.querySelectorAll(`#theme-seg button`).forEach(e=>e.addEventListener(`click`,()=>{x.setTheme(e.dataset.t),b.querySelectorAll(`#theme-seg button`).forEach(t=>t.classList.toggle(`on`,t===e))})),b.querySelector(`#export-btn`).addEventListener(`click`,async()=>{try{let e=await v(),t=new Blob([JSON.stringify(e,null,1)],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`),i=new Date;r.href=n,r.download=`quizard-backup-${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,`0`)}-${String(i.getDate()).padStart(2,`0`)}.json`,document.body.appendChild(r),r.click(),r.remove(),setTimeout(()=>URL.revokeObjectURL(n),4e3),x.toast(`Backup downloaded ✓`),b.querySelector(`.backup-nudge`)?.remove();let a=b.querySelector(`#usage-line`);if(a){let e=a.textContent.match(/· (.*)$/)?.[1]||``;a.textContent=`Last backup: ${new Date().toLocaleDateString(void 0,{month:`short`,day:`numeric`,year:`numeric`})}${e?` · `+e:``}`}}catch(e){x.toast(`Export failed: `+e.message,!0)}});let P=b.querySelector(`#import-input`);b.querySelector(`#import-btn`).addEventListener(`click`,()=>P.click()),P.addEventListener(`change`,async()=>{let e=P.files[0];if(!e)return;let t;try{t=JSON.parse(await e.text())}catch{x.toast(`That file is not valid JSON`,!0),P.value=``;return}if(t?.app!==`quizard`){x.toast(`Not a Quizard backup file`,!0),P.value=``;return}let n=t.docs?.length||0,r=t.attempts?.length||0,i=document.createElement(`div`);i.className=`quit-dialog-mask`,i.innerHTML=`
      <div class="quit-dialog">
        <h3>Import backup?</h3>
        <p>Contains ${n} document${n===1?``:`s`} and ${r} quiz attempt${r===1?``:`s`}.</p>
        <div class="quit-actions">
          <button class="btn btn-primary" id="imp-merge">Merge with current data</button>
          <button class="btn btn-danger-ghost" id="imp-replace">Replace everything</button>
          <button class="btn btn-secondary" id="imp-cancel">Cancel</button>
        </div>
      </div>`,document.body.appendChild(i);let a=()=>{i.remove(),P.value=``};i.querySelector(`#imp-cancel`).addEventListener(`click`,a),i.addEventListener(`click`,e=>{e.target===i&&a()});let o=async e=>{try{let n=await s(t,e);x.toast(`Imported ${n.docs} docs, ${n.attempts} attempts ✓`),a(),x.refresh()}catch(e){x.toast(`Import failed: `+e.message,!0),a()}};i.querySelector(`#imp-merge`).addEventListener(`click`,()=>o(`merge`)),i.querySelector(`#imp-replace`).addEventListener(`click`,async()=>{await p(`Replace all data?`,`All current documents, quizzes and history will be replaced by the backup. <b>This cannot be undone.</b>`,{confirmLabel:`Replace`})&&o(`replace`)})});let F=b.querySelector(`#enc-import-input`);b.querySelector(`#enc-export-btn`).addEventListener(`click`,async()=>{let e=await l(`Encrypted backup`,`Choose a passphrase. The backup file is <b>unreadable without it</b> — safe to store in your own Google Drive, email or USB. There is <b>no recovery</b> if you forget it.`,{confirmLabel:`Encrypt & download`,placeholder:`Passphrase (4+ characters)`,mask:!0});if(e!=null){if(e.trim().length<4){x.toast(`Passphrase must be at least 4 characters`,!0);return}try{let t=await E(await v(),e.trim()),n=new Blob([t],{type:`application/json`}),r=URL.createObjectURL(n),i=document.createElement(`a`),a=new Date;i.href=r,i.download=`quizard-encrypted-${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,`0`)}-${String(a.getDate()).padStart(2,`0`)}.json`,document.body.appendChild(i),i.click(),i.remove(),setTimeout(()=>URL.revokeObjectURL(r),4e3),d({lastBackupAt:Date.now()}),x.toast(`Encrypted backup downloaded ✓ — store it in your Drive`),b.querySelector(`.backup-nudge`)?.remove()}catch(e){x.toast(`Encrypted export failed: `+e.message,!0)}}}),b.querySelector(`#enc-import-btn`).addEventListener(`click`,()=>F.click()),F.addEventListener(`change`,async()=>{let e=F.files[0];if(!e)return;let t=await e.text(),n=null;try{n=JSON.parse(t)}catch{x.toast(`That file is not valid JSON`,!0),F.value=``;return}if(n?.app!==`quizard-encrypted`){x.toast(`Not an encrypted Quizard backup — use Import backup`,!0),F.value=``;return}let r=await l(`Restore encrypted backup`,`Enter the passphrase this backup was encrypted with.`,{confirmLabel:`Decrypt & restore`,placeholder:`Passphrase`,mask:!0});if(r==null){F.value=``;return}let i;try{i=await D(t,r)}catch(e){x.toast(e.message,!0),F.value=``;return}let a=i.docs?.length||0,o=document.createElement(`div`);o.className=`quit-dialog-mask`,o.innerHTML=`
      <div class="quit-dialog">
        <h3>Restore encrypted backup?</h3>
        <p>Contains ${a} document${a===1?``:`s`}${i.attempts?.length?` and ${i.attempts.length} quiz attempt${i.attempts.length===1?``:`s`}`:``}.</p>
        <div class="quit-actions">
          <button class="btn btn-primary" id="enc-merge">Merge with current data</button>
          <button class="btn btn-danger-ghost" id="enc-replace">Replace everything</button>
          <button class="btn btn-secondary" id="enc-cancel">Cancel</button>
        </div>
      </div>`,document.body.appendChild(o);let c=()=>{o.remove(),F.value=``};o.querySelector(`#enc-cancel`).addEventListener(`click`,c);let u=async e=>{try{let t=await s(i,e);x.toast(`Restored ${t.docs} docs, ${t.attempts} attempts ✓`),c(),x.refresh()}catch(e){x.toast(`Restore failed: `+e.message,!0),c()}};o.querySelector(`#enc-merge`).addEventListener(`click`,()=>u(`merge`)),o.querySelector(`#enc-replace`).addEventListener(`click`,async()=>{await p(`Replace all data?`,`All current data will be replaced by the decrypted backup. <b>This cannot be undone.</b>`,{confirmLabel:`Replace`})&&u(`replace`)})});let I=C?`Last backup: ${new Date(C).toLocaleDateString(void 0,{month:`short`,day:`numeric`,year:`numeric`})}`:`Never backed up`;c().then(e=>{let t=e?` · ${(e.usage/1048576).toFixed(1)} MB used`:``;b.querySelector(`#usage-line`).textContent=I+t}),b.querySelector(`#clear-btn`).addEventListener(`click`,async()=>{await p(`Erase all data?`,`All documents, quizzes, history and mistakes will be permanently deleted. Consider exporting a backup first.`)&&(await r(),x.toast(`All data erased`),x.go(`library`))}),b.querySelector(`#clear-cache-btn`)?.addEventListener(`click`,async()=>{if(await p(`Clear cache?`,`Delete all cached files and reload the app. Your documents are stored in IndexedDB and will not be affected.`)){if(`caches`in window){let e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e)))}location.reload()}})}export{A as render};