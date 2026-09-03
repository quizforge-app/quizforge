import { extractText, detectType } from '../../lib/extract/index.js'
import { extractImages } from '../../lib/extract/images.js'
import { saveDoc, saveDocImages, listDocs, deriveFolders } from '../../lib/storage.js'
import { detectTopics } from '../../lib/topics.js'
import { oneLineSummary } from '../../lib/summarize.js'
import { transcribeImage } from '../../lib/llm/transcribe.js'
import { hasApiKey } from '../../lib/llm/gemini.js'
import { icon } from '../icons.js'
import { esc, sectionTitle, chipRow, chip, muted } from '../helpers.js'
import { dropzoneArt } from '../art.js'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(new Error('read_failed'))
    fr.readAsDataURL(file)
  })
}

// Downscale a photo to a sane resolution and re-encode as JPEG so we upload far
// less data to Gemini and store far less on device. Sending a 12MP original as
// base64 is slow, memory-heavy, and usually OOMs low-end Android.
async function downscaleImage(file, maxDim = 1600, quality = 0.82) {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const c = canvas.getContext('2d')
    c.drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    return blob || file
  } catch {
    return file
  }
}

export async function render(root, ctx) {
  const folders = deriveFolders(await listDocs())
  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Back to library">${icon('chevronLeft')}</button>
      <h2>Add Document</h2>
      <button class="icon-btn" id="theme-btn" data-tooltip="${ctx.state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${ctx.state.theme === 'dark' ? icon('sun') : icon('moon')}</button>
    </header>
    <div class="screen">
      <div class="seg" id="mode-seg" style="width:100%;margin-bottom:14px">
        <button data-mode="file" class="on">${icon('upload')} File</button>
        <button data-mode="paste">${icon('pencil')} Paste</button>
        <button data-mode="photo">${icon('camera')} Photo</button>
      </div>

      <div id="drop-stage">
        <div class="dropzone" id="dropzone" data-tooltip="PDF, DOCX, PPTX, TXT or MD — up to 50MB">
          <div class="dropzone-illust">${dropzoneArt}</div>
          <h3>Tap to choose a file</h3>
          <p>or drag &amp; drop it here</p>
          <input type="file" id="file-input" accept=".pdf,.docx,.pptx,.txt,.md" aria-label="Choose a document file" hidden />
        </div>
        <div class="fmt-row">
          ${chipRow(['PDF', 'DOCX', 'PPTX', 'TXT', 'MD'].map(f => chip(f, { active: true })))}
        </div>
        ${muted('Your file is processed locally on this device.<br/>Text is extracted and stored locally.', { style: 'font-size:12.5px;margin-top:22px;line-height:1.6', tag: 'p' })}
      </div>

      <div id="paste-stage" class="hidden">
        <div class="card">
          <label class="section-title" for="paste-name" style="margin:0 0 8px">Document name</label>
          <input class="text-input" id="paste-name" maxlength="80" placeholder="e.g. Lecture 4 notes" />
          <label class="section-title" for="paste-area" style="margin:16px 0 8px">Paste your notes or text</label>
          <textarea id="paste-area" class="text-area" placeholder="Paste the text you want to study here…" rows="10"></textarea>
        </div>
        <button class="btn btn-primary" id="paste-save" style="margin-top:18px">${icon('check')} Save to Library</button>
        <button class="btn btn-secondary" id="paste-back" style="margin-top:10px;width:100%">Back</button>
      </div>

      <div id="photo-stage" class="hidden">
        <div class="photo-opts">
          <button class="photo-opt" id="photo-take" data-tooltip="Use your camera">
            <div class="photo-opt-ico">${icon('camera')}</div>
            <div class="photo-opt-label">Take a photo</div>
            <div class="photo-opt-sub">single camera shot</div>
          </button>
          <button class="photo-opt" id="photo-choose" data-tooltip="Pick from your gallery">
            <div class="photo-opt-ico">${icon('images')}</div>
            <div class="photo-opt-label">Choose photos</div>
            <div class="photo-opt-sub">one or more</div>
          </button>
        </div>
        <input type="file" id="photo-capture-input" accept="image/*" capture aria-label="Take a photo" hidden />
        <input type="file" id="photo-input" accept="image/*" multiple aria-label="Choose photos" hidden />
        ${muted('Gemini reads the text from your photo(s),<br/>then turns it into a study set. Try a clear, flat shot.', { style: 'font-size:12.5px;margin-top:22px;line-height:1.6', tag: 'p' })}
      </div>

      <div id="progress-stage" class="hidden">
        <h3 class="center" id="extract-filename" style="margin-top:8px"></h3>
        <div class="extract-steps" id="steps"></div>
      </div>

      <div id="result-stage" class="hidden">
        <div class="card" style="margin-top:10px">
          <label class="section-title" for="doc-name-input" style="margin:0 0 8px">Document name</label>
          <input class="text-input" id="doc-name-input" maxlength="80" />
          <label class="section-title" for="doc-folder-input" style="margin:16px 0 8px">${icon('folder')} Folder <span style="text-transform:none;font-weight:500;color:var(--text-faint)">(optional)</span></label>
          <input class="text-input" id="doc-folder-input" list="folder-list" maxlength="40" placeholder="e.g. Biology 101" autocomplete="off" />
          <datalist id="folder-list">${folders.map(f => `<option value="${esc(f)}"></option>`).join('')}</datalist>
          <label class="section-title" for="doc-tags-input" style="margin:16px 0 8px">${icon('tag')} Tags <span style="text-transform:none;font-weight:500;color:var(--text-faint)">(comma separated)</span></label>
          <input class="text-input" id="doc-tags-input" maxlength="120" placeholder="exam, chapter 3, vocab" autocomplete="off" />
          <div class="row" style="padding:14px 0 4px">
            <div><div class="label">Words extracted</div></div>
            <div class="label good-text" id="word-count">—</div>
          </div>
          <div id="topics-row" style="padding:4px 0 12px;border-bottom:1px solid var(--border)"></div>
          <label class="section-title" style="margin:16px 0 8px">Preview</label>
          <div class="preview-box" id="preview-box"></div>
        </div>
        <button class="btn btn-primary" id="save-doc-btn" style="margin-top:18px">${icon('check')} Save to Library</button>
        <button class="btn btn-secondary" id="discard-btn" style="margin-top:10px;width:100%">Discard &amp; start over</button>
      </div>
    </div>
  `

  const dropzone = root.querySelector('#dropzone')
  let fileInput = root.querySelector('#file-input')
  const modeSeg = root.querySelector('#mode-seg')
  const stages = {
    drop: root.querySelector('#drop-stage'),
    paste: root.querySelector('#paste-stage'),
    photo: root.querySelector('#photo-stage'),
    progress: root.querySelector('#progress-stage'),
    result: root.querySelector('#result-stage')
  }
  let extracted = null

  function showStage(name) {
    for (const [key, el] of Object.entries(stages)) el.classList.toggle('hidden', key !== name)
  }

  function setMode(mode) {
    modeSeg.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === mode))
    showStage(mode)
  }

  modeSeg.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)))

  dropzone.addEventListener('click', () => fileInput.click())
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover') })
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'))
  dropzone.addEventListener('drop', e => {
    e.preventDefault()
    dropzone.classList.remove('dragover')
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0])
  })

  function requirePhotoKey(then) {
    if (!hasApiKey()) { ctx.toast('Add a Gemini key in Settings to read photos', true); return }
    then()
  }
  root.querySelector('#photo-take').addEventListener('click', () => {
    requirePhotoKey(() => root.querySelector('#photo-capture-input').click())
  })
  root.querySelector('#photo-capture-input').addEventListener('change', () => {
    const f = root.querySelector('#photo-capture-input').files[0]
    if (f) handlePhoto([f])
    root.querySelector('#photo-capture-input').value = ''
  })
  root.querySelector('#photo-choose').addEventListener('click', () => {
    requirePhotoKey(() => root.querySelector('#photo-input').click())
  })
  root.querySelector('#photo-input').addEventListener('change', () => {
    const files = [...root.querySelector('#photo-input').files].filter(f => f.type.startsWith('image/'))
    if (files.length) handlePhoto(files)
    root.querySelector('#photo-input').value = ''
  })

  root.querySelector('#paste-save').addEventListener('click', () => {
    const text = root.querySelector('#paste-area').value.trim()
    if (text.length < 20) { ctx.toast('Paste a bit more text to study', true); return }
    showExtracted({ name: root.querySelector('#paste-name').value.trim() || 'Pasted notes', type: 'txt', text, images: [] })
  })
  root.querySelector('#paste-back').addEventListener('click', () => setMode('file'))

  async function handleFile(file) {
    if (!detectType(file.name)) {
      ctx.toast('Only PDF, DOCX, PPTX, TXT or MD files are supported', true)
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      ctx.toast('File is too large (max 50MB)', true)
      return
    }

    stages.progress.classList.remove('hidden')
    stages.drop.classList.add('hidden')
    root.querySelector('#extract-filename').textContent = file.name
    const stepsEl = root.querySelector('#steps')
    const steps = [['Reading file…'], ['Extracting text…'], ['Saving locally…']]
    stepsEl.innerHTML = steps.map(([label]) => `
      <div class="step-item">
        <div class="step-dot">${icon('check')}</div>
        <div class="step-label">${label}</div>
      </div>`).join('')
    const stepItems = [...stepsEl.querySelectorAll('.step-item')]

    try {
      stepItems[0].classList.add('active')
      await new Promise(r => setTimeout(r, 250))
      stepItems[0].classList.replace('active', 'done')
      stepItems[1].classList.add('active')

      const { type, text } = await extractText(file)
      const images = await extractImages(file, type)

      stepItems[1].classList.replace('active', 'done')
      stepItems[2].classList.add('active')

      await new Promise(r => setTimeout(r, 350))
      stepItems[2].classList.replace('active', 'done')
      showExtracted({ name: file.name.replace(/\.(pdf|docx|pptx|txt|md|markdown)$/i, ''), type, text, images, file })
    } catch (err) {
      console.error(err)
      ctx.toast(err.message || 'Could not read this file', true)
      showStage('drop')
      fileInput.value = ''
      fileInput = root.querySelector('#file-input')
      bindInput()
    }
  }

  async function handlePhoto(files) {
    const images = [...files].filter(f => f.type.startsWith('image/'))
    if (!images.length) { ctx.toast('Choose image files', true); return }
    const n = images.length
    stages.progress.classList.remove('hidden')
    stages.photo.classList.add('hidden')
    root.querySelector('#extract-filename').textContent = n === 1 ? (images[0].name || 'Photo') : `${n} photos`
    const stepsEl = root.querySelector('#steps')
    stepsEl.innerHTML = `
      <div class="step-item active"><div class="step-dot">${icon('check')}</div><div class="step-label">Reading ${n} image${n === 1 ? '' : 's'}…</div></div>
      <div class="step-item"><div class="step-dot">${icon('check')}</div><div class="step-label">Transcribing with Gemini…</div></div>`
    const stepItems = [...stepsEl.querySelectorAll('.step-item')]
    try {
      const parts = []
      const blobs = []
      for (let i = 0; i < n; i++) {
        try {
          const small = await downscaleImage(images[i])
          blobs.push(small)
          const dataUrl = await fileToDataUrl(small)
          const text = await transcribeImage(dataUrl, { maxOutputTokens: 4096 })
          if (text && text.trim()) parts.push(text.trim())
        } catch (e) {
          console.warn('photo transcribe failed', e)
        }
      }
      stepItems[1].classList.add('active')
      stepItems[1].classList.replace('active', 'done')
      stepItems[0].classList.replace('active', 'done')
      const combined = parts.join('\n\n')
      if (!combined.trim()) throw new Error('No readable text found in those images')
      showExtracted({
        name: (images[0].name || 'Photo notes').replace(/\.[^.]+$/, '') || 'Photo notes',
        type: 'image',
        text: combined,
        images: blobs.map((b, i) => ({ blob: b, mimeType: b.type || 'image/jpeg', index: i, slideNumber: i + 1 })),
        file: null
      })
    } catch (err) {
      console.error(err)
      ctx.toast(err.message || 'Could not read these photos', true)
      showStage('photo')
    }
  }

  function bindInput() {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFile(fileInput.files[0])
    })
  }

  function showExtracted({ name, type, text, images = [], file = null }) {
    extracted = { name, type, text, images, file }
    const words = (text.match(/\S+/g) || []).length
    const { topics } = detectTopics(text)
    extracted.topics = topics
    const tldrLine = oneLineSummary(text)

    root.querySelector('#doc-name-input').value = extracted.name
    root.querySelector('#word-count').textContent = words.toLocaleString()
    const imgLine = images.length ? ` · ${images.length} image${images.length === 1 ? '' : 's'}` : ''
    const wcLabel = root.querySelector('#word-count').parentElement.querySelector('.label')
    if (wcLabel) wcLabel.textContent = `Words extracted${imgLine}`
    const topicsEl = root.querySelector('#topics-row')
    if (topicsEl) {
      topicsEl.innerHTML = `
        ${tldrLine ? `<div class="tldr-line">${icon('zap')} ${esc(tldrLine)}</div>` : ''}
        ${topics.length
          ? `<div class="label" style="margin-bottom:8px">Detected topics</div><div class="chip-row">${topics.slice(0, 6).map(t => `<span class="chip">${esc(t.title)} <span class="chip-count">${t.count}</span></span>`).join('')}${topics.length > 6 ? `<span class="chip">+${topics.length - 6} more</span>` : ''}</div>`
          : `<div class="sub">No distinct topics detected — questions will cover the whole document.</div>`}`
    }
    root.querySelector('#preview-box').textContent = text.slice(0, 600) + (text.length > 600 ? '…' : '')

    setTimeout(() => showStage('result'), 300)
  }

  root.querySelector('#save-doc-btn').addEventListener('click', async () => {
    if (!extracted) return
    const name = root.querySelector('#doc-name-input').value.trim() || 'Untitled document'
    const folder = root.querySelector('#doc-folder-input').value.trim() || null
    const tags = root.querySelector('#doc-tags-input').value
      .split(',').map(t => t.trim()).filter(Boolean).slice(0, 12)
    const doc = await saveDoc({ name, type: extracted.type, text: extracted.text, topics: extracted.topics || [], folder, tags, original: extracted.file })
    if (extracted.images?.length) {
      await saveDocImages(doc.id, extracted.images.map((img, i) => ({ ...img, index: i })))
    }
    ctx.toast('Document saved ✓')
    ctx.go('setup', doc.id)
  })

  root.querySelector('#discard-btn').addEventListener('click', () => {
    extracted = null
    setMode('file')
  })

  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('library'))
  root.querySelector('#theme-btn').addEventListener('click', () => ctx.toggleTheme())
}
