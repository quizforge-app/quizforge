// Reusable confirm dialog — replaces native confirm() with an in-app modal.
// Returns a Promise that resolves to true (confirmed) or false (cancelled).
export function confirmModal(title, body, { confirmLabel = 'Delete', danger = true } = {}) {
  return new Promise(resolve => {
    document.querySelector('.confirm-mask')?.remove()
    const mask = document.createElement('div')
    mask.className = 'confirm-mask'
    mask.tabIndex = 0
    mask.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-head"><h3>${title}</h3></div>
        <div class="confirm-body">${body}</div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>`
    document.body.appendChild(mask)
    mask.focus()
    function close(val) { mask.remove(); resolve(val) }
    mask.addEventListener('click', e => {
      const a = e.target.closest('[data-action]')?.dataset.action
      if (a === 'confirm') close(true)
      else if (a === 'cancel' || e.target === mask) close(false)
    })
    mask.addEventListener('keydown', e => { if (e.key === 'Escape') close(false) })
  })
}

// Reusable password prompt — in-app modal, no native prompt().
// Returns a Promise that resolves to the entered string or null.
export function promptModal(title, body, { confirmLabel = 'Continue', placeholder = '', danger = false, mask = false } = {}) {
  return new Promise(resolve => {
    document.querySelector('.confirm-mask')?.remove()
    const el = document.createElement('div')
    el.className = 'confirm-mask'
    el.tabIndex = 0
    el.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-head"><h3>${title}</h3></div>
        <div class="confirm-body">${body}</div>
        <input class="text-input" id="modal-prompt-input" type="${mask ? 'password' : 'text'}"
          placeholder="${placeholder}" autocomplete="off" spellcheck="false" />
        <div class="confirm-actions">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>`
    document.body.appendChild(el)
    const input = el.querySelector('#modal-prompt-input')
    input.focus()
    function close(val) { el.remove(); resolve(val) }
    el.querySelector('[data-action="confirm"]').addEventListener('click', () => close(input.value))
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); close(input.value) }
      if (e.key === 'Escape') close(null)
    })
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-action]')?.dataset.action
      if (a === 'cancel' || e.target === el) close(null)
    })
  })
}
