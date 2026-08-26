import { qrcode } from 'qrcode-generator'

// Lightweight QR renderer — emits an inline SVG (no canvas, cheap on low-end devices).
export function renderQr(el, text) {
  el.innerHTML = ''
  try {
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    el.innerHTML = qr.createSvgTag(5, 1)
    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      svg.style.display = 'block'
    }
  } catch {
    el.innerHTML = '<p class="faint" style="font-size:13px">QR unavailable for this link.</p>'
  }
}
