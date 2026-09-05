import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll } from 'vitest'

if (typeof globalThis.localStorage === 'undefined') {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) }
  }
}

import { buildExamQuiz, countdownLabel, rankExamTopics } from '../src/lib/exam.js'
import { offlineMatch, parseExamState, buildDigest } from '../src/lib/llm/exam-ai.js'
import {
  saveExam, getExam, listExams, deleteExam,
  ensureDefaultAccount, setActiveAccount, clearAllData
} from '../src/lib/storage.js'

const DOC_A = {
  id: 'doc-prog',
  name: 'Programming Basics.pdf',
  type: 'pdf',
  text: [
    'Programming Basics: Variables and Functions',
    'A variable stores a value that a program can change later at runtime.',
    'Functions group reusable instructions and can accept parameters and return values.',
    'Loops repeat instructions until a condition is finally met by the program.',
    'Conditional statements branch the execution path of any program logic.'
  ].join('\n')
}
const DOC_B = {
  id: 'doc-sdlc',
  name: 'SDLC Notes.pdf',
  type: 'pdf',
  text: [
    'SDLC: The Software Development Life Cycle',
    'The design phase turns requirements into a blueprint for developers.',
    'Implementation is the phase where developers write the actual program code.',
    'Testing verifies that the built software matches the original requirements.',
    'Deployment delivers the finished software to its end users at last.'
  ].join('\n')
}

const EXAM = {
  id: 'exam-final',
  title: 'Midterm Exam',
  createdAt: Date.now(),
  announcement: 'Midterm covers programming basics and the SDLC phases',
  docIds: ['doc-prog', 'doc-sdlc'],
  topics: [
    { title: 'Programming Basics: Variables and Functions', docId: 'doc-prog', reason: 'Covered in Programming Basics.pdf' },
    { title: 'SDLC: The Software Development Life Cycle', docId: 'doc-sdlc', reason: 'Covered in SDLC Notes.pdf' }
  ],
  status: 'upcoming'
}

beforeAll(async () => {
  await ensureDefaultAccount()
})

describe('buildExamQuiz: multi-file exam quiz', () => {
  it('mixes questions from every matched file and attributes them', () => {
    const { questions, error } = buildExamQuiz(EXAM, [DOC_A, DOC_B], [], { count: 8 })
    expect(error).toBeNull()
    expect(questions.length).toBeGreaterThanOrEqual(6)
    const sources = new Set(questions.map(q => q.meta.docId))
    expect(sources.has('doc-prog')).toBe(true)
    expect(sources.has('doc-sdlc')).toBe(true)
    // every question is tagged so cross-doc mistake banking works
    expect(questions.every(q => q.meta.docId)).toBe(true)
    // static-renderable types only (the handout renders these)
    expect(questions.every(q => ['mcq', 'tf', 'fib', 'id', 'matching', 'ordering'].includes(q.type))).toBe(true)
  })

  it('is deterministic for the same exam id', () => {
    const a = buildExamQuiz(EXAM, [DOC_A, DOC_B], [], { count: 8 })
    const b = buildExamQuiz(EXAM, [DOC_A, DOC_B], [], { count: 8 })
    expect(a.questions.map(q => q.meta.sentence || q.stem)).toEqual(b.questions.map(q => q.meta.sentence || q.stem))
  })

  it('returns no_docs when nothing matched', () => {
    const r = buildExamQuiz(EXAM, [], [], { count: 8 })
    expect(r.error).toBe('no_docs')
  })
})

describe('offline keyword matching (exam chat fallback)', () => {
  const digest = buildDigest([DOC_A, DOC_B])
  const convo = text => [{ role: 'user', text }]

  it('matches docs by announcement keywords', () => {
    const state = offlineMatch(convo('The midterm covers programming basics and sdlc phases'), digest, { topics: [] })
    expect(state.matchedDocIds).toContain('doc-prog')
    expect(state.matchedDocIds).toContain('doc-sdlc')
    expect(state.reply.toLowerCase()).toContain('programming')
  })

  it('flags missing topics with no matching file', () => {
    const state = offlineMatch(convo('The exam also covers quantum entanglement'), digest, { topics: [] })
    expect(state.matchedDocIds).not.toContain('doc-prog')
    expect(state.missingTopics.join(' ')).toContain('quantum')
    expect(state.readyToCreate).toBe(false)
  })

  it('re-checks the announcement after uploads (multi-message conversation)', () => {
    // first message matches nothing new, then a related file arrives and the
    // wizard re-checks: the ORIGINAL announcement keywords still count
    const convo2 = [
      { role: 'user', text: 'The midterm covers programming basics' },
      { role: 'wizard', text: 'Got it.' },
      { role: 'user', text: 'I just uploaded new files for this exam — re-check coverage.' }
    ]
    const s1 = offlineMatch(convo2, digest, { topics: [] })
    expect(s1.matchedDocIds).toContain('doc-prog')
  })

  it('parses a structured AI reply with fenced JSON', () => {
    const reply = '```json\n{"reply":"Ready!","examTitle":"Midterm","examDate":"2026-09-20","topics":[{"title":"SDLC"}],"matchedDocIds":["doc-sdlc"],"missingTopics":[],"readyToCreate":true}\n```'
    const s = parseExamState(reply)
    expect(s.reply).toBe('Ready!')
    expect(s.examTitle).toBe('Midterm')
    expect(s.readyToCreate).toBe(true)
    expect(s.matchedDocIds).toEqual(['doc-sdlc'])
  })
})

describe('exam CRUD + countdown + topic ranking', () => {
  beforeAll(async () => {
    // earlier describes in this file may have switched/cleared accounts
    const acc = await ensureDefaultAccount()
    await setActiveAccount(acc.id)
  })

  it('round-trips an exam through the store', async () => {
    await saveExam(EXAM)
    const got = await getExam('exam-final')
    expect(got.title).toBe('Midterm Exam')
    expect(got.docIds).toEqual(['doc-prog', 'doc-sdlc'])
    const list = await listExams()
    expect(list.some(e => e.id === 'exam-final')).toBe(true)
    await deleteExam('exam-final')
    expect(await getExam('exam-final')).toBeNull()
  })

  it('labels countdowns correctly', () => {
    const day = 86400000
    expect(countdownLabel(Date.now() + 5 * day)).toBe('in 5 days')
    expect(countdownLabel(Date.now() + day)).toBe('tomorrow')
    expect(countdownLabel(Date.now() + 3600000)).toBe('today')
    expect(countdownLabel(Date.now() - 3 * day)).toBe('past')
    expect(countdownLabel(undefined)).toBe('')
  })

  it('ranks topics and boosts announcement mentions', () => {
    const ranked = rankExamTopics(EXAM, [DOC_A, DOC_B])
    expect(ranked.length).toBeGreaterThanOrEqual(2)
    const boosted = ranked.find(r => r.reason)
    expect(boosted).toBeTruthy()
  })
})
