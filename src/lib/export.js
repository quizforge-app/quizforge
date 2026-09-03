import { summarizeDoc } from './summarize.js'

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
