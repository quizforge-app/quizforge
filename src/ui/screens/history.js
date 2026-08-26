import { listAttempts, listDocs, countMistakes, countDueCards } from '../../lib/storage.js'
import { icon } from '../icons.js'
import { dayLabel, fmtTime, scorePill, esc } from '../helpers.js'
import { startMistakeReview, startDueReview } from '../mistakes.js'
import { emptyProgressArt } from '../art.js'

function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function calcStreak(attempts) {
  if (!attempts.length) return 0
  const days = new Set(attempts.map(a => dayKey(a.date)))
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  let start = null
  if (days.has(dayKey(today.getTime()))) start = today
  else if (days.has(dayKey(yesterday.getTime()))) start = yesterday
  else return 0
  let streak = 0
  const cursor = new Date(start)
  while (days.has(dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function trendChart(attempts) {
  const recent = attempts.slice(0, 20).reverse()
  if (!recent.length) return ''
  const W = 320, H = 110, base = 96
  const n = recent.length
  const slot = W / n
  const bw = Math.min(18, slot * 0.62)
  const bars = recent.map((a, i) => {
    const h = Math.max(4, (a.percent / 100) * 82)
    const x = i * slot + (slot - bw) / 2
    const y = base - h
    const cls = a.percent >= 80 ? 'var(--good)' : a.percent >= 50 ? 'var(--warn)' : 'var(--bad)'
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3.5" fill="${cls}" opacity="${i === n - 1 ? 1 : 0.55}"/>`
  }).join('')
  const lastPct = recent[n - 1].percent
  return `
    <div class="chart-wrap">
      <div class="chart-head">
        <span class="section-title" style="margin:0">Last ${n} quiz${n > 1 ? 'zes' : ''}</span>
        <span class="score-pill ${scorePill(lastPct)}">${lastPct}% latest</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="trend-svg">
        <line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="var(--surface-3)" stroke-width="1.5"/>
        ${bars}
      </svg>
      <div class="chart-x"><span>older</span><span>now</span></div>
    </div>`
}

export async function render(root, ctx) {
  const [attempts, docs, mistakeCount, dueCount] = await Promise.all([
    listAttempts(), listDocs(), countMistakes(), countDueCards()
  ])

  const totalQ = attempts.reduce((s, a) => s + a.total, 0)
  const totalC = attempts.reduce((s, a) => s + a.correct, 0)
  const accuracy = totalQ ? Math.round((totalC / totalQ) * 100) : null
  const streak = calcStreak(attempts)

  let html = `
    <header class="app-header">
      <div class="brand"><span class="mark">${icon('logo')}</span>Progress</div>
      <button class="icon-btn" id="theme-btn" data-tooltip="${ctx.state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${ctx.state.theme === 'dark' ? icon('sun') : icon('moon')}</button>
    </header>
    <div class="screen">
      <div class="stats-row">
        <div class="stat"><div class="num">${streak}</div><div class="lbl">Day Streak</div></div>
        <div class="stat"><div class="num">${attempts.length}</div><div class="lbl">Quizzes</div></div>
        <div class="stat"><div class="num">${accuracy != null ? accuracy + '%' : '—'}</div><div class="lbl">Accuracy</div></div>
      </div>
      ${dueCount ? `
      <div class="card" style="padding:14px 16px;margin-bottom:14px;border-color:var(--accent-border);background:var(--accent-soft)">
        <div class="row" style="padding:2px 0 10px;border:none">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:var(--accent-strong);display:flex">${icon('zap')}</span>
            <div>
              <div class="label">${dueCount} card${dueCount === 1 ? '' : 's'} due for review</div>
              <div class="sub">Spaced repetition — review them before you forget</div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="due-review-btn" style="padding:11px">${icon('refresh')} Start spaced review</button>
      </div>` : ''}
      <div class="card" style="padding:14px 16px;margin-bottom:14px">
        <div class="row" style="padding:2px 0 10px;border:none">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:${mistakeCount ? 'var(--warn)' : 'var(--good)'};display:flex">${icon(mistakeCount ? 'alert' : 'check')}</span>
            <div>
              <div class="label">${mistakeCount} mistake${mistakeCount === 1 ? '' : 's'} in the bank</div>
              <div class="sub">${mistakeCount ? 'Questions you got wrong — review them until they stick' : 'Nothing to review. Keep it up!'}</div>
            </div>
          </div>
        </div>
        ${mistakeCount ? `<button class="btn btn-primary" id="review-mistakes-btn" style="padding:11px" data-tooltip="Practice the questions you previously got wrong">${icon('refresh')} Review all mistakes</button>` : ''}
      </div>
  `

  html += trendChart(attempts)

  const studied = docs.filter(d => d.attempts > 0)
  if (studied.length) {
    html += `<div class="section-title">Document mastery</div><div class="card breakdown">`
    for (const d of studied.slice(0, 6)) {
      const pct = d.bestScore != null ? d.bestScore : 0
      const color = pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)'
      html += `
        <div class="bd-row">
          <span class="bd-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px">${esc(d.name)}</span>
          <div class="bd-bar"><div class="bd-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="bd-score">${d.bestScore != null ? d.bestScore + '%' : '—'}</span>
        </div>`
    }
    html += `</div>`
  }

  if (!attempts.length) {
    html += `
      <div class="empty-state">
        <div class="empty-illust">${emptyProgressArt}</div>
        <h3>No progress yet</h3>
        <p>Take your first quiz and your streak, scores and mastery will appear here.</p>
      </div>
    </div>`
    root.innerHTML = html
    root.querySelector('#theme-btn').addEventListener('click', () => ctx.toggleTheme())
    root.querySelector('#review-mistakes-btn')?.addEventListener('click', () => startMistakeReview(ctx, null))
    return
  }

  html += `<div class="section-title">Recent activity</div>`

  const groups = new Map()
  for (const a of attempts.slice(0, 40)) {
    const key = dayLabel(a.date)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(a)
  }

  for (const [day, items] of groups) {
    html += `<div class="history-day">`
    for (const a of items) {
      const cls = scorePill(a.percent)
      const iconColor = cls === 'high' ? 'var(--good)' : cls === 'mid' ? 'var(--warn)' : 'var(--bad)'
      const iconBg = cls === 'high' ? 'var(--good-bg)' : cls === 'mid' ? 'var(--warn-bg)' : 'var(--bad-bg)'
      html += `
        <div class="history-item">
          <div class="hi-icon" style="color:${iconColor};background:${iconBg}">${icon(a.percent >= 50 ? 'trophy' : 'flame')}</div>
          <div class="hi-main">
            <div class="hi-name">${esc(a.docName)}</div>
            <div class="hi-meta">${fmtTime(a.date)} · ${a.correct}/${a.total} correct · ${Math.round(a.durationSec)}s</div>
          </div>
          <span class="score-pill ${cls}">${a.percent}%</span>
        </div>`
    }
    html += `</div>`
  }

  html += `</div>`
  root.innerHTML = html
  root.querySelector('#theme-btn').addEventListener('click', () => ctx.toggleTheme())
  root.querySelector('#review-mistakes-btn')?.addEventListener('click', () => startMistakeReview(ctx, null))
  root.querySelector('#due-review-btn')?.addEventListener('click', () => startDueReview(ctx))
}
