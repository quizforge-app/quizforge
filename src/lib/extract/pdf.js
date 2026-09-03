let pdfjsLib = null
let workerSet = false

export async function extractPdf(file) {
  // Lazily load pdf.js only when a PDF is actually imported (keeps it out of
  // the initial bundle so the app starts fast).
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    workerSet = true
  }
  const buf = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: buf,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true
  })
  const doc = await loadingTask.promise

  const pages = []
  const total = doc.numPages
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let pageText = ''
    for (const item of content.items) {
      if (!item.str) continue
      if (pageText && !pageText.endsWith(' ') && !item.str.startsWith(' ')) pageText += ' '
      pageText += item.str
      if (item.hasEOL) pageText += '\n'
    }
    pages.push(pageText.trim())
    page.cleanup()
  }
  await loadingTask.destroy()

  const text = pages.filter(Boolean).join('\n\n')
  if (!text.trim()) {
    throw new Error('No selectable text found. This PDF may be a scanned image.')
  }
  return `PDF document, ${total} page${total > 1 ? 's' : ''}.\n\n` + text
}
