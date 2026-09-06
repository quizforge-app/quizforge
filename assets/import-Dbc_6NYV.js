import{t as e}from"./topics-2sMjMAqj.js";import{$ as t,S as n,a as r,d as i,g as a,ot as o,p as s,st as c,u as l,vt as u,wt as d}from"./index-rFn9O_LP.js";import{t as f}from"./jszip.min-YnSt4mI2.js";import{n as p,r as m}from"./gemini-BQvNqYOp.js";import{n as h,t as g}from"./extract-K-g5ecPy.js";import{t as _}from"./summarize-QAQ0x1JH.js";var v=d(f(),1),y=5242880,b=50,x=[`image/png`,`image/jpeg`,`image/gif`,`image/webp`,`image/bmp`];function S(e){let t=e.toLowerCase().split(`.`).pop();return t===`png`?`image/png`:t===`jpg`||t===`jpeg`?`image/jpeg`:t===`gif`?`image/gif`:t===`webp`?`image/webp`:t===`bmp`?`image/bmp`:null}async function C(e,t){if(t!==`pptx`&&t!==`docx`)return[];try{let n=await e.arrayBuffer(),r=await v.default.loadAsync(n),i=[];if(t===`pptx`){let e=Object.keys(r.files).filter(e=>/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(e)).sort((e,t)=>parseInt(e.match(/slide(\d+)\.xml/)[1],10)-parseInt(t.match(/slide(\d+)\.xml/)[1],10)),t=new Map;for(let n of e){let e=parseInt(n.match(/slide(\d+)\.xml/)[1],10),i=await r.files[n].async(`string`);for(let n of i.matchAll(/Target="[^"]*media\/([^"]+)"/g)){let r=n[1];t.has(r)||t.set(r,e)}}for(let[e,n]of t){let t=r.files[`ppt/media/${e}`];if(!t)continue;let a=S(e);if(!a||!x.includes(a))continue;let o=await t.async(`blob`);if(!(o.size>y)&&(i.push({blob:o,mime:a,slideNumber:n}),i.length>=b))break}}else{let e=Object.keys(r.files).filter(e=>/^word\/media\//.test(e)).sort();for(let t of e){let e=r.files[t],n=S(t.split(`/`).pop());if(!n||!x.includes(n))continue;let a=await e.async(`blob`);if(!(a.size>y)&&(i.push({blob:a,mime:n,slideNumber:null}),i.length>=b))break}}return i}catch{return[]}}var w=[`You are a transcription assistant for a study app.`,`Transcribe ALL readable text from the image exactly, preserving headings, bullet points and key labels.`,`If the image is a diagram, chart, slide, whiteboard or screenshot, include the important terms and short annotations a student would need.`,`Return only the transcribed text — no commentary and no markdown code fences.`].join(`
`);function T(e){let t=/^data:([^;]+);base64,(.+)$/.exec(e||``);return t?{mimeType:t[1],data:t[2]}:null}function E(e){return e?e.replace(/^```(?:[a-z]*)\n?/i,``).replace(/```$/i,``).trim():``}async function D(e,{maxOutputTokens:t=2048}={}){let n=T(e);if(!n)throw Error(`invalid_image`);return E(await p(w,[{mimeType:n.mimeType,data:n.data}],{maxOutputTokens:t,temperature:.2,json:!1})||``)}function O(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(r.result),r.onerror=()=>n(Error(`read_failed`)),r.readAsDataURL(e)})}async function k(e,t=1600,n=.82){try{let r=await createImageBitmap(e),i=Math.min(1,t/Math.max(r.width,r.height)),a=Math.max(1,Math.round(r.width*i)),o=Math.max(1,Math.round(r.height*i)),s=document.createElement(`canvas`);return s.width=a,s.height=o,s.getContext(`2d`).drawImage(r,0,0,a,o),r.close?.(),await new Promise(e=>s.toBlob(e,`image/jpeg`,n))||e}catch{return e}}async function A(d,f){let p=u(await t());d.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to library">${n(`chevronLeft`)}</button>
      <h2>Add Document</h2>
      <button class="icon-btn" id="theme-btn" data-tooltip="${f.state.theme===`dark`?`Switch to light mode`:`Switch to dark mode`}">${f.state.theme===`dark`?n(`sun`):n(`moon`)}</button>
    </header>
    <div class="screen">
      <div class="seg" id="mode-seg" style="width:100%;margin-bottom:14px">
        <button data-mode="file" class="on">${n(`upload`)} File</button>
        <button data-mode="paste">${n(`pencil`)} Paste</button>
        <button data-mode="photo">${n(`camera`)} Photo</button>
      </div>

      <div id="drop-stage">
        <div class="dropzone" id="dropzone" data-tooltip="PDF, DOCX, PPTX, TXT or MD — up to 50MB">
          <div class="dropzone-illust">${r}</div>
          <h3>Tap to choose a file</h3>
          <p>or drag &amp; drop it here</p>
          <input type="file" id="file-input" accept=".pdf,.docx,.pptx,.txt,.md" aria-label="Choose a document file" hidden />
        </div>
        <div class="fmt-row">
          ${i([`PDF`,`DOCX`,`PPTX`,`TXT`,`MD`].map(e=>l(e,{active:!0})))}
        </div>
        ${a(`Your file is processed locally on this device.<br/>Text is extracted and stored locally.`,{style:`font-size:12.5px;margin-top:22px;line-height:1.6`,tag:`p`})}
      </div>

      <div id="paste-stage" class="hidden">
        <div class="card">
          <label class="section-title" for="paste-name" style="margin:0 0 8px">Document name</label>
          <input class="text-input" id="paste-name" maxlength="80" placeholder="e.g. Lecture 4 notes" />
          <label class="section-title" for="paste-area" style="margin:16px 0 8px">Paste your notes or text</label>
          <textarea id="paste-area" class="text-area" placeholder="Paste the text you want to study here…" rows="10"></textarea>
        </div>
        <button class="btn btn-primary" id="paste-save" style="margin-top:18px">${n(`check`)} Save to Library</button>
        <button class="btn btn-secondary" id="paste-back" style="margin-top:10px;width:100%">Back</button>
      </div>

      <div id="photo-stage" class="hidden">
        <div class="photo-opts">
          <button class="photo-opt" id="photo-take" data-tooltip="Use your camera">
            <div class="photo-opt-ico">${n(`camera`)}</div>
            <div class="photo-opt-label">Take a photo</div>
            <div class="photo-opt-sub">single camera shot</div>
          </button>
          <button class="photo-opt" id="photo-choose" data-tooltip="Pick from your gallery">
            <div class="photo-opt-ico">${n(`images`)}</div>
            <div class="photo-opt-label">Choose photos</div>
            <div class="photo-opt-sub">one or more</div>
          </button>
        </div>
        <input type="file" id="photo-capture-input" accept="image/*" capture aria-label="Take a photo" hidden />
        <input type="file" id="photo-input" accept="image/*" multiple aria-label="Choose photos" hidden />
        ${a(`Gemini reads the text from your photo(s),<br/>then turns it into a study set. Try a clear, flat shot.`,{style:`font-size:12.5px;margin-top:22px;line-height:1.6`,tag:`p`})}
      </div>

      <div id="progress-stage" class="hidden">
        <h3 class="center" id="extract-filename" style="margin-top:8px"></h3>
        <div class="extract-steps" id="steps"></div>
      </div>

      <div id="result-stage" class="hidden">
        <div class="card" style="margin-top:10px">
          <label class="section-title" for="doc-name-input" style="margin:0 0 8px">Document name</label>
          <input class="text-input" id="doc-name-input" maxlength="80" />
          <label class="section-title" for="doc-folder-input" style="margin:16px 0 8px">${n(`folder`)} Folder <span style="text-transform:none;font-weight:500;color:var(--text-faint)">(optional)</span></label>
          <input class="text-input" id="doc-folder-input" list="folder-list" maxlength="40" placeholder="e.g. Biology 101" autocomplete="off" />
          <datalist id="folder-list">${p.map(e=>`<option value="${s(e)}"></option>`).join(``)}</datalist>
          <label class="section-title" for="doc-tags-input" style="margin:16px 0 8px">${n(`tag`)} Tags <span style="text-transform:none;font-weight:500;color:var(--text-faint)">(comma separated)</span></label>
          <input class="text-input" id="doc-tags-input" maxlength="120" placeholder="exam, chapter 3, vocab" autocomplete="off" />
          <div class="row" style="padding:14px 0 4px">
            <div><div class="label">Words extracted</div></div>
            <div class="label good-text" id="word-count">—</div>
          </div>
          <div id="topics-row" style="padding:4px 0 12px;border-bottom:1px solid var(--border)"></div>
          <label class="section-title" style="margin:16px 0 8px">Preview</label>
          <div class="preview-box" id="preview-box"></div>
        </div>
        <button class="btn btn-primary" id="save-doc-btn" style="margin-top:18px">${n(`check`)} Save to Library</button>
        <button class="btn btn-secondary" id="discard-btn" style="margin-top:10px;width:100%">Discard &amp; start over</button>
      </div>
    </div>
  `;let v=d.querySelector(`#dropzone`),y=d.querySelector(`#file-input`),b=d.querySelector(`#mode-seg`),x={drop:d.querySelector(`#drop-stage`),paste:d.querySelector(`#paste-stage`),photo:d.querySelector(`#photo-stage`),progress:d.querySelector(`#progress-stage`),result:d.querySelector(`#result-stage`)},S=null;function w(e){for(let[t,n]of Object.entries(x))n.classList.toggle(`hidden`,t!==e)}function T(e){b.querySelectorAll(`[data-mode]`).forEach(t=>t.classList.toggle(`on`,t.dataset.mode===e)),w(e)}b.querySelectorAll(`[data-mode]`).forEach(e=>e.addEventListener(`click`,()=>T(e.dataset.mode))),v.addEventListener(`click`,()=>y.click()),v.addEventListener(`dragover`,e=>{e.preventDefault(),v.classList.add(`dragover`)}),v.addEventListener(`dragleave`,()=>v.classList.remove(`dragover`)),v.addEventListener(`drop`,e=>{e.preventDefault(),v.classList.remove(`dragover`),e.dataTransfer.files.length&&A(e.dataTransfer.files[0])}),y.addEventListener(`change`,()=>{y.files.length&&A(y.files[0])});function E(e){if(!m()){f.toast(`Add a Gemini key in Settings to read photos`,!0);return}e()}d.querySelector(`#photo-take`).addEventListener(`click`,()=>{E(()=>d.querySelector(`#photo-capture-input`).click())}),d.querySelector(`#photo-capture-input`).addEventListener(`change`,()=>{let e=d.querySelector(`#photo-capture-input`).files[0];e&&j([e]),d.querySelector(`#photo-capture-input`).value=``}),d.querySelector(`#photo-choose`).addEventListener(`click`,()=>{E(()=>d.querySelector(`#photo-input`).click())}),d.querySelector(`#photo-input`).addEventListener(`change`,()=>{let e=[...d.querySelector(`#photo-input`).files].filter(e=>e.type.startsWith(`image/`));e.length&&j(e),d.querySelector(`#photo-input`).value=``}),d.querySelector(`#paste-save`).addEventListener(`click`,()=>{let e=d.querySelector(`#paste-area`).value.trim();if(e.length<20){f.toast(`Paste a bit more text to study`,!0);return}N({name:d.querySelector(`#paste-name`).value.trim()||`Pasted notes`,type:`txt`,text:e,images:[]})}),d.querySelector(`#paste-back`).addEventListener(`click`,()=>T(`file`));async function A(e){if(!g(e.name)){f.toast(`Only PDF, DOCX, PPTX, TXT or MD files are supported`,!0);return}if(e.size>52428800){f.toast(`File is too large (max 50MB)`,!0);return}x.progress.classList.remove(`hidden`),x.drop.classList.add(`hidden`),d.querySelector(`#extract-filename`).textContent=e.name;let t=d.querySelector(`#steps`);t.innerHTML=[[`Reading file…`],[`Extracting text…`],[`Saving locally…`]].map(([e])=>`
      <div class="step-item">
        <div class="step-dot">${n(`check`)}</div>
        <div class="step-label">${e}</div>
      </div>`).join(``);let r=[...t.querySelectorAll(`.step-item`)];try{r[0].classList.add(`active`),await new Promise(e=>setTimeout(e,250)),r[0].classList.replace(`active`,`done`),r[1].classList.add(`active`);let{type:t,text:n}=await h(e),i=await C(e,t);r[1].classList.replace(`active`,`done`),r[2].classList.add(`active`),await new Promise(e=>setTimeout(e,350)),r[2].classList.replace(`active`,`done`),N({name:e.name.replace(/\.(pdf|docx|pptx|txt|md|markdown)$/i,``),type:t,text:n,images:i,file:e})}catch(e){console.error(e),f.toast(e.message||`Could not read this file`,!0),w(`drop`),y.value=``,y=d.querySelector(`#file-input`),M()}}async function j(e){let t=[...e].filter(e=>e.type.startsWith(`image/`));if(!t.length){f.toast(`Choose image files`,!0);return}let r=t.length;x.progress.classList.remove(`hidden`),x.photo.classList.add(`hidden`),d.querySelector(`#extract-filename`).textContent=r===1?t[0].name||`Photo`:`${r} photos`;let i=d.querySelector(`#steps`);i.innerHTML=`
      <div class="step-item active"><div class="step-dot">${n(`check`)}</div><div class="step-label">Reading ${r} image${r===1?``:`s`}…</div></div>
      <div class="step-item"><div class="step-dot">${n(`check`)}</div><div class="step-label">Transcribing with Gemini…</div></div>`;let a=[...i.querySelectorAll(`.step-item`)];try{let e=[],n=[];for(let i=0;i<r;i++)try{let r=await k(t[i]);n.push(r);let a=await D(await O(r),{maxOutputTokens:4096});a&&a.trim()&&e.push(a.trim())}catch(e){console.warn(`photo transcribe failed`,e)}a[1].classList.add(`active`),a[1].classList.replace(`active`,`done`),a[0].classList.replace(`active`,`done`);let i=e.join(`

`);if(!i.trim())throw Error(`No readable text found in those images`);N({name:(t[0].name||`Photo notes`).replace(/\.[^.]+$/,``)||`Photo notes`,type:`image`,text:i,images:n.map((e,t)=>({blob:e,mimeType:e.type||`image/jpeg`,index:t,slideNumber:t+1})),file:null})}catch(e){console.error(e),f.toast(e.message||`Could not read these photos`,!0),w(`photo`)}}function M(){y.addEventListener(`change`,()=>{y.files.length&&A(y.files[0])})}function N({name:t,type:r,text:i,images:a=[],file:o=null}){S={name:t,type:r,text:i,images:a,file:o};let c=(i.match(/\S+/g)||[]).length,{topics:l}=e(i);S.topics=l;let u=_(i);d.querySelector(`#doc-name-input`).value=S.name,d.querySelector(`#word-count`).textContent=c.toLocaleString();let f=a.length?` · ${a.length} image${a.length===1?``:`s`}`:``,p=d.querySelector(`#word-count`).parentElement.querySelector(`.label`);p&&(p.textContent=`Words extracted${f}`);let m=d.querySelector(`#topics-row`);m&&(m.innerHTML=`
        ${u?`<div class="tldr-line">${n(`zap`)} ${s(u)}</div>`:``}
        ${l.length?`<div class="label" style="margin-bottom:8px">Detected topics</div><div class="chip-row">${l.slice(0,6).map(e=>`<span class="chip">${s(e.title)} <span class="chip-count">${e.count}</span></span>`).join(``)}${l.length>6?`<span class="chip">+${l.length-6} more</span>`:``}</div>`:`<div class="sub">No distinct topics detected — questions will cover the whole document.</div>`}`),d.querySelector(`#preview-box`).textContent=i.slice(0,600)+(i.length>600?`…`:``),setTimeout(()=>w(`result`),300)}d.querySelector(`#save-doc-btn`).addEventListener(`click`,async()=>{if(!S)return;let e=d.querySelector(`#doc-name-input`).value.trim()||`Untitled document`,t=d.querySelector(`#doc-folder-input`).value.trim()||null,n=d.querySelector(`#doc-tags-input`).value.split(`,`).map(e=>e.trim()).filter(Boolean).slice(0,12),r=await o({name:e,type:S.type,text:S.text,topics:S.topics||[],folder:t,tags:n,original:S.file});S.images?.length&&await c(r.id,S.images.map((e,t)=>({...e,index:t}))),f.toast(`Document saved ✓`),f.go(`setup`,r.id)}),d.querySelector(`#discard-btn`).addEventListener(`click`,()=>{S=null,T(`file`)}),d.querySelector(`#back-btn`).addEventListener(`click`,()=>f.go(`library`)),d.querySelector(`#theme-btn`).addEventListener(`click`,()=>f.toggleTheme())}export{A as render};