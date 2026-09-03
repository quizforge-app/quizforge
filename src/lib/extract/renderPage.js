// Renders selected PDF pages to compact JPEG images so a multimodal model can
// "see" code listings, diagrams, charts and tables. Only pages that look
// visually rich (or the first couple of pages) are rendered, capped at maxPages.

let pdfjsLib = null
let workerUrl = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  if (!workerUrl) workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjsLib
}

// Cheap, text-only signals — evaluated before any image decode.
function isCodeLike(text) {
  const t = String(text || '')
  return /\b(function|def |class |import |export |public |private |protected |void |const |let |var |return |=>|print\(|console\.|SELECT |INSERT |UPDATE |DELETE |#include|std::|package |namespace |func |@Override|@[A-Z]\w+)\b/i.test(t)
}

function hasFigureKeyword(text) {
  return /\b(figure|fig\.|diagram|chart|graph|table|equation|flowchart|screenshot|plot|curve|matrix|algorithm|schema|illustration)\b/i.test(String(text || ''))
}

function shortLineRatio(text) {
  const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length < 4) return 0
  return lines.filter(l => l.length < 90).length / lines.length
}

// Expensive but conclusive: does this page actually paint a raster image?
async function pageHasImage(page) {
  try {
    const ops = await page.getOperatorList()
    const A = ops.fnArray
    let n = 0
    for (let k = 0; k < A.length; k++) {
      const op = A[k]
      if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintImageXObjectRepeat) n++
    }
    return n > 0
  } catch {
    return false
  }
}

// A page is worth screenshotting only if it holds something a question might
// depend on: a code listing, a figure/diagram reference in a visual block, or a
// real embedded image. Plain prose pages are skipped (their text is already
// extracted and fed to the authoring model, so a screenshot would be redundant).
async function worthScreenshot(page, text) {
  if (isCodeLike(text)) return true
  if (hasFigureKeyword(text) && shortLineRatio(text) > 0.6) return true
  return pageHasImage(page)
}

async function shrink(blob, maxDim = 1024, quality = 0.82) {
  const bmp = await createImageBitmap(blob)
  let { width, height } = bmp
  const scale = Math.min(1, maxDim / Math.max(width, height))
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0, width, height)
  bmp.close && bmp.close()
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
}

export async function renderPdfVisuals(file, { maxPages = 8 } = {}) {
  const pdfjs = await getPdfjs()
  const buf = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buf, isEvalSupported: false, disableFontFace: true, useSystemFonts: true })
  const doc = await loadingTask.promise
  const out = []
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      if (out.length >= maxPages) break
      const page = await doc.getPage(i)
      let pageText = ''
      try {
        const content = await page.getTextContent()
        let last = ''
        for (const item of content.items) {
          if (item.str == null) continue
          if (last && !last.endsWith(' ') && !item.str.startsWith(' ')) pageText += ' '
          pageText += item.str
          if (item.hasEOL) pageText += '\n'
          last = item.str
        }
      } catch { /* text extraction is best-effort */ }

      let keep = false
      try { keep = await worthScreenshot(page, pageText) } catch { keep = false }
      if (keep) {
        try {
          const scale = 1.4
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = Math.min(1800, Math.round(viewport.width))
          canvas.height = Math.min(2400, Math.round(viewport.height))
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          const png = await new Promise(res => canvas.toBlob(res, 'image/png'))
          if (png) {
            const blob = await shrink(png, 1024, 0.82)
            out.push({ blob, mime: 'image/jpeg', page: i, slideNumber: i })
          }
        } catch { /* skip unrenderable page */ }
      }
      page.cleanup && page.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }
  return out
}
