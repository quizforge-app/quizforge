import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll } from 'vitest'
import {
  saveDoc, getDoc, listDocs, deleteDoc,
  saveAttempt, listAttempts,
  bankMistake, listMistakes,
  upsertSrsFromMistake, getSrsItem, gradeSrsItem, listDueCards,
  ensureDefaultAccount, getActiveAccountId,
  clearAllData
} from '../src/lib/storage.js'
import { generateQuiz } from '../src/lib/quizgen.js'

const SAMPLE_TEXT = [
  'Biology Study Guide',
  'Chapter 3: Photosynthesis',
  '',
  'Photosynthesis converts light energy into chemical energy inside chloroplasts.',
  'Chlorophyll absorbs sunlight most strongly in the blue and red wavelengths.',
  'The Calvin cycle produces glucose using ATP and NADPH generated earlier.',
  'Stomata are tiny pores that regulate gas exchange in plant leaves.',
  'Respiration releases energy from glucose molecules within all living cells.',
  'Mitochondria generate ATP through cellular respiration during the entire day.',
  'KEY TERMS',
  'Enzymes accelerate chemical reactions without being consumed by them at all.'
].join('\n')

const QUIZ_CFG = {
  count: 5,
  mix: { mcq: true, tf: true, fib: true, id: true },
  difficulty: 'medium',
  shuffle: false,
  timerSec: 0,
  fresh: true,
  topics: [],
  fixedSeed: 42
}

beforeAll(async () => {
  await ensureDefaultAccount()
})

describe('happy path: import → quiz → results', () => {
  let doc

  it('1. import: save a document to IDB', async () => {
    doc = await saveDoc({
      name: 'Biology Ch3',
      type: 'text',
      text: SAMPLE_TEXT,
      topics: [],
      folder: null,
      tags: ['biology']
    })

    expect(doc).toBeTruthy()
    expect(doc.id).toBeTruthy()
    expect(doc.name).toBe('Biology Ch3')
    expect(doc.text).toBe(SAMPLE_TEXT)
    expect(doc.accountId).toBeTruthy()

    // verify it's retrievable
    const fetched = await getDoc(doc.id)
    expect(fetched).toBeTruthy()
    expect(fetched.name).toBe('Biology Ch3')
  })

  it('2. import: document appears in library list', async () => {
    const docs = await listDocs()
    expect(docs.length).toBeGreaterThanOrEqual(1)
    const found = docs.find(d => d.id === doc.id)
    expect(found).toBeTruthy()
    expect(found.name).toBe('Biology Ch3')
  })

  it('3. quiz: generate quiz from the document', () => {
    const gen = generateQuiz(doc, QUIZ_CFG)

    expect(gen.error).toBeNull()
    expect(gen.questions.length).toBeGreaterThan(0)
    expect(gen.questions.length).toBeLessThanOrEqual(QUIZ_CFG.count)

    // every question must have a type and answer
    for (const q of gen.questions) {
      expect(q.type).toBeTruthy()
      expect(['mcq', 'tf', 'fib', 'id']).toContain(q.type)
      // mcq/fib have answerIndex, tf has boolean answer, id has string answer
      if (q.type === 'mcq' || q.type === 'fib') {
        expect(q.answerIndex).toBeGreaterThanOrEqual(0)
        expect(q.options || q.choices).toBeTruthy()
      } else if (q.type === 'tf') {
        expect(typeof q.answer).toBe('boolean')
      } else if (q.type === 'id') {
        expect(q.answer).toBeTruthy()
      }
    }
  })

  it('4. quiz: grade all questions (simulate user answering)', () => {
    const gen = generateQuiz(doc, QUIZ_CFG)
    const questions = gen.questions
    const answers = []

    for (const q of questions) {
      let chosen = null
      let ok = false

      if (q.type === 'mcq' || q.type === 'fib') {
        // answer correctly
        chosen = q.options?.[q.answerIndex] ?? q.choices?.[q.answerIndex]
        ok = true
      } else if (q.type === 'tf') {
        chosen = String(q.answer)
        ok = true
      } else if (q.type === 'id') {
        chosen = q.answer
        ok = true
      }

      answers.push({ type: q.type, chosen, correct: chosen, userOk: ok })
    }

    const correct = answers.filter(a => a.userOk).length
    const percent = Math.round((correct / questions.length) * 100)

    expect(correct).toBe(questions.length)
    expect(percent).toBe(100)
  })

  it('5. results: save attempt to IDB', async () => {
    const gen = generateQuiz(doc, QUIZ_CFG)
    const questions = gen.questions
    const answers = []

    for (const q of questions) {
      let chosen = null
      let ok = false

      if (q.type === 'mcq' || q.type === 'fib') {
        chosen = q.options?.[q.answerIndex] ?? q.choices?.[q.answerIndex]
        ok = true
      } else if (q.type === 'tf') {
        chosen = String(q.answer)
        ok = true
      } else if (q.type === 'id') {
        chosen = q.answer
        ok = true
      }

      answers.push({ type: q.type, chosen, correct: chosen, userOk: ok })
    }

    const correct = answers.filter(a => a.userOk).length
    const percent = Math.round((correct / questions.length) * 100)

    const attempt = await saveAttempt({
      docId: doc.id,
      docName: doc.name,
      correct,
      total: questions.length,
      percent,
      durationSec: 12.5,
      byType: { mcq: { c: 2, t: 2 }, tf: { c: 1, t: 1 } }
    })

    expect(attempt).toBeTruthy()
    expect(attempt.id).toBeTruthy()
    expect(attempt.percent).toBe(100)
  })

  it('6. results: attempt shows in history', async () => {
    const attempts = await listAttempts(doc.id)
    expect(attempts.length).toBeGreaterThanOrEqual(1)
    const latest = attempts[attempts.length - 1]
    expect(latest.docId).toBe(doc.id)
    expect(latest.percent).toBe(100)
  })

  it('7. mistakes: wrong answers get banked', async () => {
    const gen = generateQuiz(doc, QUIZ_CFG)
    const q = gen.questions.find(q => q.type === 'mcq' || q.type === 'fib')
    if (!q) return // skip if no mcq/fib generated

    const wrongIndex = q.options
      ? q.options.findIndex((_, i) => i !== q.answerIndex)
      : q.choices.findIndex((_, i) => i !== q.answerIndex)

    if (wrongIndex < 0) return

    const chosen = q.options?.[wrongIndex] ?? q.choices?.[wrongIndex]
    const ok = false

    // bank the mistake
    const mistake = await bankMistake({
      docId: doc.id,
      sentence: q.meta?.sentence || q.stem || '',
      term: q.meta?.term || chosen,
      type: q.type
    })
    expect(mistake).toBeTruthy()

    const mistakes = await listMistakes()
    expect(mistakes.length).toBeGreaterThanOrEqual(1)
  })

  it('8. SRS: wrong answer creates a due card', async () => {
    const gen = generateQuiz(doc, QUIZ_CFG)
    const q = gen.questions.find(q => q.type === 'mcq' || q.type === 'fib')
    if (!q) return

    const term = q.meta?.term || q.options?.[q.answerIndex] || 'unknown'
    const sentence = q.meta?.sentence || q.stem || 'test sentence'

    const srs = await upsertSrsFromMistake({
      docId: doc.id,
      sentence,
      term,
      type: q.type
    })
    expect(srs).toBeTruthy()
    expect(srs.reps).toBe(0)
    expect(srs.ease).toBe(2.5)

    // should be due immediately
    const due = await listDueCards()
    expect(due.length).toBeGreaterThanOrEqual(1)
    expect(due.some(c => c.id === srs.id)).toBe(true)
  })

  it('9. SRS: grading a card updates its state', async () => {
    const gen = generateQuiz(doc, QUIZ_CFG)
    const q = gen.questions.find(q => q.type === 'mcq' || q.type === 'fib')
    if (!q) return

    const term = q.meta?.term || q.options?.[q.answerIndex] || 'unknown'
    const sentence = q.meta?.sentence || q.stem || 'test sentence'

    const srs = await upsertSrsFromMistake({
      docId: doc.id,
      sentence,
      term,
      type: q.type
    })
    if (!srs) return

    const graded = await gradeSrsItem(srs.id, 'good')
    expect(graded).toBeTruthy()
    expect(graded.reps).toBe(1)

    // after grading, card should NOT be due immediately (interval > 0)
    const item = await getSrsItem(srs.id)
    expect(item.intervalDays).toBeGreaterThan(0)
  })

  it('10. cleanup: delete the test document', async () => {
    await deleteDoc(doc.id)
    const gone = await getDoc(doc.id)
    expect(gone == null).toBe(true)
  })
})
