let currentUtterances = []
let onIndexCallback = null
let onEndCallback = null
let stopped = false

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(textList, { rate = 1, onindex = null, onend = null } = {}) {
  if (!isSupported()) return
  stop()
  stopped = false
  onIndexCallback = onindex
  onEndCallback = onend

  currentUtterances = textList.map((text, i) => {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.lang = navigator.language || 'en-US'
    if (i === textList.length - 1) {
      u.onend = () => {
        if (!stopped) onEndCallback?.()
      }
    }
    const originalStart = u.onstart
    return u
  })

  currentUtterances.forEach((u, i) => {
    u.addEventListener('start', () => {
      if (!stopped) onIndexCallback?.(i)
    })
  })

  currentUtterances.forEach(u => window.speechSynthesis.speak(u))
}

export function pause() {
  if (isSupported()) window.speechSynthesis.pause()
}

export function resume() {
  if (isSupported()) window.speechSynthesis.resume()
}

export function stop() {
  if (!isSupported()) return
  stopped = true
  window.speechSynthesis.cancel()
  currentUtterances = []
}
