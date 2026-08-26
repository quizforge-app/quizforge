import { icon } from './icons.js'

export function typeIcon(type) {
  return { pdf: 'fileText', docx: 'fileText', pptx: 'fileText' }[type] || 'fileText'
}

export function typeLabel(type) {
  return { pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint', txt: 'Text', md: 'Markdown' }[type] || String(type || '').toUpperCase()
}

export function scorePill(percent) {
  if (percent >= 80) return 'high'
  if (percent >= 50) return 'mid'
  return 'low'
}

export function fmtDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function dayLabel(ts) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function esc(s) {
  const div = document.createElement('div')
  div.textContent = String(s ?? '')
  return div.innerHTML
}

export function blankHtml(stem) {
  return esc(stem).replace(/\u0000BLANK\u0000/g, '<span class="blank-slot">&nbsp;</span>')
}
