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

/* ── Component helpers ── */

export function card(content, { style = '', cls = '' } = {}) {
  return `<div class="card ${cls}"${style ? ` style="${style}"` : ''}>${content}</div>`
}

export function statsRow(stats) {
  return `<div class="stats-row">${stats.map(s =>
    `<div class="stat"><div class="num">${s.value}</div><div class="lbl">${s.label}</div></div>`
  ).join('')}</div>`
}

export function chipRow(chips) {
  return `<div class="chip-row">${chips.join('')}</div>`
}

export function chip(label, { active = false, count = null, cls = '' } = {}) {
  const extra = count != null ? ` <span class="chip-count">${count}</span>` : ''
  return `<span class="chip ${active ? 'on' : ''} ${cls}">${label}${extra}</span>`
}

export function sectionTitle(text) {
  return `<div class="section-title">${text}</div>`
}

export function row(content, { tooltip = '', style = '', borderless = false } = {}) {
  const s = borderless ? `${style};border-bottom:none`.replace(/^;/, '') : style
  const tip = tooltip ? ` data-tooltip="${tooltip}"` : ''
  const sty = s ? ` style="${s}"` : ''
  return `<div class="row"${tip}${sty}>${content}</div>`
}

export function muted(text, { style = '', tag = 'p' } = {}) {
  const sty = style ? ` style="${style}"` : ''
  return `<${tag} class="muted"${sty}>${text}</${tag}>`
}

export function btn(label, { icon: iconName = null, cls = 'btn-primary', style = '', tooltip = '', id = '', attrs = '' } = {}) {
  const ico = iconName ? icon(iconName) : ''
  const tip = tooltip ? ` data-tooltip="${tooltip}"` : ''
  const sty = style ? ` style="${style}"` : ''
  const idAttr = id ? ` id="${id}"` : ''
  return `<button class="btn ${cls}"${idAttr}${tip}${sty}${attrs ? ' ' + attrs : ''}>${ico}${label}</button>`
}
