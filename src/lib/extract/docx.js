import mammoth from 'mammoth'

export async function extractDocx(file) {
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  const text = result.value || ''
  if (!text.trim()) throw new Error('This document appears to be empty.')
  return text
}
