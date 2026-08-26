import { getDoc } from '../../lib/storage.js'
import { buildDeck } from '../../lib/flashcards.js'
import { icon } from '../icons.js'
import { esc } from '../helpers.js'

export async function render(root, ctx) {
  const doc = await getDoc(ctx.state.currentDocId)
  if (!doc) { ctx.go('library'); return }

  const deck = buildDeck(doc, [])

  if (deck.length < 3) {
    root.innerHTML = `
      <header class="back-header">
        <button class="icon-btn" id="back-btn">${icon('chevronLeft')}</button>
        <h2>Flashcards</h2>
        <div class="spacer"></div>
      </header>
      <div class="screen">
        <div class="empty-state">
          <div class="art">${icon('sparkles')}</div>
          <h3>Not enough terms</h3>
          <p>This document doesn't have enough distinct key terms to build flashcards. Try a longer, text-rich document.</p>
        </div>
      </div>
    `
    root.querySelector('#back-btn').addEventListener('click', () => ctx.go('docdetail', doc.id))
    return
  }

  let index = 0
  let flipped = false
  let againPile = []

  root.innerHTML = `
    <header class="back-header">
      <button class="icon-btn" id="back-btn" data-tooltip="Exit flashcards">${icon('x')}</button>
      <h2>Flashcards</h2>
      <span class="q-counter" id="fc-progress"></span>
    </header>
    <div class="screen fc-screen">
      <div class="fc-progress-track"><div class="progress-fill" id="fc-progress-fill"></div></div>
      <div class="fc-stage">
        <button class="fc-card" id="fc-card" data-tooltip="Tap to flip">
          <div class="fc-inner" id="fc-inner">
            <div class="fc-face fc-front">
              <span class="fc-hint">TERM</span>
              <div class="fc-front-text" id="fc-front"></div>
              <span class="fc-tap">Tap to flip</span>
            </div>
            <div class="fc-face fc-back">
              <span class="fc-hint">CONTEXT</span>
              <div class="fc-back-text" id="fc-back"></div>
            </div>
          </div>
        </button>
      </div>
      <div class="fc-controls">
        <button class="btn fc-btn-again" id="fc-again" data-tooltip="Review this card later">${icon('refresh')} Again</button>
        <button class="btn btn-primary fc-btn-got" id="fc-got" data-tooltip="I knew this one">${icon('check')} Got it</button>
      </div>
      <p class="center faint" style="font-size:12px;margin-top:14px">${deck.length} cards from “${esc(doc.name)}”</p>
    </div>
  `

  const inner = root.querySelector('#fc-inner')
  const cardEl = root.querySelector('#fc-card')
  const frontEl = root.querySelector('#fc-front')
  const backEl = root.querySelector('#fc-back')
  const progressEl = root.querySelector('#fc-progress')
  const fillEl = root.querySelector('#fc-progress-fill')

  function currentCard() {
    return index < deck.length ? deck[index] : againPile[0]
  }

  function paint() {
    const card = currentCard()
    if (!card) return
    frontEl.textContent = card.front
    backEl.textContent = card.back
    const total = deck.length + againPile.length
    const done = index
    progressEl.textContent = `${Math.min(index + 1, total)}/${total}`
    fillEl.style.width = `${(done / total) * 100}%`
    if (flipped) inner.classList.add('flipped')
    else inner.classList.remove('flipped')
  }

  function flip() {
    flipped = !flipped
    inner.classList.toggle('flipped', flipped)
  }

  function advance(knewIt) {
    const card = currentCard()
    if (!card) return
    if (knewIt) {
      index++
    } else {
      againPile.push(card)
      index++
    }
    flipped = false
    if (index >= deck.length) {
      if (againPile.length) {
        deck.push(...againPile.splice(0))
      } else {
        return finish()
      }
    }
    paint()
  }

  function finish() {
    root.querySelector('.fc-screen').innerHTML = `
      <div class="empty-state" style="padding-top:80px">
        <div class="art">${icon('trophy')}</div>
        <h3>Deck complete!</h3>
        <p>You reviewed all ${deck.length} flashcards from “${esc(doc.name)}”.</p>
        <button class="btn btn-primary" id="fc-restart" style="max-width:200px;margin:0 auto">${icon('refresh')} Study again</button>
        <button class="btn btn-secondary" id="fc-back" style="max-width:200px;margin:10px auto 0">Back to document</button>
      </div>
    `
    root.querySelector('#fc-restart').addEventListener('click', () => ctx.refresh())
    root.querySelector('#fc-back').addEventListener('click', () => ctx.go('docdetail', doc.id))
  }

  cardEl.addEventListener('click', flip)
  root.querySelector('#fc-again').addEventListener('click', () => advance(false))
  root.querySelector('#fc-got').addEventListener('click', () => advance(true))
  root.querySelector('#back-btn').addEventListener('click', () => ctx.go('docdetail', doc.id))

  document.addEventListener('keydown', function keyNav(e) {
    if (!document.body.contains(cardEl)) {
      document.removeEventListener('keydown', keyNav)
      return
    }
    if (e.key === ' ') { e.preventDefault(); flip() }
    if (e.key === 'ArrowRight') advance(true)
    if (e.key === 'ArrowLeft') advance(false)
  })

  paint()
}
