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
