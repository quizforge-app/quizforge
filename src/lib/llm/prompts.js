// Pure prompt builders for the ai quiz generator. No browser/runtime deps so
// they can be unit-tested and exercised by the standalone distractor test.

export const MCQ_RULES = [
  'You are an exam writer. Create exam questions STRICTLY from the study content given below.',
  'Ground every question ONLY in its source sentence. Never invent facts.',
  'NEVER reference, quote, or ask about document titles, section headings, chapter names, unit numbers, page numbers, figure/table lists, or a table of contents.',
  'For mcq: write one natural exam question whose answer is EXACTLY the given correct answer, then provide 3 wrong options.',
  'The 3 wrong options are the most important part of the question:',
  '  - Each must be a SPECIFIC, believable answer a student could realistically confuse with the correct one.',
  '  - Each must belong to the SAME subject/topic as the source sentence. Do NOT use generic, out-of-domain, absurd, or joke options.',
  '  - You are given "related terms from this document" for each item — these are real concepts drawn from the source material. Choose all 3 wrong options FROM that list whenever possible; they must be specific to THIS document, never generic or invented.',
  '  - Never use filler such as "none of the above", "all of the above", "option 1/2/3", "I don\'t know", placeholders, or the word "example".',
  '  - None of the wrong options may equal or contain the correct answer.',
  'For id: write ONE clue of max 25 words describing the answer without using it or close variants.',
  'Reply ONLY with a JSON array like [{"i":0,"kind":"mcq","stem":"...","wrong":["...","...","..."]},{"i":1,"kind":"id","clue":"..."}]. Include every index.'
].join('\n')

// Image questions: the document's slides/figures are attached as images. The
// model writes multiple-choice questions that require seeing a specific image,
// referencing it by its 0-based position in the attached list.
export const IMAGE_RULES = [
  'You are an exam writer for a study app. The student uploaded a document; several of its slides or figures are attached as images.',
  'For each image you can interpret, write ONE multiple-choice question that genuinely requires seeing that image (a diagram, chart, map, graph, photo, or labelled figure).',
  'Reference the image naturally ("According to the diagram…", "What does this figure show?") — NEVER name the document title, section heading, chapter, or slide number.',
  'Return a JSON array (possibly empty). Each item: {"imageIndex":<0-based position of the image in the attached list>,"stem":"...","correct":"<the right answer>","wrong":["...","...","..."]}.',
  'The 3 wrong options must be SPECIFIC and belong to the same subject as the image content. Never use filler ("none of the above", "option 1", "I don\'t know"), jokes, or out-of-domain facts.',
  'Only return items for images you can actually interpret. Skip blank, decorative, or unreadable images.',
  'Reply ONLY with the JSON array.'
].join('\n')

export function mcqPrompt(items, relatedFor) {
  const lines = items.map(([q, i]) => {
    const base = q.type === 'mcq'
      ? `${i} [mcq] source sentence: "${q.meta.sentence}" | correct answer: "${q.meta.term}"`
      : `${i} [id] source sentence: "${q.meta.sentence}" | answer: "${q.meta.term}"`
    if (relatedFor) {
      const rel = relatedFor(q)
      if (rel && rel.length) return `${base} | related terms from this document: ${rel.join(', ')}`
    }
    return base
  })
  return MCQ_RULES + '\n\nItems:\n' + lines.join('\n')
}

// After a student answers, the model explains why the correct answer is right
// (and, when they were wrong, why their choice was not). Plain text, short.
export const EXPLAIN_RULES = [
  'You are a patient tutor. A student just answered a study question.',
  'Explain in 2-3 short sentences WHY the correct answer is right, and — only if the student was wrong — WHY their chosen answer is not correct.',
  'Be specific and refer to the subject matter. No preamble, no headings, plain text only.',
  'Reply ONLY with a JSON object: {"explanation":"..."}.'
].join('\n')

export function explainPrompt({ stem, options, correctAnswer, userAnswer }) {
  const payload = { question: stem, correctAnswer }
  if (Array.isArray(options) && options.length) payload.options = options
  payload.userAnswer = userAnswer == null ? null : userAnswer
  return EXPLAIN_RULES + '\n\n' + JSON.stringify(payload)
}
