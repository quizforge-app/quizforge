// Reusable share/challenge modal. Used by the results screen (after a quiz)
// and the setup screen (to share a quiz before playing it). The entire quiz
// is baked into the link so a recipient needs no app, account, or API key.
import { buildQuizPayload, buildChallengePayload, encodeShare, linkFromEncoded } from '../lib/share.js'
import { renderQr } from '../lib/qr.js'
import { icon } from './icons.js'

export async function showShareModal(ctx, { title, questions, timerSec = 0, mode = 'quiz', score = null }) {
  document.querySelector('.modal-mask')?.remove()
  const mask = document.createElement('div')
  mask.className = 'modal-mask'
  const isChallenge = mode === 'challenge'
  mask.innerHTML = `
    <div class="modal share-modal">
      <div class="modal-head">
        <h3>${icon(isChallenge ? 'users' : 'share')} ${isChallenge ? 'Challenge a friend' : 'Share this quiz'}</h3>
        <button class="icon-btn" id="share-close">${icon('x')}</button>
      </div>
      ${isChallenge ? `
      <label class="share-field">
        <span>Your name</span>
        <input class="text-input" id="share-name" value="You" maxlength="20" placeholder="Your name" />
      </label>
      <p class="faint" style="margin:4px 0 0;font-size:13px">They'll see you scored <strong>${score ? score.percent : 0}%</strong>. Can they beat it?</p>` : ''}
      <div class="qr-wrap" id="share-qr"></div>
      <label class="share-field">
        <span>Link</span>
        <input class="text-input" id="share-link" readonly />
      </label>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="share-copy">${icon('link')} Copy link</button>
        <button class="btn btn-primary" id="share-native">${icon('share')} Share…</button>
      </div>
    </div>`
  document.body.appendChild(mask)
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove() })
  mask.querySelector('#share-close').addEventListener('click', () => mask.remove())

  const linkEl = mask.querySelector('#share-link')
  const qrEl = mask.querySelector('#share-qr')
  const nameEl = isChallenge ? mask.querySelector('#share-name') : null

  async function rebuild() {
    const challenger = isChallenge && nameEl
      ? { name: (nameEl.value || 'You').trim(), percent: score?.percent || 0, correct: score?.correct || 0, total: score?.total || 0 }
      : null
    const payload = isChallenge
      ? buildChallengePayload(title, questions, challenger, { timerSec })
      : buildQuizPayload(title, questions, { timerSec })
    const encoded = await encodeShare(payload)
    const url = linkFromEncoded(encoded)
    linkEl.value = url
    try { renderQr(qrEl, url) } catch { qrEl.innerHTML = '' }
  }

  await rebuild()
  nameEl?.addEventListener('input', () => rebuild())

  mask.querySelector('#share-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(linkEl.value); ctx.toast('Link copied') }
    catch { linkEl.select(); document.execCommand('copy'); ctx.toast('Link copied') }
  })
  mask.querySelector('#share-native').addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: title || 'Quiz', text: isChallenge ? 'Can you beat my score?' : 'Try this quiz', url: linkEl.value }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(linkEl.value); ctx.toast('Link copied') } catch { ctx.toast('Could not share', true) }
    }
  })
}
