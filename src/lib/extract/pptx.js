let JSZip = null

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
}

export async function extractPptx(file) {
  if (!JSZip) JSZip = (await import('jszip')).default
  const buf = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10)
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10)
      return na - nb
    })

  if (!slideFiles.length) throw new Error('No slides found in this presentation.')

  const slides = []
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('string')
    const paragraphs = xml.split('</a:p>')
    const lines = paragraphs
      .map(p => {
        const runs = [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decodeXml(m[1]))
        return runs.join('').trim()
      })
      .filter(Boolean)
    if (lines.length) slides.push(lines.join('\n'))
  }

  const text = slides.join('\n\n')
  if (!text.trim()) throw new Error('Could not find any text in these slides.')
  return `Presentation with ${slides.length} slide${slides.length > 1 ? 's' : ''}.\n\n` + text
}
