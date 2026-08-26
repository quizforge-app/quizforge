import { extractPdf } from './pdf.js'
import { extractDocx } from './docx.js'
import { extractPptx } from './pptx.js'

const TYPE_LABEL = { pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint', txt: 'Text', md: 'Markdown' }

export function detectType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'pptx') return 'pptx'
  if (ext === 'txt') return 'txt'
  if (ext === 'md' || ext === 'markdown') return 'md'
  return null
}

export function typeLabel(type) {
  return TYPE_LABEL[type] || type.toUpperCase()
}

export async function extractText(file) {
  const type = detectType(file.name)
  if (!type) {
    throw new Error('Unsupported file type. Please use PDF, DOCX, PPTX, TXT or MD files.')
  }
  let text
  if (type === 'txt' || type === 'md') {
    text = await file.text()
    if (type === 'md') {
      text = text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    }
  } else {
    const map = { pdf: extractPdf, docx: extractDocx, pptx: extractPptx }
    text = await map[type](file)
  }
  text = text
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { type, text }
}
