import { describe, it, expect } from 'vitest'
import { newState, nextState, isDue, GRADES } from '../src/lib/srs.js'

const NOW = 1700000000000
const DAY = 86400000

describe('newState', () => {
  it('starts unscheduled and due immediately', () => {
    const s = newState(NOW)
    expect(s.ease).toBe(2.5)
    expect(s.intervalDays).toBe(0)
    expect(s.dueAt).toBe(NOW)
    expect(s.reps).toBe(0)
    expect(isDue(s, NOW)).toBe(true)
  })
})

describe('nextState — first review', () => {
  it('good schedules for tomorrow', () => {
    const s = nextState(newState(NOW), GRADES.good, NOW)
    expect(s.reps).toBe(1)
    expect(s.intervalDays).toBe(1)
    expect(s.dueAt).toBe(NOW + DAY)
    expect(s.lapses).toBe(0)
  })
  it('easy jumps to 3 days and raises ease', () => {
    const s = nextState(newState(NOW), GRADES.easy, NOW)
    expect(s.intervalDays).toBe(3)
    expect(s.ease).toBeCloseTo(2.65)
  })
  it('hard schedules half a day and lowers ease slightly', () => {
    const s = nextState(newState(NOW), GRADES.hard, NOW)
    expect(s.intervalDays).toBe(0.5)
    expect(s.ease).toBeCloseTo(2.45)
    expect(s.dueAt).toBe(NOW + 0.5 * DAY)
  })
})

describe('nextState — lapse', () => {
  it('again resets interval, drops ease, counts lapse', () => {
    const good1 = nextState(newState(NOW), GRADES.good, NOW)
    const lapsed = nextState(good1, GRADES.again, NOW + DAY)
    expect(lapsed.intervalDays).toBe(0)
    expect(lapsed.reps).toBe(0)
    expect(lapsed.lapses).toBe(1)
    expect(lapsed.ease).toBeCloseTo(2.3)
    expect(lapsed.dueAt).toBe(NOW + DAY + 10 * 60000)
    expect(isDue(lapsed, NOW + DAY + 11 * 60000)).toBe(true)
  })

  it('ease floors at 1.3 after repeated failures', () => {
    let s = newState(NOW)
    for (let i = 0; i < 10; i++) s = nextState(s, GRADES.again, NOW + i * 60000)
    expect(s.ease).toBe(1.3)
  })
})

describe('nextState — growth over successful reviews', () => {
  it('good chains multiply intervals by ease', () => {
    let s = newState(NOW)
    s = nextState(s, GRADES.good, NOW)                    // 1 day
    s = nextState(s, GRADES.good, s.lastReviewedAt)       // 1 * 2.5 = 2.5
    s = nextState(s, GRADES.good, s.lastReviewedAt)       // 2.5 * 2.5 = 6.25
    expect(s.intervalDays).toBeCloseTo(6.25)
  })

  it('easy chains grow faster than good chains', () => {
    let a = newState(NOW)
    a = nextState(a, GRADES.good, NOW)
    a = nextState(a, GRADES.good, NOW)
    let b = newState(NOW)
    b = nextState(b, GRADES.easy, NOW)
    b = nextState(b, GRADES.easy, NOW)
    expect(b.intervalDays).toBeGreaterThan(a.intervalDays)
  })

  it('hard keeps intervals short', () => {
    let s = newState(NOW)
    s = nextState(s, GRADES.good, NOW)
    s = nextState(s, GRADES.hard, s.lastReviewedAt)
    expect(s.intervalDays).toBeLessThan(2)
  })

  it('ease never exceeds the cap of 3.0', () => {
    let s = newState(NOW)
    for (let i = 0; i < 20; i++) s = nextState(s, GRADES.easy, NOW)
    expect(s.ease).toBe(3.0)
  })
})
