// Exam-prep wizard chat: bridges the conversation to the AI relay and keeps
// the structured exam draft in sync with what the wizard says.
// Falls back to a local keyword matcher when the relay is unreachable, so the
// feature degrades honestly offline.

import { chatJSON } from './gemini.js'
import { examChatPrompt } from './prompts.js'
import { keyTerms } from '../textproc.js'

// words that appear in exam announcements but are never topics to study
const STOPWORDS = new Set([
  'midterm', 'final', 'finals', 'exam', 'exams', 'test', 'quiz', 'quizzes',
  'covers', 'covered', 'cover', 'includes', 'included', 'include',
  'week', 'weeks', 'next', 'coming', 'upcoming', 'today', 'tomorrow', 'monday',
  'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'please', 'upload', 'uploaded', 'topic', 'topics', 'lesson', 'lessons',
  'chapter', 'chapters', 'notes', 'file', 'files', 'will', 'that', 'this',
  'with', 'from', 'have', 'there', 'their', 'been', 'were', 'also', 'into',
  'only', 'over', 'then', 'when', 'what', 'which', 'your', 'after', 'before',
  'make', 'sure', 'need', 'want', 'like', 'some', 'most', 'very', 'much',
  'many', 'well', 'good', 'about', 'said', 'told', 'class', 'during'
])

export async function examChat(conversation, digest, draft) {
  try {
    const res = await chatJSON(examChatPrompt(conversation, digest, draft), { temperature: 0.6 })
    const state = parseExamState(res)
    if (!state.reply) throw new Error('empty reply')
    return state
  } catch (err) {
    // relay unreachable / bad JSON → offline keyword matcher keeps the flow alive
    return offlineMatch(conversation, digest, draft, err)
  }
}

/** Extract the JSON object from a model reply (tolerates code fences/prose). */
export function parseExamState(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no JSON in reply')
  const obj = JSON.parse(cleaned.slice(start, end + 1))
  return {
    reply: String(obj.reply || '').trim(),
    examTitle: typeof obj.examTitle === 'string' && obj.examTitle.trim() ? obj.examTitle.trim() : null,
    examDate: typeof obj.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.examDate) ? obj.examDate : null,
    topics: Array.isArray(obj.topics)
      ? obj.topics.map(t => ({ title: String(t?.title || '').trim(), reason: String(t?.reason || '').trim() })).filter(t => t.title)
      : [],
    matchedDocIds: Array.isArray(obj.matchedDocIds) ? obj.matchedDocIds.map(String) : [],
    missingTopics: Array.isArray(obj.missingTopics) ? obj.missingTopics.map(String) : [],
    readyToCreate: !!obj.readyToCreate
  }
}

/** Local keyword matcher — fallback when the AI relay is unreachable.
 *  Scans ALL user messages so uploads re-check the original announcement. */
export function offlineMatch(conversation, digest, draft, cause = null) {
  const userTexts = (Array.isArray(conversation) ? conversation : [])
    .filter(m => m.role === 'user')
    .map(m => m.text)
    .join(' ')
  const keywords = String(userTexts || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4)
  const matchedDocIds = []
  const topics = []
  for (const d of digest) {
    const haystack = (d.topics.join(' ') + ' ' + d.keyTerms.join(' ') + ' ' + d.name).toLowerCase()
    const hits = keywords.filter(k => haystack.includes(k))
    if (hits.length) {
      matchedDocIds.push(d.id)
      topics.push({ title: d.topics[0] || d.name, reason: `Matches: ${hits.slice(0, 3).join(', ')}` })
    }
  }
  const missing = keywords.filter(k => {
    // skip exam-logistics words — they are not topics to upload files for
    if (STOPWORDS.has(k)) return false
    return !digest.some(d => (d.topics.join(' ') + ' ' + d.keyTerms.join(' ') + ' ' + d.name).toLowerCase().includes(k))
  })
  const notice = cause
    ? '(AI chat is unreachable right now — matching by keywords. You can keep going, but re-check the topics yourself.)\n\n'
    : ''
  const reply = matchedDocIds.length
    ? `${notice}Based on your words, these files look related: ${matchedDocIds.map(id => digest.find(d => d.id === id)?.name).filter(Boolean).join(', ')}.` +
      (missing.length ? ` I could not match: ${missing.join(', ')} — upload a file covering them if the exam includes those.` : '')
    : `${notice}I could not match any of your files to that yet. Upload the notes for this exam and tell me when done.`
  return {
    reply,
    examTitle: draft?.examTitle || null,
    examDate: draft?.examDate || null,
    topics: topics.length ? topics : (draft?.topics || []),
    matchedDocIds: [...new Set([...(draft?.matchedDocIds || []), ...matchedDocIds])],
    missingTopics: missing,
    readyToCreate: matchedDocIds.length > 0 && missing.length === 0
  }
}

/** Library digest builder — one compact entry per document for the prompt. */
export function buildDigest(docs) {
  return docs.map(d => ({
    id: d.id,
    name: d.name,
    type: d.type || 'txt',
    topics: d.topics || [],
    keyTerms: keyTerms(d.text || '').slice(0, 10).map(t => t.term)
  }))
}
