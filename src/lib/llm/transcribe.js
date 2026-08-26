import { chatMultimodal } from './gemini.js'

const TRANSCRIBE_RULES = [
  'You are a transcription assistant for a study app.',
  'Transcribe ALL readable text from the image exactly, preserving headings, bullet points and key labels.',
  'If the image is a diagram, chart, slide, whiteboard or screenshot, include the important terms and short annotations a student would need.',
  'Return only the transcribed text — no commentary and no markdown code fences.'
].join('\n')

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '')
  if (!m) return null
  return { mimeType: m[1], data: m[2] }
}

function stripFences(text) {
  if (!text) return ''
  return text
    .replace(/^```(?:[a-z]*)\n?/i, '')
    .replace(/```$/i, '')
    .trim()
}

// Turn a photo/screenshot of a board, slide or page into study text.
export async function transcribeImage(dataUrl, { maxOutputTokens = 2048 } = {}) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw new Error('invalid_image')
  const raw = await chatMultimodal(
    TRANSCRIBE_RULES,
    [{ mimeType: parsed.mimeType, data: parsed.data }],
    { maxOutputTokens, temperature: 0.2, json: false }
  )
  return stripFences(raw || '')
}
