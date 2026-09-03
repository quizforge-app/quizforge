// Pure prompt builders for the ai quiz generator. No browser/runtime deps so
// they can be unit-tested and exercised by the standalone distractor test.

export const MCQ_RULES = [
  'You are an exam writer. Create exam questions STRICTLY from the study content given below.',
  'Ground every question ONLY in its source sentence. Never invent facts.',
  'NEVER reference, quote, or ask about document titles, section headings, chapter names, unit numbers, page numbers, figure/table lists, or a table of contents.',
  'Write like a professional exam paper (e.g. a teacher-training assessment). Each mcq must be a full comprehension question, not a fill-in-the-blank of the source sentence:',
  '  - Ask WHY something matters ("Why is effective classroom management important?"), WHAT it is ("What are lesson plans?"), HOW it is done, or WHAT ONE SHOULD DO in a realistic scenario drawn from the source material ("You are teaching a lesson and a student does not understand. What do you do?").',
  '  - The stem may paraphrase and reword the source sentence — do NOT copy it verbatim, and do NOT leave a blank in it.',
  '  - Every option must be a COMPLETE, self-contained answer (a full sentence or a specific phrase), never a lone term.',
  '  - Exactly ONE option is the best answer; the question must be answerable from the source sentence alone.',
  'The 3 wrong options are the most important part of the question:',
  '  - Each must be a SPECIFIC, believable answer a student could realistically confuse with the correct one.',
  '  - Each must belong to the SAME subject/topic as the source sentence. Do NOT use generic, out-of-domain, absurd, or joke options.',
  '  - You are given "related terms from this document" for each item — these are real concepts drawn from the source material. Weave them into plausible but WRONG answer sentences whenever possible; they must be specific to THIS document, never generic or invented.',
  '  - Never use filler such as "none of the above", "all of the above", "option 1/2/3", "I don\'t know", placeholders, or the word "example".',
  '  - None of the wrong options may equal or contain the correct answer.',
  '  - Make all four options PARALLEL in length and form, like a teacher would list them on an exam. All four are complete sentences of similar length (roughly 5-20 words each). Never mix a one-word option with sentence-length options, and keep no option dramatically longer or shorter than the others.',
  '  - The wrong options should be PLAUSIBLE and distinct from one another (not near-duplicates or synonyms of each other), so a student must actually reason rather than spot the odd one out.',
  '  - When the question is about a procedure, rule, or best practice ("What is the best way to…"), rank real alternatives from the document: the correct option states the recommended practice, the wrong options state practices that are less effective, outdated, or misread from the same material.',
  'For id: write ONE clue of max 25 words describing the answer without using it or close variants.',
  'For short: write ONE direct question ("What is X?" / "Define X.") whose answer is a short phrase EXACTLY equal to the given answer. Keep the answer to a single key term or short phrase.',
  'Reply ONLY with a JSON array. Each item uses "i" (the index) and "kind" ("mcq"/"id"/"short"). For mcq also include "correct": the full best-answer option rephrased from the source sentence (complete sentence or specific phrase, same length/style as the wrong options — NOT just the bare term). Examples:\n  [{"i":0,"kind":"mcq","stem":"Why is effective classroom management important?","correct":"It helps teachers to keep students organized, orderly, focused and academically productive.","wrong":["It helps to reduce costs and thereby benefit the school\'s overall budget.","It creates a bond between pupils and the teacher."]},\n   {"i":1,"kind":"id","clue":"..."},\n   {"i":2,"kind":"short","prompt":"What is ...?","answer":"..."}]. Include every index.'
].join('\n')

// Rules for identification clues (kept separate for reuse).
export const ID_RULES = [
  'For id: write ONE clue of max 25 words describing the given answer without using it or close variants of it.',
  'Never include the answer term, its synonyms, or the document title/section in the clue.'
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
  'Keep the 4 options parallel in length and form (short phrases of similar size, like a teacher would write on an exam), and make the wrong options plausible and distinct from each other.',
  'Only return items for images you can actually interpret. Skip blank, decorative, or unreadable images.',
  'Reply ONLY with the JSON array.'
].join('\n')

export function mcqPrompt(items, relatedFor, weakHint) {
  const lines = items.map(([q, i]) => {
    let kind
    if (q.type === 'mcq') kind = 'mcq'
    else if (q.type === 'id') kind = 'id'
    else if (q.type === 'short') kind = 'short'
    else return null
    const base = `${i} [${kind}] source sentence: "${q.meta.sentence}" | correct answer: "${q.meta.term}"`
    if (relatedFor) {
      const rel = relatedFor(q)
      if (rel && rel.length) return `${base} | related terms from this document: ${rel.join(', ')}`
    }
    return base
  }).filter(Boolean)
  let prompt = MCQ_RULES + '\n\nItems:\n' + lines.join('\n')
  if (weakHint) prompt += '\n\n' + weakHint
  return prompt
}

// Grade a learner's free-text short answer against the reference. Returns a
// JSON object {"ok":true|false}.
export const SHORT_GRADE_RULES = [
  'You are a strict but fair grader. Compare the student\'s answer to the reference answer for the question.',
  'Accept the student answer as correct when it means the same thing as the reference (same key term or synonym, minor spelling/wording differences allowed, extra words allowed as long as the core idea matches).',
  'Reject when it names the wrong concept, is blank, or is unrelated.',
  'Reply ONLY with a JSON object: {"ok":true} or {"ok":false}.'
].join('\n')

export function shortGradePrompt({ prompt, answer, userAnswer }) {
  return SHORT_GRADE_RULES + '\n\n' + JSON.stringify({ question: prompt, referenceAnswer: answer, studentAnswer: userAnswer })
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

// Gemini (multimodal) analyzes page/figure images from a document and returns a
// structured description of each one. This is the "Gemini sees once" step — its
// output is cached on the doc and reused, so the cheaper GLM does the actual
// question authoring. Each record references the 0-based position of its image.
export const DOC_VISUAL_RULES = [
  'You are a meticulous document analyst for a study app. Several images from a document are attached, each labelled by its 0-based position in the list.',
  'For every image that shows MEANINGFUL study content, return one record describing it:',
  '  - imageIndex: the 0-based position of that image in the attached list',
  '  - page: the page/slide number visible in the image (infer from any footer/header label; otherwise use the image index + 1)',
  '  - kind: one of "code" | "diagram" | "chart" | "table" | "figure" | "equation"',
  '  - label: a short 2-6 word title of what it shows',
  '  - content: for "code"/"equation" reproduce the text EXACTLY as shown; for other kinds give a concise factual description (what is depicted, key labels, values, trends).',
  'Skip decorative, blank, low-content, or unreadable images. Return ONLY a JSON array (possibly empty).'
].join('\n')

// GLM (text-only) authors the actual quiz questions from the cached analysis.
// It receives the structured elements (with imageIndex/page/kind/label/content)
// and may attach a question to a specific element via imageIndex.
export const VISUAL_Q_RULES = [
  'You are an exam writer. Write quiz questions grounded in the provided visual element analysis of a study document.',
  'Each element has imageIndex, page, kind, label and content (verbatim for code/equations, described for others).',
  'Write questions that require understanding the element when that adds value. For a code element ask for its OUTPUT, RESULT, or BEHAVIOUR. For a diagram/chart/table ask what it shows, illustrates, or implies.',
  'Auto-choose the best format per question:',
  '  - "mcq": a question with exactly 3 wrong options (specific, on-topic, no filler words).',
  '  - Keep the 3 wrong options PARALLEL in length and form to the correct answer (short phrases of similar size, like a teacher would write), and make them plausible and distinct from each other.',
  '  - "short": a direct question with a short phrase answer.',
  'When the question depends on seeing the visual, set "imageIndex" to that element\'s index; otherwise omit it.',
  'Never mention the document title, chapter, section heading, or slide/page number in the wording.',
  'Reply ONLY with a JSON array of objects. mcq: {"imageIndex":N,"kind":"mcq","stem":"...","correct":"...","wrong":["...","...","..."]}. short: {"imageIndex":N,"kind":"short","prompt":"...","answer":"..."}.'
].join('\n')

export function visualQuestionPrompt(elements, weakHint) {
  const lines = elements.map(el => `  [${el.imageIndex}] page ${el.page} (${el.kind}) ${el.label}: ${el.content}`)
  let prompt = VISUAL_Q_RULES + '\n\nVisual elements found in the document:\n' + lines.join('\n')
  if (weakHint) prompt += '\n\n' + weakHint
  return prompt
}
