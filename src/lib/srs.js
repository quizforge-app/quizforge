// SM-2 lite spaced repetition. Pure functions — no storage, no dom.

export const GRADES = { again: 0, hard: 1, good: 2, easy: 3 }

const MIN_EASE = 1.3
const MAX_EASE = 3.0
const DAY_MS = 86400000

export function newState(now = Date.now()) {
  return {
    ease: 2.5,
    intervalDays: 0,
    dueAt: now,
    reps: 0,
    lapses: 0,
    lastReviewedAt: now
  }
}

function clampEase(e) {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, e))
}

// grade: 'again' | 'hard' | 'good' | 'easy'
export function nextState(state, grade, now = Date.now()) {
  const s = { ...(state || newState(now)), lastReviewedAt: now }
  const ease = s.ease ?? 2.5
  const interval = s.intervalDays ?? 0

  if (grade === GRADES.again || grade === 'again') {
    s.ease = clampEase(ease - 0.2)
    s.lapses = (s.lapses || 0) + 1
    s.intervalDays = 0
    s.dueAt = now + 10 * 60000 // relearn in 10 minutes
    s.reps = 0
    return s
  }

  const reps = (s.reps || 0) + 1
  let nextInterval
  let nextEase = ease

  if (grade === GRADES.hard || grade === 'hard') {
    nextEase = clampEase(ease - 0.05)
    nextInterval = reps === 1 ? 0.5 : Math.max(1, interval * 1.2)
  } else if (grade === GRADES.easy || grade === 'easy') {
    nextEase = clampEase(ease + 0.15)
    nextInterval = reps === 1 ? 3 : Math.max(1, interval * ease * 1.3)
  } else {
    // good
    nextInterval = reps === 1 ? 1 : Math.max(1, interval * ease)
  }

  s.ease = nextEase
  s.reps = reps
  s.intervalDays = Math.round(nextInterval * 100) / 100
  s.dueAt = now + s.intervalDays * DAY_MS
  return s
}

export function isDue(state, now = Date.now()) {
  if (!state) return true
  return (state.dueAt ?? 0) <= now
}
