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
