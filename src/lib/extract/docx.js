export async function extractDocx(file) {
  const mammoth = (await import('mammoth')).default
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  const text = result.value || ''
  if (!text.trim()) throw new Error('This document appears to be empty.')
  return text
}
