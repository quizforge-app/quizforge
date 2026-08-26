let tipEl = null
let showTimer = null
let hideTimer = null
let currentTarget = null

function ensureEl() {
  if (tipEl) return tipEl
  tipEl = document.createElement('div')
  tipEl.className = 'tooltip'
  tipEl.setAttribute('role', 'tooltip')
  tipEl.hidden = true
  document.body.appendChild(tipEl)
  return tipEl
}

function getText(target) {
  return target.getAttribute('data-tooltip') || target.getAttribute('aria-label') || ''
}

function position(target) {
  const el = ensureEl()
  const rect = target.getBoundingClientRect()
  const pad = 8
  const gap = 8
  el.style.maxWidth = '220px'
  const tipRect = el.getBoundingClientRect()
  let top = rect.top - tipRect.height - gap
  let left = rect.left + rect.width / 2 - tipRect.width / 2
  let placement = 'top'
  if (top < pad) {
    top = rect.bottom + gap
    placement = 'bottom'
  }
  left = Math.max(pad, Math.min(left, innerWidth - tipRect.width - pad))
  el.style.left = left + 'px'
  el.style.top = top + 'px'
  el.dataset.placement = placement
}

function show(target) {
  const text = getText(target)
  if (!text) return
  if (matchMedia('(pointer: coarse)').matches && !target.matches(':focus-visible')) return
  const el = ensureEl()
  el.textContent = text
  el.hidden = false
  requestAnimationFrame(() => {
    el.classList.add('show')
    position(target)
  })
  currentTarget = target
}

function hide() {
  if (!tipEl) return
  tipEl.classList.remove('show')
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (tipEl) tipEl.hidden = true
  }, 140)
  currentTarget = null
}

function fromElement(e) {
  return e && e.target instanceof Element ? e.target : null
}

export function initTooltips() {
  ensureEl()
  document.addEventListener('mouseenter', e => {
    const t = fromElement(e)?.closest('[data-tooltip], [data-tip]')
    if (!t) return
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    showTimer = setTimeout(() => show(t), 280)
  }, true)
  document.addEventListener('mouseleave', e => {
    const t = fromElement(e)?.closest('[data-tooltip], [data-tip]')
    if (!t) return
    clearTimeout(showTimer)
    hide()
  }, true)
  document.addEventListener('focusin', e => {
    const t = fromElement(e)?.closest('[data-tooltip], [data-tip]')
    if (t) show(t)
  })
  document.addEventListener('focusout', e => {
    const t = fromElement(e)?.closest('[data-tooltip], [data-tip]')
    if (t) hide()
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hide()
  })
  addEventListener('scroll', hide, { passive: true })
  addEventListener('resize', hide)
}

export function setTooltip(el, text) {
  if (!el) return
  if (text) el.setAttribute('data-tooltip', text)
  else el.removeAttribute('data-tooltip')
}
