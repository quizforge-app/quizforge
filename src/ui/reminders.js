// Best-effort due-card reminders. On the native Android build we use the
// Capacitor Local Notifications plugin (loaded dynamically so the web bundle
// never requires it); on the web build we fall back to the Notification API.
// All scheduling is local — nothing leaves the device.
//
// The scheduled title carries a live due-card count so the nudge says
// "12 cards due" instead of a generic message.

async function dueCountText() {
  try {
    const { listDueCards } = await import('../lib/storage.js')
    const due = await listDueCards(99)
    return due.length ? `${due.length} card${due.length === 1 ? '' : 's'} due` : 'cards waiting'
  } catch { return 'cards waiting' }
}

export async function maybeScheduleReminders() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      let perm = (await LocalNotifications.checkPermissions()).display
      if (perm !== 'granted') perm = (await LocalNotifications.requestPermissions()).display
      if (perm !== 'granted') return { enabled: false, reason: 'Notification permission denied' }
      await LocalNotifications.cancelPending()
      const dueText = await dueCountText()
      await LocalNotifications.schedule({
        notifications: [{
          id: 1,
          title: `Quizard: ${dueText}`,
          body: 'A quick review keeps your cards fresh — the wizard is waiting.',
          schedule: { every: 'day', on: { hour: 19, minute: 0 } },
          smallIcon: 'ic_stat_quizard'
        }]
      })
      return { enabled: true }
    }
  } catch { /* fall through to web path */ }

  if (typeof Notification === 'undefined') return { enabled: false, reason: 'Notifications not supported here' }
  if (Notification.permission === 'default') {
    const res = await Notification.requestPermission().catch(() => 'denied')
    if (res !== 'granted') return { enabled: false, reason: 'Notification permission denied' }
  }
  if (Notification.permission === 'granted') {
    // Fire a sample notification now so the user sees the count immediately
    try {
      const dueText = await dueCountText()
      new Notification(`Quizard: ${dueText}`, {
        body: 'A quick review keeps your cards fresh — the wizard is waiting.',
        icon: '/icons/icon-192.png'
      })
    } catch { /* sample is optional */ }
  }
  return { enabled: Notification.permission === 'granted' }
}
