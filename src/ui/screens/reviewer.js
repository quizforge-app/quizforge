import { getDoc, listDocImages, loadSettings, saveSettings, upsertSrsFromMistake } from '../../lib/storage.js'
import { detectTopics } from '../../lib/topics.js'
import { sentences } from '../../lib/textproc.js'
import { summarizeDoc } from '../../lib/summarize.js'
import { generateQuiz } from '../../lib/quizgen.js'
import { speak, pause, resume, stop, isSupported } from '../../lib/tts.js'
import { icon } from '../icons.js'
import { esc, typeLabel, sectionTitle } from '../helpers.js'
import { attachZoom } from '../../lib/imgZoom.js'
import { exportSummary, printStudySheet, exportPdfHandout } from '../../lib/export.js'

function chunkParas(sentenceList, size = 3) {
  const out = []
  for (let i = 0; i < sentenceList.length; i += size) {
    out.push(sentenceList.slice(i, i + size).join(' '))
  }
  return out
}

let currentCleanup = null
export function unmount() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null }
}

export async function render(root, ctx) {
  if (currentCleanup) currentCleanup()
  const doc = await getDoc(ctx.state.currentDocId)
  if (!doc) { ctx.go('library'); return }

  const settings = loadSettings()
  let scale = settings.readerScale || 1
  let view = settings.reviewerView || 'summary'
  if (view === 'gallery') view = 'summary'

  const images = await listDocImages(doc.id)
  const objectUrls = new Map()

  // Heavy NLP (sentence splitting, topic detection, summarisation) is deferred
  // until after the screen paints so opening a large document doesn't freeze the UI.
  let sents, topics, summary, sections, readTargets, keyTermDefs, reviewQs
  let nlpBuilding = false
  function buildNlp() {
    sents = sentences(doc.text)
    const t = detectTopics(doc.text)
    topics = t.topics
    const membership = t.membership
    summary = summarizeDoc(doc.text)
    sections = []
    if (topics.length && sents.length) {
      const buckets = new Map(topics.map(tp => [tp.title, []]))
      const general = []
      for (const s of sents) {
        const tt = membership.get(s)
        if (tt && buckets.has(tt)) buckets.get(tt).push(s)
        else general.push(s)
      }
      if (general.length >= 2) sections.push({ title: 'Overview', paras: chunkParas(general) })
      for (const tp of topics) {
        const ss = buckets.get(tp.title)
        if (ss?.length) sections.push({ title: tp.title, paras: chunkParas(ss) })
      }
    } else {
      sections.push({ title: null, paras: chunkParas(sents.length ? sents : doc.text.split(/(?<=[.!?])\s+/)) })
    }
    // key term → the sentence that introduces it (for the definitions part)
    keyTermDefs = []
    const seenTerms = new Set()
    for (const sec of summary.sections) {
      for (const term of sec.terms) {
        const key = term.toLowerCase()
        if (seenTerms.has(key) || keyTermDefs.length >= 8) continue
        seenTerms.add(key)
        const def = sents.find(st => st.toLowerCase().includes(key) && st.length > 20)
        if (def) keyTermDefs.push({ term, def })
      }
    }
    // deterministic self-test questions (stable across re-opens)
    const q = generateQuiz(doc, {
      count: 5,
      mix: { mcq: true, id: true },
      difficulty: 'medium',
      shuffle: false,
      fixedSeed: 7
    })
    reviewQs = (q.questions || []).filter(q => q.type === 'mcq' || q.type === 'id')
    readTargets = {
      summary: summary.sections.flatMap(s => s.points),
      full: sections.flatMap(s => s.paras)
    }
  }

  function summaryHtml() {
    if (!summary.tldr.length) {
      return `<div class="empty-state"><h3>Not enough to summarize</h3><p>This document has too little readable text. Try the Full text tab.</p></div>`
    }
    const parts = []
    // Reviewer header, like the title block of a printed handout
    parts.push(`
      <div class="rvw-head">
        <div class="rvw-eyebrow">${icon('book')} Study Reviewer</div>
        <h1 class="rvw-title">${esc(doc.name)}</h1>
        <div class="rvw-meta">${typeLabel(doc.type)} · ${doc.wordCount.toLocaleString()} words · ${sections.length} section${sections.length === 1 ? '' : 's'} · ${keyTermDefs.length} key term${keyTermDefs.length === 1 ? '' : 's'}</div>
      </div>`)
    // I. Overview
    if (summary.tldr.length) {
      parts.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">I</span><h3>Overview</h3></div>
          ${summary.tldr.map(p => `<p class="rvw-overview" data-point>${esc(p)}</p>`).join('')}
        </div>`)
    }
    // II. Key terms & definitions
    if (keyTermDefs.length) {
      parts.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">II</span><h3>Key Terms &amp; Definitions</h3></div>
          <dl class="rvw-terms">
            ${keyTermDefs.map(t => `<div class="rvw-term"><dt>${esc(t.term)}</dt><dd>${esc(t.def)}</dd></div>`).join('')}
          </dl>
        </div>`)
    }
    // III. Section notes
    if (summary.sections.length) {
      parts.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">III</span><h3>Section Notes</h3></div>
          ${summary.sections.map((sec, i) => `
            <div class="sum-section">
              <div class="sum-head">
                <span class="sum-num">${String(i + 1).padStart(2, '0')}</span>
                <h4>${esc(sec.title)}</h4>
                <span class="chip-count">${sec.sentenceCount} sentence${sec.sentenceCount === 1 ? '' : 's'}</span>
              </div>
              <ul class="sum-points">
                ${sec.points.map(p => `<li>${esc(p)}</li>`).join('')}
              </ul>
            </div>`).join('')}
        </div>`)
    }
    // IV. Self-test
    if (reviewQs.length) {
      parts.push(`
        <div class="rvw-part">
          <div class="rvw-part-head"><span class="rvw-num">IV</span><h3>Test Yourself</h3></div>
          <ol class="rvq-list">
            ${reviewQs.map(q => {
              const qText = q.type === 'mcq' ? esc(q.stem) : `Identify the term: ${esc(q.clue)}`
              const opts = q.type === 'mcq'
                ? `<div class="rvq-opts">${(q.options || []).map((o, oi) => `<span>${String.fromCharCode(65 + oi)}. ${esc(o)}</span>`).join('')}</div>`
                : ''
              const ans = q.type === 'mcq' ? (q.options?.[q.answerIndex] ?? '') : (q.answer ?? '')
              return `<li class="rvq">
                <div class="rvq-q">${qText}${opts}</div>
                <details class="rvq-reveal"><summary>Check answer</summary><span>${esc(ans)}</span></details>
              </li>`
            }).join('')}
          </ol>
        </div>`)
    }
    return parts.join('') + `<p class="sum-note">Forged from your document — open <strong>Full text</strong> to read everything.</p>`
  }

  function fullHtml() {
    return sections.map(sec => `
      <section class="reader-section">
        ${sec.title ? `<h2>${esc(sec.title)}</h2>` : ''}
        ${sec.paras.map(p => `<p data-para>${esc(p)}</p>`).join('')}
      </section>`).join('') + '<p class="reader-end">· · ·</p>'
  }

  function galleryHtml() {
    return `
      <div class="gallery-grid">
        ${images.map((img, i) => `
          <button class="gallery-item" data-i="${i}" data-tooltip="Image ${i + 1}${img.slideNumber ? ' · slide ' + img.slideNumber : ''}">
            <img src="${objectUrl(img)}" alt="Extracted image ${i + 1}" loading="lazy" />
            ${img.slideNumber ? `<span class="gi-badge">slide ${img.slideNumber}</span>` : ''}
          </button>`).join('')}
      </div>
      <p class="sum-note">${images.length} image${images.length === 1 ? '' : 's'} extracted from this document.</p>
    `
  }

  function objectUrl(img) {
    if (!objectUrls.has(img.id)) objectUrls.set(img.id, URL.createObjectURL(img.blob))
    return objectUrls.get(img.id)
  }

  const tabs = [
    { id: 'summary', label: 'Reviewer', icon: 'book' },
    ...(images.length ? [{ id: 'gallery', label: `Gallery`, icon: 'fileText' }] : []),
    { id: 'full', label: 'Full text', icon: 'listChecks' }
  ]

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back">${icon('chevronLeft')}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(doc.name)}</div>
        <div style="font-size:11.5px;color:var(--text-faint)">${typeLabel(doc.type)} · ${doc.wordCount.toLocaleString()} words</div>
      </div>
      <div style="display:flex;gap:4px" id="font-controls">
        <button class="icon-btn text-btn" id="font-minus" data-tooltip="Smaller text">A−</button>
        <button class="icon-btn text-btn" id="font-plus" data-tooltip="Larger text">A+</button>
      </div>
    </header>
    <div class="screen">
      <div class="review-toggle">
        <div class="seg" style="width:100%">
          ${tabs.map(t => `<button id="tab-${t.id}" data-tab="${t.id}" class="${view === t.id ? 'on' : ''}" style="flex:1">${icon(t.icon)} ${t.label}</button>`).join('')}
        </div>
      </div>
      <div id="tts-bar" class="tts-bar">
        <button class="icon-btn" id="tts-play" data-tooltip="Read aloud — in the wizard's voice">${icon('play')}</button>
        <button class="icon-btn hidden" id="tts-pause" data-tooltip="Pause">${icon('timer')}</button>
        <button class="icon-btn hidden" id="tts-stop" data-tooltip="Stop">${icon('x')}</button>
        <div class="tts-rate">
          <span class="faint" style="font-size:11px">Speed</span>
          <input type="range" id="tts-rate" min="0.8" max="1.5" step="0.1" value="${settings.ttsRate || 1}" aria-label="Read-aloud speed" />
        </div>
      </div>
      <div id="find-bar" class="find-bar hidden">
        <input type="search" id="find-input" class="text-input" placeholder="Find in document…" aria-label="Find in document" autocomplete="off" />
        <span class="faint" id="find-count"></span>
      </div>
      <article class="reader" id="review-content"></article>
      <div class="reader-actions">
        <button class="btn btn-primary" id="quiz-btn">${icon('play')} Quiz me on this</button>
        <button class="btn btn-primary" id="pdf-btn" style="margin-top:10px;width:100%" data-tooltip="Download this reviewer as a formatted PDF handout">${icon('download')} Export PDF handout</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:10px">
          <button class="btn btn-secondary" id="export-md-btn" data-tooltip="Download the study sheet as Markdown">${icon('download')} Export .md</button>
          <button class="btn btn-secondary" id="print-btn" data-tooltip="Open a printable study sheet">${icon('print')} Print sheet</button>
        </div>
      </div>
    </div>
    <div class="img-viewer hidden" id="img-viewer">
      <div class="iv-zoom-bar">
        <button class="iv-zoom" id="iv-zoom-out" aria-label="Zoom out">${icon('minus')}</button>
        <button class="iv-zoom" id="iv-reset" aria-label="Reset zoom">${icon('refresh')}</button>
        <button class="iv-zoom" id="iv-zoom-in" aria-label="Zoom in">${icon('plus')}</button>
      </div>
      <button class="iv-close" id="iv-close">${icon('x')}</button>
      <button class="iv-nav iv-prev" id="iv-prev">${icon('chevronLeft')}</button>
      <img id="iv-img" alt="Viewing image" />
      <button class="iv-nav iv-next" id="iv-next">${icon('chevronRight')}</button>
      <div class="iv-caption" id="iv-caption"></div>
    </div>
  `

  const content = root.querySelector('#review-content')
  const fontControls = root.querySelector('#font-controls')
  const ttsBar = root.querySelector('#tts-bar')
  let viewerIndex = 0

  function applyView() {
    stopTts()
    if (view === 'gallery') {
      content.innerHTML = galleryHtml()
      content.classList.remove('summary-mode')
      fontControls.style.visibility = 'hidden'
      content.querySelectorAll('.gallery-item').forEach(item =>
        item.addEventListener('click', () => openViewer(parseInt(item.dataset.i, 10)))
      )
      root.querySelectorAll('.review-toggle [data-tab]').forEach(b =>
        b.classList.toggle('on', b.dataset.tab === view))
      return
    }
    if (!summary) {
      content.innerHTML = '<div class="reader-loading">Preparing your document…</div>'
      if (!nlpBuilding) {
        nlpBuilding = true
        setTimeout(() => { buildNlp(); nlpBuilding = false; applyView() }, 0)
      }
      return
    }
    if (view === 'summary') {
      content.innerHTML = summaryHtml()
      content.classList.add('summary-mode')
      fontControls.style.visibility = 'hidden'
    } else {
      content.innerHTML = fullHtml()
      content.classList.remove('summary-mode')
      applyScale()
      fontControls.style.visibility = 'visible'
    }
    attachSaveOnPress()
    // find-in-document lives in the Full text tab
    root.querySelector('#find-bar')?.classList.toggle('hidden', view !== 'full')
    if (view !== 'full') clearFind()
    root.querySelectorAll('.review-toggle [data-tab]').forEach(b =>
      b.classList.toggle('on', b.dataset.tab === view)
    )
  }

  /* Find in document: highlight matches inside Full text, step through them */
  const findBar = root.querySelector('#find-bar')
  const findInput = root.querySelector('#find-input')
  const findCount = root.querySelector('#find-count')
  let findMatches = []
  let findPos = -1

  function clearFind() {
    findMatches = []
    findPos = -1
    if (findCount) findCount.textContent = ''
    content.querySelectorAll('mark.find-hit, mark.find-current').forEach(m => {
      const parent = m.parentNode
      parent.replaceChild(document.createTextNode(m.textContent), m)
      parent.normalize()
    })
  }

  function runFind() {
    clearFind()
    const q = (findInput?.value || '').trim()
    if (q.length < 2) return
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) {
      const n = walker.currentNode
      if (n.nodeValue.toLowerCase().includes(q.toLowerCase())) nodes.push(n)
    }
    for (const node of nodes) {
      const text = node.nodeValue
      const frag = document.createDocumentFragment()
      let pos = 0
      const lower = text.toLowerCase()
      let at = lower.indexOf(q.toLowerCase())
      while (at !== -1) {
        frag.appendChild(document.createTextNode(text.slice(pos, at)))
        const mark = document.createElement('mark')
        mark.className = 'find-hit'
        mark.textContent = text.slice(at, at + q.length)
        frag.appendChild(mark)
        findMatches.push(mark)
        pos = at + q.length
        at = lower.indexOf(q.toLowerCase(), pos)
      }
      frag.appendChild(document.createTextNode(text.slice(pos)))
      node.parentNode.replaceChild(frag, node)
    }
    stepFind(0)
  }

  function stepFind(dir) {
    if (!findMatches.length) { if (findCount) findCount.textContent = '0/0'; return }
    findPos = dir === 0 ? 0 : (findPos + dir + findMatches.length) % findMatches.length
    findMatches.forEach((m, i) => m.classList.toggle('find-current', i === findPos))
    if (findCount) findCount.textContent = `${findPos + 1}/${findMatches.length}`
    findMatches[findPos]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  /* Long-press a paragraph to bank it into spaced repetition — the same
     store mistakes feed, so saved lines resurface as review cards. */
  function attachSaveOnPress() {
    let timer = null
    let firedFor = null
    content.querySelectorAll('[data-para]').forEach(p => {
      const start = e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        firedFor = null
        timer = setTimeout(async () => {
          firedFor = p
          try {
            const sentence = p.textContent.trim().slice(0, 300)
            const term = keyTermDefs.find(t => sentence.toLowerCase().includes(t.term.toLowerCase()))?.term
              || firstKeyPhrase(sentence)
            await upsertSrsFromMistake({ docId: doc.id, sentence, term, type: 'note' })
            p.classList.add('saved-flash')
            setTimeout(() => p.classList.remove('saved-flash'), 900)
            ctx.toast('Saved to your review deck ✦')
          } catch {
            ctx.toast('Could not save this line', true)
          }
        }, 550)
      }
      const cancel = () => { if (firedFor === null) clearTimeout(timer) }
      p.addEventListener('pointerdown', start)
      p.addEventListener('pointerup', cancel)
      p.addEventListener('pointerleave', cancel)
      p.addEventListener('pointercancel', cancel)
      p.addEventListener('contextmenu', e => { if (firedFor) e.preventDefault() })
    })
  }
  function firstKeyPhrase(sentence) {
    // fall back to the most meaningful capitalized/named phrase in the line
    const STOP = /^(The|This|That|These|Those|It|Its|In|At|On|And|But|For|With|When|After|Today|Just|Only|Most|Many|Both|Each|Such|Then|They|There)$/
    const words = sentence.split(/\s+/).slice(0, 6)
    // prefer a capitalized run that skips a leading stopword (e.g. "Just ... NASA")
    for (let i = 0; i < Math.min(3, words.length); i++) {
      const m = words.slice(i).join(' ').match(/^([A-Z][a-zA-Z'’-]+(?:\s+(?:of|the|de|van|von|da)?[A-Z][a-zA-Z'’-]+)*)/)
      if (m && m[1].length > 3 && !STOP.test(m[1].split(' ')[0])) {
        return m[1].split(' ').slice(0, 3).join(' ')
      }
    }
    return words.slice(0, 4).join(' ')
  }

  const reader = content
  function applyScale() {
    reader.style.fontSize = (15 * scale).toFixed(1) + 'px'
  }

  root.querySelectorAll('.review-toggle [data-tab]').forEach(b =>
    b.addEventListener('click', () => {
      view = b.dataset.tab
      saveSettings({ reviewerView: view })
      applyView()
    })
  )

  findInput?.addEventListener('input', () => runFind())
  findInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1) }
    if (e.key === 'Escape') { clearFind(); findInput.value = '' }
  })

  /* ── Image viewer ── */
  const viewer = root.querySelector('#img-viewer')
  function openViewer(i) {
    viewerIndex = i
    const img = images[i]
    root.querySelector('#iv-img').src = objectUrl(img)
    root.querySelector('#iv-caption').textContent = `Image ${i + 1} of ${images.length}${img.slideNumber ? ` · slide ${img.slideNumber}` : ''}`
    ivZoom.reset()
    viewer.classList.remove('hidden')
  }
  function closeViewer() { viewer.classList.add('hidden') }
  function stepViewer(dir) {
    viewerIndex = (viewerIndex + dir + images.length) % images.length
    openViewer(viewerIndex)
  }
  root.querySelector('#iv-close').addEventListener('click', closeViewer)
  root.querySelector('#iv-prev').addEventListener('click', () => stepViewer(-1))
  root.querySelector('#iv-next').addEventListener('click', () => stepViewer(1))
  viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer() })

  const ivImg = root.querySelector('#iv-img')
  const ivZoom = attachZoom(viewer, ivImg)
  root.querySelector('#iv-zoom-in').addEventListener('click', e => { e.stopPropagation(); ivZoom.zoomIn() })
  root.querySelector('#iv-zoom-out').addEventListener('click', e => { e.stopPropagation(); ivZoom.zoomOut() })
  root.querySelector('#iv-reset').addEventListener('click', e => { e.stopPropagation(); ivZoom.reset() })

  /* ── TTS ── */
  const playBtn = root.querySelector('#tts-play')
  const pauseBtn = root.querySelector('#tts-pause')
  const stopBtn = root.querySelector('#tts-stop')
  const rateEl = root.querySelector('#tts-rate')
  let ttsActive = false

  function setTtsUi(state) {
    playBtn.classList.toggle('hidden', state === 'playing')
    pauseBtn.classList.toggle('hidden', state !== 'playing')
    stopBtn.classList.toggle('hidden', state === 'idle')
    playBtn.innerHTML = icon(state === 'paused' ? 'play' : 'play')
  }

  function stopTts() {
    stop()
    ttsActive = false
    setTtsUi('idle')
    content.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'))
  }

  if (isSupported()) {
    playBtn.addEventListener('click', () => {
      if (ttsActive) { resume(); setTtsUi('playing'); return }
      const targets = readTargets[view === 'full' ? 'full' : 'summary']
      if (!targets.length) { ctx.toast('Nothing to read in this view'); return }
      ttsActive = true
      setTtsUi('playing')
      speak(targets, {
        rate: parseFloat(rateEl.value),
        onend: () => { ttsActive = false; setTtsUi('idle') },
        onindex: i => {
          // read-along: light up whatever is being spoken, in either view
          content.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'))
          if (view === 'full') {
            content.querySelectorAll('[data-para]')[i]?.classList.add('speaking')
          } else {
            content.querySelectorAll('[data-point]')[i]?.classList.add('speaking')
          }
        }
      })
    })
    pauseBtn.addEventListener('click', () => { pause(); setTtsUi('paused') })
    stopBtn.addEventListener('click', stopTts)
    rateEl.addEventListener('input', () => saveSettings({ ttsRate: parseFloat(rateEl.value) }))
  } else {
    ttsBar.classList.add('hidden')
  }

  root.querySelector('#font-minus').addEventListener('click', () => {
    scale = Math.max(0.85, +(scale - 0.1).toFixed(2))
    saveSettings({ readerScale: scale })
    applyScale()
  })
  root.querySelector('#font-plus').addEventListener('click', () => {
    scale = Math.min(1.5, +(scale + 0.1).toFixed(2))
    saveSettings({ readerScale: scale })
    applyScale()
  })

  root.querySelector('#back-btn').addEventListener('click', () => {
    stopTts()
    objectUrls.forEach(u => URL.revokeObjectURL(u))
    ctx.go('docdetail', doc.id)
  })
  root.querySelector('#quiz-btn').addEventListener('click', () => {
    stopTts()
    ctx.go('setup', doc.id)
  })
  root.querySelector('#export-md-btn').addEventListener('click', () => {
    exportSummary(doc)
    ctx.toast('Downloaded study sheet (.md)')
  })
  const pdfBtn = root.querySelector('#pdf-btn')
  pdfBtn.addEventListener('click', async () => {
    pdfBtn.disabled = true
    pdfBtn.textContent = 'Building PDF…'
    try {
      await exportPdfHandout(doc, { keyTermDefs, reviewQs })
      ctx.toast('PDF handout downloaded ✓')
    } catch {
      ctx.toast('Could not build the PDF', true)
    } finally {
      pdfBtn.disabled = false
      pdfBtn.innerHTML = `${icon('download')} Export PDF handout`
    }
  })
  root.querySelector('#print-btn').addEventListener('click', () => {
    if (!printStudySheet(doc)) ctx.toast('Allow pop-ups to print')
  })

  currentCleanup = () => {
    stopTts()
    objectUrls.forEach(u => URL.revokeObjectURL(u))
  }
  applyView()
}
