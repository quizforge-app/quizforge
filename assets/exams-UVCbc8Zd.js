import{t as e}from"./assets-C7X78vgS.js";import{C as t,H as n,K as r,R as i,S as a,T as o,U as s,et as c,p as l,r as u,tt as d,w as f,y as p}from"./index-rFn9O_LP.js";import{t as m}from"./export-CXckpnF6.js";var h=null;function g(){h&&(h(),h=null)}async function _(e,t){h&&h();let n=t.state.examDetailId;return n?b(e,t,n):v(e,t)}async function v(t,n){let r=await d(),i=r.filter(e=>(e.status||`upcoming`)===`upcoming`),o=r.filter(e=>(e.status||`upcoming`)!==`upcoming`);t.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back">${a(`chevronLeft`)}</button>
      <h2>Exams</h2>
      <button class="icon-btn" id="new-exam-btn" data-tooltip="New exam with the wizard">${a(`plus`)}</button>
    </header>
    <div class="screen">
      ${i.length?p(`Upcoming`):``}
      ${i.map(e=>y(e)).join(``)}
      ${o.length?p(`Past`)+o.map(e=>y(e,!0)).join(``):``}
      ${r.length?``:`
        <div class="empty-state">
          <div class="ec-empty-wiz"><img src="${e(`wizard/wizard-thinking.jpg`)}" alt="" /></div>
          <h3>No exams yet</h3>
          <p>Tell the wizard about your next exam — paste the announcement, upload the files it asks for, and practice across all of them.</p>
        </div>`}
      <button class="btn btn-primary" id="start-chat-btn" style="margin-top:18px;width:100%">${a(`sparkles`)} New exam with the wizard</button>
    </div>
  `,t.querySelector(`#back-btn`).addEventListener(`click`,()=>n.go(`library`)),t.querySelector(`#new-exam-btn`).addEventListener(`click`,()=>n.go(`exam-chat`)),t.querySelector(`#start-chat-btn`).addEventListener(`click`,()=>n.go(`exam-chat`)),t.querySelectorAll(`[data-exam]`).forEach(e=>e.addEventListener(`click`,()=>n.go(`exams`,e.dataset.exam)))}function y(e,t=!1){let n=f(e.examDate);return`
    <button class="doc-card exam-card ${t?`exam-past`:``}" data-exam="${e.id}">
      <div class="doc-icon exam-ico ${n===`today`?`urgent`:``}">${a(`fileText`)}</div>
      <div class="doc-info">
        <div class="doc-name">${l(e.title)}</div>
        <div class="doc-meta">
          ${n&&!t?`<span class="exam-countdown ${n===`today`?`urgent`:``}">${n}</span>`:``}
          <span>${e.docIds?.length||0} file${e.docIds?.length===1?``:`s`}</span>·
          <span>${e.topics?.length||0} topic${e.topics?.length===1?``:`s`}</span>
        </div>
      </div>
      <span class="al-go">${a(`chevronRight`)}</span>
    </button>`}async function b(e,d,p){let g=await s(p);if(!g){d.go(`exams`);return}e.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to exams">${a(`chevronLeft`)}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l(g.title)}</div>
        <div style="font-size:11.5px;color:var(--text-faint)" id="exam-countdown-line"></div>
      </div>
    </header>
    <div class="screen">
      <div id="exam-detail-body"><div class="reader-loading">Summoning your exam plan…</div></div>
    </div>
  `,e.querySelector(`#back-btn`).addEventListener(`click`,()=>d.go(`exams`));let _=e.querySelector(`#exam-detail-body`),[v,y,b]=await Promise.all([Promise.all(g.docIds.map(e=>n(e).catch(()=>null))),c(60).catch(()=>[]),r(null).catch(()=>[])]),x=v.filter(Boolean),S=b.filter(e=>g.docIds.includes(e.docId)),C=f(g.examDate);e.querySelector(`#exam-countdown-line`).textContent=C?`${g.examDate?new Date(g.examDate).toLocaleDateString(void 0,{month:`short`,day:`numeric`})+` · `:``}${C}`:`${x.length} files · ${g.topics.length} topics`,o(g,x);let w=t(g,x,S,{count:15});_.innerHTML=`
    ${C&&C!==`past`?`
    <div class="exam-banner ${C===`today`||C===`tomorrow`?`urgent`:``}">
      ${C===`today`?`The exam is TODAY`:`The exam is ${C}`}
    </div>`:``}

    ${g.announcement?`
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">✦</span><h3>Announcement</h3></div>
      <p class="rvw-overview">${l(g.announcement)}</p>
    </div>`:``}

    ${g.topics.length?`
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">I</span><h3>Topics to review</h3></div>
      ${g.topics.map(e=>{let t=x.find(t=>t.id===e.docId),n=S.filter(e=>t&&e.docId===t.id).length,r=e.reason||(t?`Covered in ${t.name}`:``);return`<div class="ec-topic">
          <div class="ec-topic-title">${l(e.title)}</div>
          <div class="ec-topic-reason">${l(r)}${n?` · <span style="color:var(--bad)">${n} weak spot${n===1?``:`s`}</span>`:``}</div>
        </div>`}).join(``)}
    </div>`:``}

    ${x.length?`
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">II</span><h3>Your files (${x.length})</h3></div>
      <div class="chip-row">${x.map(e=>`<span class="chip">${l(e.name)}</span>`).join(``)}</div>
    </div>`:``}

    <div class="reader-actions" style="margin-top:8px">
      <button class="btn btn-primary" id="start-quiz-btn" ${w.questions.length?``:`disabled`}>
        ${a(`play`)} Practice quiz (${w.questions.length||0} questions)
      </button>
      <button class="btn btn-secondary" id="pdf-btn" style="margin-top:10px;width:100%">${a(`download`)} Export exam PDF handout</button>
      <button class="btn btn-danger-ghost" id="delete-exam-btn" style="margin-top:10px;width:100%">${a(`trash`)} Delete exam</button>
    </div>
    ${w.questions.length?``:`<p class="faint" style="font-size:12px">Not enough content in these files to build a quiz yet.</p>`}
  `,e.querySelector(`#start-quiz-btn`).addEventListener(`click`,()=>{w.questions.length&&(d.state.examSession={examId:g.id,questions:w.questions,docName:g.title},d.go(`quiz`))}),e.querySelector(`#pdf-btn`).addEventListener(`click`,async()=>{let t=e.querySelector(`#pdf-btn`);t.disabled=!0,t.textContent=`Building PDF…`;try{await m(g,x),d.toast(`Exam PDF downloaded ✓`)}catch{d.toast(`Could not build the PDF`,!0)}t.disabled=!1,t.innerHTML=`${a(`download`)} Export exam PDF handout`}),e.querySelector(`#delete-exam-btn`).addEventListener(`click`,async()=>{await u(`Delete "${l(g.title)}"?`,`The exam plan will be removed. Your documents and quiz history stay.`)&&(await i(g.id),d.toast(`Exam deleted`),d.go(`exams`))}),h=()=>{}}export{_ as render,g as unmount};