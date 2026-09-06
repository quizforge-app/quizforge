import{C as e,H as t,K as n,R as r,S as i,T as a,U as o,et as s,p as c,r as l,tt as u,w as d,y as f}from"./index-CybBJgOJ.js";import{t as p}from"./export-Dy9f17lN.js";var m=null;function h(){m&&(m(),m=null)}async function g(e,t){m&&m();let n=t.state.examDetailId;return n?y(e,t,n):_(e,t)}async function _(e,t){let n=await u(),r=n.filter(e=>(e.status||`upcoming`)===`upcoming`),a=n.filter(e=>(e.status||`upcoming`)!==`upcoming`);e.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back">${i(`chevronLeft`)}</button>
      <h2>Exams</h2>
      <button class="icon-btn" id="new-exam-btn" data-tooltip="New exam with the wizard">${i(`plus`)}</button>
    </header>
    <div class="screen">
      ${r.length?f(`Upcoming`):``}
      ${r.map(e=>v(e)).join(``)}
      ${a.length?f(`Past`)+a.map(e=>v(e,!0)).join(``):``}
      ${n.length?``:`
        <div class="empty-state">
          <div class="ec-empty-wiz"><img src="/wizard/wizard-thinking.jpg" alt="" /></div>
          <h3>No exams yet</h3>
          <p>Tell the wizard about your next exam — paste the announcement, upload the files it asks for, and practice across all of them.</p>
        </div>`}
      <button class="btn btn-primary" id="start-chat-btn" style="margin-top:18px;width:100%">${i(`sparkles`)} New exam with the wizard</button>
    </div>
  `,e.querySelector(`#back-btn`).addEventListener(`click`,()=>t.go(`library`)),e.querySelector(`#new-exam-btn`).addEventListener(`click`,()=>t.go(`exam-chat`)),e.querySelector(`#start-chat-btn`).addEventListener(`click`,()=>t.go(`exam-chat`)),e.querySelectorAll(`[data-exam]`).forEach(e=>e.addEventListener(`click`,()=>t.go(`exams`,e.dataset.exam)))}function v(e,t=!1){let n=d(e.examDate);return`
    <button class="doc-card exam-card ${t?`exam-past`:``}" data-exam="${e.id}">
      <div class="doc-icon exam-ico ${n===`today`?`urgent`:``}">${i(`fileText`)}</div>
      <div class="doc-info">
        <div class="doc-name">${c(e.title)}</div>
        <div class="doc-meta">
          ${n&&!t?`<span class="exam-countdown ${n===`today`?`urgent`:``}">${n}</span>`:``}
          <span>${e.docIds?.length||0} file${e.docIds?.length===1?``:`s`}</span>·
          <span>${e.topics?.length||0} topic${e.topics?.length===1?``:`s`}</span>
        </div>
      </div>
      <span class="al-go">${i(`chevronRight`)}</span>
    </button>`}async function y(u,f,h){let g=await o(h);if(!g){f.go(`exams`);return}u.innerHTML=`
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to exams">${i(`chevronLeft`)}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c(g.title)}</div>
        <div style="font-size:11.5px;color:var(--text-faint)" id="exam-countdown-line"></div>
      </div>
    </header>
    <div class="screen">
      <div id="exam-detail-body"><div class="reader-loading">Summoning your exam plan…</div></div>
    </div>
  `,u.querySelector(`#back-btn`).addEventListener(`click`,()=>f.go(`exams`));let _=u.querySelector(`#exam-detail-body`),[v,y,b]=await Promise.all([Promise.all(g.docIds.map(e=>t(e).catch(()=>null))),s(60).catch(()=>[]),n(null).catch(()=>[])]),x=v.filter(Boolean),S=b.filter(e=>g.docIds.includes(e.docId)),C=d(g.examDate);u.querySelector(`#exam-countdown-line`).textContent=C?`${g.examDate?new Date(g.examDate).toLocaleDateString(void 0,{month:`short`,day:`numeric`})+` · `:``}${C}`:`${x.length} files · ${g.topics.length} topics`,a(g,x);let w=e(g,x,S,{count:15});_.innerHTML=`
    ${C&&C!==`past`?`
    <div class="exam-banner ${C===`today`||C===`tomorrow`?`urgent`:``}">
      ${C===`today`?`The exam is TODAY`:`The exam is ${C}`}
    </div>`:``}

    ${g.announcement?`
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">✦</span><h3>Announcement</h3></div>
      <p class="rvw-overview">${c(g.announcement)}</p>
    </div>`:``}

    ${g.topics.length?`
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">I</span><h3>Topics to review</h3></div>
      ${g.topics.map(e=>{let t=x.find(t=>t.id===e.docId),n=S.filter(e=>t&&e.docId===t.id).length,r=e.reason||(t?`Covered in ${t.name}`:``);return`<div class="ec-topic">
          <div class="ec-topic-title">${c(e.title)}</div>
          <div class="ec-topic-reason">${c(r)}${n?` · <span style="color:var(--bad)">${n} weak spot${n===1?``:`s`}</span>`:``}</div>
        </div>`}).join(``)}
    </div>`:``}

    ${x.length?`
    <div class="rvw-part">
      <div class="rvw-part-head"><span class="rvw-num">II</span><h3>Your files (${x.length})</h3></div>
      <div class="chip-row">${x.map(e=>`<span class="chip">${c(e.name)}</span>`).join(``)}</div>
    </div>`:``}

    <div class="reader-actions" style="margin-top:8px">
      <button class="btn btn-primary" id="start-quiz-btn" ${w.questions.length?``:`disabled`}>
        ${i(`play`)} Practice quiz (${w.questions.length||0} questions)
      </button>
      <button class="btn btn-secondary" id="pdf-btn" style="margin-top:10px;width:100%">${i(`download`)} Export exam PDF handout</button>
      <button class="btn btn-danger-ghost" id="delete-exam-btn" style="margin-top:10px;width:100%">${i(`trash`)} Delete exam</button>
    </div>
    ${w.questions.length?``:`<p class="faint" style="font-size:12px">Not enough content in these files to build a quiz yet.</p>`}
  `,u.querySelector(`#start-quiz-btn`).addEventListener(`click`,()=>{w.questions.length&&(f.state.examSession={examId:g.id,questions:w.questions,docName:g.title},f.go(`quiz`))}),u.querySelector(`#pdf-btn`).addEventListener(`click`,async()=>{let e=u.querySelector(`#pdf-btn`);e.disabled=!0,e.textContent=`Building PDF…`;try{await p(g,x),f.toast(`Exam PDF downloaded ✓`)}catch{f.toast(`Could not build the PDF`,!0)}e.disabled=!1,e.innerHTML=`${i(`download`)} Export exam PDF handout`}),u.querySelector(`#delete-exam-btn`).addEventListener(`click`,async()=>{await l(`Delete "${c(g.title)}"?`,`The exam plan will be removed. Your documents and quiz history stay.`)&&(await r(g.id),f.toast(`Exam deleted`),f.go(`exams`))}),m=()=>{}}export{g as render,h as unmount};