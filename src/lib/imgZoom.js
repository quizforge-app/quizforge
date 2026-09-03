// Adds pinch / wheel / drag zoom and double-tap to an image inside a fullscreen
// viewer. Returns { zoomIn, zoomOut, reset } so callers can wire control buttons.
// Designed to be attached once per viewer element.
export function attachZoom(viewer, img) {
  let scale = 1, tx = 0, ty = 0
  const pointers = new Map()
  let dragging = false, lastX = 0, lastY = 0
  let startDist = 0, startScale = 1

  function apply() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
    img.style.cursor = scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in'
  }

  function setScale(next) {
    next = Math.min(6, Math.max(1, next))
    if (next === 1) { tx = 0; ty = 0 }
    scale = next
    apply()
  }

  function reset() { setScale(1) }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function onWheel(e) {
    e.preventDefault()
    setScale(scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18))
  }

  function onPointerDown(e) {
    img.setPointerCapture?.(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()]
      startDist = dist(p1, p2)
      startScale = scale
      dragging = false
    } else if (pointers.size === 1 && scale > 1) {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()]
      const d = dist(p1, p2)
      if (startDist > 0) setScale(startScale * (d / startDist))
    } else if (dragging && scale > 1) {
      tx += e.clientX - lastX
      ty += e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      apply()
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId)
    if (pointers.size < 2) startDist = 0
    if (pointers.size === 0) dragging = false
  }

  function toggleZoom() { setScale(scale > 1 ? 1 : 2.5) }

  function onDblClick(e) { e.preventDefault(); toggleZoom() }

  // double-tap support (dblclick is unreliable on touch)
  let lastTap = 0
  function onTap(e) {
    if (e.pointerType !== 'touch') return
    const now = Date.now()
    if (now - lastTap < 300) { toggleZoom(); lastTap = 0 }
    else lastTap = now
  }

  viewer.addEventListener('wheel', onWheel, { passive: false })
  img.addEventListener('pointerdown', onPointerDown)
  img.addEventListener('pointermove', onPointerMove)
  img.addEventListener('pointerup', onPointerUp)
  img.addEventListener('pointercancel', onPointerUp)
  img.addEventListener('dblclick', onDblClick)
  img.addEventListener('pointerup', onTap)

  return { zoomIn: () => setScale(scale * 1.4), zoomOut: () => setScale(scale / 1.4), reset }
}
