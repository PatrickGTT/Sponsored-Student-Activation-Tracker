// Browser-local persistence — keeps imported students and the selected OSS
// user across refreshes and tab closes so the demo doesn't reset on reload.
//
// This is per-browser. Different machines / browsers / incognito windows are
// independent. Once we have a real backend, this whole file goes away.
//
// Keys are versioned (":v1") so a future schema change can bump the version
// and start fresh without crashing on stale data.

const STUDENTS_KEY = 'ssat:students:v1'
const CURRENT_USER_KEY = 'ssat:currentUser:v1'
const LOCATION_OSS_KEY = 'ssat:locationOss:v1'
const IMPORT_HISTORY_KEY = 'ssat:importHistory:v1'

function safe(fn, fallback) {
  try {
    return fn()
  } catch (err) {
    console.warn('[storage] operation failed:', err)
    return fallback
  }
}

export function loadStudents(fallback) {
  return safe(() => {
    const raw = localStorage.getItem(STUDENTS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    return parsed
  }, fallback)
}

export function saveStudents(students) {
  safe(() => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students))
  })
}

export function clearStudents() {
  safe(() => {
    localStorage.removeItem(STUDENTS_KEY)
  })
}

export function loadCurrentUser() {
  return safe(() => localStorage.getItem(CURRENT_USER_KEY) || null, null)
}

export function saveCurrentUser(user) {
  safe(() => {
    if (user) localStorage.setItem(CURRENT_USER_KEY, user)
    else localStorage.removeItem(CURRENT_USER_KEY)
  })
}

export function loadLocationOss(fallback) {
  return safe(() => {
    const raw = localStorage.getItem(LOCATION_OSS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    // Merge persisted on top of bundled defaults so new defaults still flow.
    return { ...fallback, ...parsed }
  }, fallback)
}

export function saveLocationOss(mapping) {
  safe(() => {
    localStorage.setItem(LOCATION_OSS_KEY, JSON.stringify(mapping))
  })
}

export function clearLocationOss() {
  safe(() => {
    localStorage.removeItem(LOCATION_OSS_KEY)
  })
}

// Import history: per-source { filename, timestamp, summary } so the toolbar
// can show "last imported" details under each import button.
export function loadImportHistory(fallback) {
  return safe(() => {
    const raw = localStorage.getItem(IMPORT_HISTORY_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    return { ...fallback, ...parsed }
  }, fallback)
}

export function saveImportHistory(history) {
  safe(() => {
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history))
  })
}

export function clearImportHistory() {
  safe(() => {
    localStorage.removeItem(IMPORT_HISTORY_KEY)
  })
}
