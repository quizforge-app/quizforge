// Pure helpers for folder/tag taxonomy. No storage side-effects so they can be
// used and unit-tested without a database.

export function deriveFolders(docs) {
  const set = new Set()
  for (const d of docs || []) {
    if (d.folder) set.add(d.folder)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function deriveTags(docs) {
  const set = new Set()
  for (const d of docs || []) {
    for (const t of d.tags || []) set.add(t)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
