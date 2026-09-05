import { summarizeDoc } from './summarize.js'
import { rankExamTopics } from './exam.js'

function download(filename, content, mime = 'text/markdown') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function stamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function optionLetters(n) {
  return 'ABCDEFGH'.slice(0, n).split('')
}

export function buildSummaryMarkdown(doc) {
  const summary = summarizeDoc(doc.text)
  const out = [`# ${doc.name}`, '', `_Study sheet · generated ${stamp()}_`, '']
  if (summary.tldr.length) {
    out.push('## In a nutshell', '')
    summary.tldr.forEach(p => out.push(`- ${p}`))
    out.push('')
  }
  summary.sections.forEach((sec, i) => {
    out.push(`## ${i + 1}. ${sec.title}`, '')
    sec.points.forEach(p => out.push(`- ${p}`))
    out.push('')
  })
  out.push('---', `_${doc.wordCount.toLocaleString()} words · exported from Quizard_`, '')
  return out.join('\n')
}

export function buildQuizMarkdown(docName, questions, review) {
  const out = [`# Quiz — ${docName}`, '', `_Generated ${stamp()}_`, '']
  questions.forEach((q, i) => {
    const prompt = q.statement || q.stem || q.clue || q.prompt || ''
    if (q.type === 'matching') {
      out.push(`**${i + 1}. [MATCHING]** ${q.prompt || 'Match each term to its definition'}`)
      ;(q.pairs || []).forEach(p => out.push(`   - ${p.left} → ${p.right}`))
      out.push('**Answer:** match the pairs above')
      const rev = review?.[i]
      if (rev && !rev.ok && rev.chosen != null) out.push(`_Your attempt: ${rev.chosen}_`)
      out.push('')
      return
    }
    if (q.type === 'ordering') {
      out.push(`**${i + 1}. [ORDERING]** ${q.prompt || 'Put the steps in the correct order'}`)
      ;(q.steps || []).forEach((s, k) => out.push(`   ${k + 1}. ${s}`))
      out.push('**Answer:** the numbered order above')
      const rev = review?.[i]
      if (rev && !rev.ok && rev.chosen != null) out.push(`_Your attempt: ${rev.chosen}_`)
      out.push('')
      return
    }
    const typeLabel = q.type === 'id' ? 'IDENTIFY' : q.type === 'tf' ? 'TRUE/FALSE' : q.type === 'fib' ? 'FILL BLANK' : q.type === 'short' ? 'SHORT ANSWER' : 'MULTIPLE CHOICE'
    out.push(`**${i + 1}. [${typeLabel}]** ${prompt}`)
    let opts = null
    if (q.type === 'mcq' || q.type === 'fib') opts = q.options || q.choices
    else if (q.type === 'tf') opts = ['True', 'False']
    if (opts) {
      const letters = optionLetters(opts.length)
      opts.forEach((o, k) => out.push(`   ${letters[k]}. ${o}`))
    }
    const answer = q.type === 'id' || q.type === 'short'
      ? q.answer
      : q.type === 'tf'
        ? String(q.answer)
        : (q.options ?? q.choices)?.[q.answerIndex]
    out.push(`**Answer:** ${answer}`)
    const rev = review?.[i]
    if (rev && !rev.ok && rev.chosen != null) out.push(`_Your answer: ${rev.chosen}_`)
    out.push('')
  })
  out.push('---', '_Exported from Quizard_', '')
  return out.join('\n')
}

export function exportSummary(doc) {
  download(`quizard-summary-${slug(doc.name)}.md`, buildSummaryMarkdown(doc))
}

/* Real PDF handout: same structure as the reviewer screen, generated with
   jsPDF (lazy-loaded so it never sits in the main bundle). */
export async function exportPdfHandout(doc, extras = {}) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = 595.28, H = 841.89, M = 56
  const maxW = W - M * 2
  let y = 0

  const page = () => { pdf.addPage(); y = M }
  const need = h => { if (y + h > H - M) page() }
  const text = (str, { size = 11, bold = false, color = '#1c2438', gap = 6, indent = 0 } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(color)
    const lines = pdf.splitTextToSize(str, maxW - indent)
    need(lines.length * (size + 3))
    lines.forEach(line => { pdf.text(line, M + indent, y + size); y += size + 3 })
    y += gap
  }
  const rule = () => { need(14); pdf.setDrawColor('#d9d2f2'); pdf.line(M, y + 6, W - M, y + 6); y += 14 }

  // title block
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor('#7c3aed')
  pdf.text('S T U D Y   R E V I E W E R', M, M + 8)
  y = M + 26
  text(doc.name, { size: 20, bold: true, gap: 2 })
  text(`${doc.wordCount.toLocaleString()} words · forged from your document · ${stamp()}`, { size: 9, color: '#868ea8', gap: 10 })
  rule()

  // I. overview
  const summary = summarizeDoc(doc.text)
  if (summary.tldr.length) {
    text('I. Overview', { size: 13, bold: true, color: '#5b3df5' })
    summary.tldr.forEach(p => text(p, { size: 11 }))
  }

  // II. key terms
  if (extras.keyTermDefs?.length) {
    rule()
    text('II. Key Terms & Definitions', { size: 13, bold: true, color: '#5b3df5' })
    for (const t of extras.keyTermDefs) {
      text(t.term, { size: 11, bold: true, color: '#5b3df5', gap: 1 })
      text(t.def, { size: 10.5, color: '#475069', indent: 12, gap: 8 })
    }
  }

  // III. section notes
  if (summary.sections.length) {
    rule()
    text('III. Section Notes', { size: 13, bold: true, color: '#5b3df5' })
    summary.sections.forEach((sec, i) => {
      need(30)
      text(`${String(i + 1).padStart(2, '0')}  ${sec.title}`, { size: 11.5, bold: true, gap: 3 })
      sec.points.forEach(p => text('•  ' + p, { size: 10.5, color: '#475069', indent: 10, gap: 2 }))
      y += 4
    })
  }

  // IV. self-test — all static-renderable types
  if (extras.reviewQs?.length) {
    rule()
    text('IV. Test Yourself', { size: 13, bold: true, color: '#5b3df5' })
    extras.reviewQs.forEach((q, i) => {
      need(50)
      const optLine = (arr, numbered = false) => {
        if (!arr) return
        arr.forEach((o, oi) => text(`${numbered ? oi + 1 + '.' : 'ABCDEFGH'[oi] + '.'} ${o}`, { size: 10, color: '#475069', indent: 12, gap: 1 }))
      }
      if (q.type === 'mcq') {
        text(`${i + 1}. ${q.stem}`, { size: 10.5, bold: true, gap: 2 })
        optLine(q.options)
        text(`Answer: ${q.options?.[q.answerIndex] ?? ''}`, { size: 10, bold: true, color: '#0f9d6a', indent: 12, gap: 8 })
      } else if (q.type === 'tf') {
        text(`${i + 1}. [T/F] ${q.statement}`, { size: 10.5, bold: true, gap: 2 })
        text(`Answer: ${q.answer ? 'True' : 'False'}`, { size: 10, bold: true, color: '#0f9d6a', indent: 12, gap: 8 })
      } else if (q.type === 'fib') {
        text(`${i + 1}. ${q.stem}`, { size: 10.5, bold: true, gap: 2 })
        optLine(q.choices, true)
        text(`Answer: ${q.choices?.[q.answerIndex] ?? ''}`, { size: 10, bold: true, color: '#0f9d6a', indent: 12, gap: 8 })
      } else if (q.type === 'id') {
        text(`${i + 1}. Identify the term: ${q.clue}`, { size: 10.5, bold: true, gap: 2 })
        text(`Answer: ${q.answer ?? ''}`, { size: 10, bold: true, color: '#0f9d6a', indent: 12, gap: 8 })
      } else if (q.type === 'matching') {
        text(`${i + 1}. [MATCHING] ${q.prompt}`, { size: 10.5, bold: true, gap: 2 })
        text('Terms:', { size: 10, color: '#475069', indent: 12, gap: 1 })
        ;(q.pairs || []).forEach(p => text(`• ${p.left}`, { size: 10, color: '#475069', indent: 20, gap: 1 }))
        text('Definitions:', { size: 10, color: '#475069', indent: 12, gap: 1 })
        ;(q.rightOrder || []).forEach(pi => text(`• ${q.pairs?.[pi]?.right || ''}`, { size: 10, color: '#475069', indent: 20, gap: 1 }))
        text(`Answer: ${(q.pairs || []).map(p => `${p.left} → ${p.right}`).join(' · ')}`, { size: 10, bold: true, color: '#0f9d6a', indent: 12, gap: 8 })
      } else if (q.type === 'ordering') {
        text(`${i + 1}. [ORDERING] ${q.prompt}`, { size: 10.5, bold: true, gap: 2 })
        optLine(q.shuffled || q.steps, true)
        text(`Answer: ${(q.steps || []).map((s, si) => `${si + 1}. ${s}`).join('  ')}`, { size: 10, bold: true, color: '#0f9d6a', indent: 12, gap: 8 })
      }
    })
  }

  rule()
  text(`Generated ${stamp()} · exported from Quizard`, { size: 9, color: '#868ea8' })

  pdf.save(`quizard-reviewer-${slug(doc.name)}.pdf`)
  return true
}

/* Exam prep handout: ranked topics with reasons + per-file section notes. */
export async function exportExamPdf(exam, docs) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = 595.28, H = 841.89, M = 56
  let y = 0

  const page = () => { pdf.addPage(); y = M }
  const need = h => { if (y + h > H - M) page() }
  const text = (str, { size = 11, bold = false, color = '#1c2438', gap = 6, indent = 0 } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(color)
    const lines = pdf.splitTextToSize(str, W - M * 2 - indent)
    need(lines.length * (size + 3))
    lines.forEach(line => { pdf.text(line, M + indent, y + size); y += size + 3 })
    y += gap
  }
  const rule = () => { need(14); pdf.setDrawColor('#d9d2f2'); pdf.line(M, y + 6, W - M, y + 6); y += 14 }

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor('#7c3aed')
  pdf.text('E X A M   P R E P', M, M + 8)
  y = M + 26
  text(exam.title, { size: 20, bold: true, gap: 2 })
  const when = exam.examDate
    ? new Date(exam.examDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : null
  text(`${when ? when + ' · ' : ''}${docs.length} file${docs.length === 1 ? '' : 's'} · prepared ${stamp()}`, { size: 9, color: '#868ea8', gap: 10 })
  rule()

  if (exam.announcement) {
    text('The announcement', { size: 13, bold: true, color: '#5b3df5' })
    text(exam.announcement, { size: 10.5, color: '#475069' })
  }

  const ranked = rankExamTopics(exam, docs)
  if (ranked.length) {
    rule()
    text('Topics to review — ranked by likelihood', { size: 13, bold: true, color: '#5b3df5' })
    ranked.forEach((t, i) => {
      need(26)
      text(`${i + 1}. ${t.title}`, { size: 11, bold: true, gap: 1 })
      text(`${t.docName}${t.reason ? ' · ' + t.reason : ''}`, { size: 9.5, color: '#868ea8', indent: 12, gap: 4 })
    })
  }

  for (const doc of docs) {
    rule()
    text(doc.name, { size: 13, bold: true, color: '#5b3df5' })
    const summary = summarizeDoc(doc.text || '')
    if (summary.tldr.length) summary.tldr.forEach(p => text('•  ' + p, { size: 10.5, color: '#475069', gap: 2 }))
    summary.sections.forEach((sec, i) => {
      need(30)
      text(`${i + 1}. ${sec.title}`, { size: 11, bold: true, gap: 2 })
      sec.points.forEach(p => text('–  ' + p, { size: 10, color: '#475069', indent: 10, gap: 1 }))
    })
  }

  rule()
  text(`Generated ${stamp()} · exported from Quizard`, { size: 9, color: '#868ea8' })

  pdf.save(`quizard-exam-${slug(exam.title)}.pdf`)
  return true
}

export function exportQuiz(docName, lastResult) {
  if (!lastResult?.questions?.length) return false
  download(`quizard-quiz-${slug(docName)}.md`, buildQuizMarkdown(docName, lastResult.questions, lastResult.review))
  return true
}

export function printStudySheet(doc) {
  const summary = summarizeDoc(doc.text)
  const sections = summary.sections.map(sec =>
    `<h2>${escHtml(sec.title)}</h2><ul>${sec.points.map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>`
  ).join('')
  const tldr = summary.tldr.length
    ? `<h2>In a nutshell</h2>${summary.tldr.map(p => `<p>${escHtml(p)}</p>`).join('')}`
    : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(doc.name)}</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#10162e;line-height:1.6}
      h1{font-size:22px} h2{font-size:16px;margin-top:22px;color:#5b3df5} ul{margin:6px 0} li{margin:3px 0}
      .meta{color:#868ea8;font-size:13px} hr{border:none;border-top:1px solid #e4e9f2;margin:18px 0}
    </style></head><body>
    <h1>${escHtml(doc.name)}</h1><p class="meta">Study sheet · ${doc.wordCount.toLocaleString()} words · exported from Quizard</p>
    ${tldr}${sections}
    <hr><p class="meta">Generated ${stamp()}</p>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
    </body></html>`
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}

function slug(name) {
  return String(name || 'doc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'doc'
}

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
