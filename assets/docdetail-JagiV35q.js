import{$ as e,H as t,L as n,S as r,b as i,d as a,ht as o,m as s,p as c,r as l,u,vt as d,x as f,y as p}from"./index-rFn9O_LP.js";import{r as m}from"./gemini-BQvNqYOp.js";import{t as h}from"./quiz-ai-CsSp0gI8.js";async function g(g,_){let v=await t(_.state.currentDocId);if(!v){_.go(`library`);return}let y=Array.isArray(v.topics)?v.topics:[],b=d(await e()).filter(e=>e!==v.folder);g.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to library">${r(`chevronLeft`)}</button>
      <h2>Document</h2>
      <div class="spacer"></div>
    </header>
    <div class="screen">
      <div class="setup-hero">
        <div class="doc-icon ${v.type}">${r(`fileText`)}</div>
        <div style="min-width:0;flex:1">
          <div class="doc-name">${c(v.name)}</div>
          <div class="doc-meta">${f(v.type)} · ${v.wordCount.toLocaleString()} words · ${s(v.createdAt)}</div>
        </div>
        <button class="icon-btn" id="rename-btn" data-tooltip="Rename document">${r(`fileText`)}</button>
      </div>

      ${i([{value:v.attempts||0,label:`Attempts`},{value:v.bestScore==null?`—`:v.bestScore+`%`,label:`Best Score`},{value:y.length,label:`Topics`}])}

      ${p(`Rename`)}
      <div class="rename-row">
        <input class="text-input" id="name-input" value="${c(v.name)}" aria-label="Document name" maxlength="80" />
        <button class="btn btn-secondary" id="save-name-btn" data-tooltip="Save new name">${r(`check`)} Save</button>
      </div>

      ${p(`Organize`)}
      <label class="field-label" for="folder-input">${r(`folder`)} Folder</label>
      <input class="text-input" id="folder-input" list="doc-folder-list" value="${c(v.folder||``)}" maxlength="40" placeholder="None" autocomplete="off" />
      <datalist id="doc-folder-list">${b.map(e=>`<option value="${c(e)}"></option>`).join(``)}</datalist>
      <label class="field-label" for="tags-input" style="margin-top:14px">${r(`tag`)} Tags <span style="font-weight:500;color:var(--text-faint)">(comma separated)</span></label>
      <input class="text-input" id="tags-input" value="${c((v.tags||[]).join(`, `))}" maxlength="120" placeholder="exam, chapter 3" autocomplete="off" />
      <button class="btn btn-secondary" id="save-org-btn" style="margin-top:12px;width:100%">${r(`check`)} Save organization</button>

      ${y.length?`
      ${p(`Detected topics`)}
      ${a(y.map(e=>u(e.title,{count:e.count})))}`:``}

      ${p(`Extracted text`)}
      <div class="card">
        <div class="preview-box" id="text-preview" style="max-height:120px">${c(v.text.slice(0,400))}${v.text.length>400?`…`:``}</div>
        ${v.text.length>400?`<button class="btn btn-secondary" id="toggle-full-btn" style="margin-top:10px;width:100%">Show full text (${v.wordCount.toLocaleString()} words)</button>`:``}
        ${Array.isArray(v.visualAnalysis)&&v.visualAnalysis.length?`<p class="faint" style="font-size:12px;margin:10px 2px 0">${v.visualAnalysis.length} visual${v.visualAnalysis.length===1?``:`s`} analyzed (diagrams, code & charts cached for quizzes)</p>`:``}
      </div>

      <button class="btn btn-secondary" id="reviewer-btn" style="margin-top:20px;width:100%" data-tooltip="Read this document as a study reviewer">${r(`book`)} Open Reviewer</button>
      <button class="btn btn-secondary" id="analyze-btn" style="margin-top:10px;width:100%" data-tooltip="Have Gemini look at the pages, diagrams and code so quizzes can ask about the visuals">${r(`scan`)} Analyze visuals</button>
      <button class="btn btn-secondary" id="flashcards-btn" style="margin-top:10px;width:100%" data-tooltip="Study key terms as flip cards">${r(`shuffle`)} Flashcards</button>
      <button class="btn btn-primary" id="quiz-btn" style="margin-top:10px">${r(`play`)} Create Quiz</button>
      <button class="btn btn-danger-ghost" id="delete-btn" style="margin-top:10px;width:100%">${r(`trash`)} Delete document</button>
    </div>
  `,g.querySelector(`#back-btn`).addEventListener(`click`,()=>_.go(`library`));let x=g.querySelector(`#name-input`);g.querySelector(`#save-name-btn`).addEventListener(`click`,async()=>{let e=x.value.trim();if(!e){_.toast(`Name cannot be empty`,!0);return}if(e===v.name){_.toast(`Name unchanged`);return}await o(v.id,{name:e}),_.toast(`Renamed ✓`),_.refresh()}),g.querySelector(`#save-org-btn`).addEventListener(`click`,async()=>{let e=g.querySelector(`#folder-input`).value.trim()||null,t=g.querySelector(`#tags-input`).value.split(`,`).map(e=>e.trim()).filter(Boolean).slice(0,12);await o(v.id,{folder:e,tags:t}),_.toast(`Saved ✓`),_.refresh()});let S=g.querySelector(`#text-preview`);g.querySelector(`#toggle-full-btn`)?.addEventListener(`click`,e=>{S.dataset.expanded===`1`?(S.textContent=v.text.slice(0,400)+`…`,S.style.maxHeight=`120px`,e.currentTarget.textContent=`Show full text (${v.wordCount.toLocaleString()} words)`,S.dataset.expanded=`0`):(S.textContent=v.text,S.style.maxHeight=`420px`,e.currentTarget.textContent=`Show less`,S.dataset.expanded=`1`)}),g.querySelector(`#quiz-btn`).addEventListener(`click`,()=>_.go(`setup`,v.id)),g.querySelector(`#reviewer-btn`).addEventListener(`click`,()=>_.go(`reviewer`,v.id)),g.querySelector(`#analyze-btn`).addEventListener(`click`,async e=>{let t=e.currentTarget;if(!m()){_.toast(`Add a Gemini key in Settings to analyze visuals`,!0);return}t.disabled=!0;let n=t.innerHTML;t.textContent=`Analyzing…`;try{let e=await h(v);!e||!e.elements.length?_.toast(`No diagrams, code or charts found`):_.toast(`Analyzed ${e.elements.length} visual${e.elements.length===1?``:`s`} ✓`),_.refresh()}catch{_.toast(`Visual analysis failed`,!0)}finally{t.disabled=!1,t.innerHTML=n}}),g.querySelector(`#flashcards-btn`).addEventListener(`click`,()=>_.go(`flashcards`,v.id)),g.querySelector(`#delete-btn`).addEventListener(`click`,async()=>{await l(`Delete "${v.name}"?`,`All quiz history for <b>${c(v.name)}</b> will be removed.`)&&(await n(v.id),_.toast(`Document deleted`),_.go(`library`))}),g.querySelector(`#rename-btn`).addEventListener(`click`,()=>{x.focus(),x.select(),x.scrollIntoView({behavior:`smooth`,block:`center`})})}export{g as render};