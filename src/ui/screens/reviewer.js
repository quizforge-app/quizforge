import { getDoc, listDocImages, loadSettings, saveSettings } from '../../lib/storage.js'
import { detectTopics } from '../../lib/topics.js'
import { sentences } from '../../lib/textproc.js'
import { summarizeDoc } from '../../lib/summarize.js'
import { speak, pause, resume, stop, isSupported } from '../../lib/tts.js'
import { icon } from '../icons.js'
import { esc, typeLabel } from '../helpers.js'
import { exportSummary, printStudySheet } from '../../lib/export.js'

function chunkParas(sentenceList, size = 3) {
  const out = []
  for (let i = 0; i < sentenceList.length; i += size) {
    out.push(sentenceList.slice(i, i + size).join(' '))
  }
  return out
}

export async function render(root, ctx) {
  const doc = await getDoc(ctx.state.currentDocId)
  if (!doc) { ctx.go('library'); return }

  const settings = loadSettings()
  let scale = settings.readerScale || 1
  let view = settings.reviewerView || 'summary'
  if (view === 'gallery') view = 'summary'

  const sents = sentences(doc.text)
  const { topics, membership } = detectTopics(doc.text)
  const summary = summarizeDoc(doc.text)
  const images = await listDocImages(doc.id)
  const objectUrls = new Map()

  const sections = []
  if (topics.length && sents.length) {
    const buckets = new Map(topics.map(t => [t.title, []]))
    const general = []
    for (const s of sents) {
      const t = membership.get(s)
      if (t && buckets.has(t)) buckets.get(t).push(s)
      else general.push(s)
    }
    if (general.length >= 2) sections.push({ title: 'Overview', paras: chunkParas(general) })
    for (const t of topics) {
      const ss = buckets.get(t.title)
      if (ss?.length) sections.push({ title: t.title, paras: chunkParas(ss) })
    }
  } else {
    sections.push({ title: null, paras: chunkParas(sents.length ? sents : doc.text.split(/(?<=[.!?])\s+/)) })
  }

  const readTargets = {
    summary: summary.sections.flatMap(s => s.points),
    full: sections.flatMap(s => s.paras)
  }

  function summaryHtml() {
    if (!summary.tldr.length) {
      return `<div class="empty-state"><h3>Not enough to summarize</h3><p>This document has too little readable text. Try the Full text tab.</p></div>`
    }
    return `
      <div class="sum-tldr">
        <div class="sum-label">${icon('zap')} In a nutshell</div>
        ${summary.tldr.map(p => `<p>${esc(p)}</p>`).join('')}
      </div>
      <div class="section-title">Part by part — ${summary.sections.length} section${summary.sections.length === 1 ? '' : 's'}</div>
      ${summary.sections.map((sec, i) => `
        <div class="sum-section">
          <div class="sum-head">
            <span class="sum-num">${String(i + 1).padStart(2, '0')}</span>
            <h3>${esc(sec.title)}</h3>
            <span class="chip-count">${sec.sentenceCount} sentence${sec.sentenceCount === 1 ? '' : 's'}</span>
          </div>
          <ul class="sum-points">
            ${sec.points.map(p => `<li>${esc(p)}</li>`).join('')}
          </ul>
          ${sec.terms.length ? `<div class="chip-row sum-terms">${sec.terms.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
      <p class="sum-note">Key points extracted from your document — open <strong>Full text</strong> to read everything.</p>
    `
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
    { id: 'summary', label: 'Summary', icon: 'zap' },
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
        <button class="icon-btn" id="tts-play" data-tooltip="Read aloud">${icon('play')}</button>
        <button class="icon-btn hidden" id="tts-pause" data-tooltip="Pause">${icon('timer')}</button>
        <button class="icon-btn hidden" id="tts-stop" data-tooltip="Stop">${icon('x')}</button>
        <div class="tts-rate">
          <span class="faint" style="font-size:11px">Speed</span>
          <input type="range" id="tts-rate" min="0.8" max="1.5" step="0.1" value="${settings.ttsRate || 1}" />
        </div>
      </div>
      <article class="reader" id="review-content"></article>
      <div class="reader-actions">
        <button class="btn btn-primary" id="quiz-btn">${icon('play')} Quiz me on this</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:10px">
          <button class="btn btn-secondary" id="export-md-btn" data-tooltip="Download the study sheet as Markdown">${icon('download')} Export .md</button>
          <button class="btn btn-secondary" id="print-btn" data-tooltip="Open a printable study sheet">${icon('print')} Print sheet</button>
        </div>
      </div>
    </div>
    <div class="img-viewer hidden" id="img-viewer">
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
    if (view === 'summary') {
      content.innerHTML = summaryHtml()
      content.classList.add('summary-mode')
      fontControls.style.visibility = 'hidden'
    } else if (view === 'gallery') {
      content.innerHTML = galleryHtml()
      content.classList.remove('summary-mode')
      fontControls.style.visibility = 'hidden'
      content.querySelectorAll('.gallery-item').forEach(item =>
        item.addEventListener('click', () => openViewer(parseInt(item.dataset.i, 10)))
      )
    } else {
      content.innerHTML = fullHtml()
      content.classList.remove('summary-mode')
      applyScale()
      fontControls.style.visibility = 'visible'
    }
    root.querySelectorAll('.review-toggle [data-tab]').forEach(b =>
      b.classList.toggle('on', b.dataset.tab === view)
    )
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

  /* ── Image viewer ── */
  const viewer = root.querySelector('#img-viewer')
  function openViewer(i) {
    viewerIndex = i
    const img = images[i]
    root.querySelector('#iv-img').src = objectUrl(img)
    root.querySelector('#iv-caption').textContent = `Image ${i + 1} of ${images.length}${img.slideNumber ? ` · slide ${img.slideNumber}` : ''}`
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
          if (view === 'full') {
            content.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'))
            content.querySelectorAll('[data-para]')[i]?.classList.add('speaking')
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
  root.querySelector('#print-btn').addEventListener('click', () => {
    if (!printStudySheet(doc)) ctx.toast('Allow pop-ups to print')
  })

  applyView()
}
