import { icon } from '../icons.js'
import { decodeShare, linkFromEncoded } from '../../lib/share.js'
import { saveDeck } from '../../lib/storage.js'
import { esc } from '../helpers.js'

export async function render(root, ctx) {
  const m = location.hash.match(/quiz=([^&]+)/)
  if (!m) { ctx.go('library'); return }

  let payload
  try {
    payload = await decodeShare(decodeURIComponent(m[1]))
  } catch (e) {
    root.innerHTML = `
      <div class="screen screen-center">
        <div class="empty-state">
          <div class="art">${icon('alert')}</div>
          <h3>We couldn't open that quiz</h3>
          <p>${esc(e.message || 'Invalid link')}</p>
          <button class="btn btn-primary" id="to-lib" style="max-width:220px;margin:0 auto">Go to Library</button>
        </div>
      </div>`
    root.querySelector('#to-lib').addEventListener('click', () => ctx.go('library'))
    return
  }

  // Consume the hash so a refresh doesn't re-trigger the link.
  history.replaceState(null, '', location.pathname)

  const isChallenge = !!payload.c
  const qcount = (payload.q || []).length
  const title = payload.t || 'Shared Quiz'

  root.innerHTML = `
    <div class="screen screen-center">
      <div class="empty-state" style="max-width:420px">
        <div class="art">${icon(isChallenge ? 'users' : 'share')}</div>
        <h3 style="margin-top:14px">${esc(title)}</h3>
        <p class="faint">${qcount} question${qcount === 1 ? '' : 's'} · no app or account needed to play</p>
        ${isChallenge ? `
          <div class="challenge-banner">
            <div class="cb-avatar">${esc((payload.c.n || '?')[0]?.toUpperCase() || '?')}</div>
            <div class="cb-text"><strong>${esc(payload.c.n || 'Friend')}</strong> scored <strong>${payload.c.p}%</strong>${payload.c.t ? ` (${payload.c.c}/${payload.c.t})` : ''}.</div>
          </div>
          <p class="faint" style="margin-top:10px">Can you beat them?</p>` : ''}
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary" id="start">${icon('play')} ${isChallenge ? 'Take the challenge' : 'Start quiz'}</button>
          <button class="btn btn-secondary" id="save">${icon('layers')} Save to library</button>
          <button class="btn btn-secondary" id="copy">${icon('link')} Copy link</button>
        </div>
      </div>
    </div>`

  root.querySelector('#start').addEventListener('click', () => {
    ctx.state.sharedQuiz = {
      title,
      questions: payload.q,
      cfg: { timerSec: payload.ts || 0 }
    }
    if (isChallenge) ctx.state.challenge = payload.c
    ctx.go('quiz')
  })

  root.querySelector('#copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkFromEncoded(m[1]))
      ctx.toast('Link copied')
    } catch {
      ctx.toast('Could not copy', true)
    }
  })

  root.querySelector('#save').addEventListener('click', async e => {
    const btn = e.currentTarget
    btn.disabled = true
    try {
      await saveDeck({ name: title, questions: payload.q, source: isChallenge ? 'challenge' : 'shared' })
      ctx.toast('Saved to your library')
      btn.textContent = icon('check') + ' Saved'
    } catch {
      ctx.toast('Could not save', true)
      btn.disabled = false
    }
  })
}
