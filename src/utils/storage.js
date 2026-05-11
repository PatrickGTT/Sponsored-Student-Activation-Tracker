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

// One-off lifecycle rename map. When we change a status name, the existing
// localStorage data may still carry the old name — this migrates on load so
// users don't have to reset/re-import.
const LIFECYCLE_RENAMES = {
  'Agency Approved / Pending Start Date':
    'Agency Approved / Need to Confirm Start Date',
}

const NEW_DEFAULT_LIFECYCLE = 'Agency Approved / Need to Confirm Start Date'

function migrateStudent(s) {
  let migrated = s

  // 1. Old name → new name.
  const renamed = LIFECYCLE_RENAMES[migrated.lifecycle_status]
  if (renamed) {
    migrated = { ...migrated, lifecycle_status: renamed }
  }

  // 2. Demote stale "Start Date Confirmed" imports. An earlier version of
  //    the importer auto-set this lifecycle whenever PowerSuite had a class
  //    start date. The OSS hadn't actually confirmed anything — that's
  //    misleading. Walk those records back to the neutral default.
  //    Only touches records still in the import default state (last edit
  //    was CSV Import) — anything an OSS has worked is left alone.
  if (
    migrated.lifecycle_status === 'Start Date Confirmed' &&
    migrated.last_updated_by === 'CSV Import'
  ) {
    migrated = { ...migrated, lifecycle_status: NEW_DEFAULT_LIFECYCLE }
  }

  return migrated
}

export function loadStudents(fallback) {
  return safe(() => {
    const raw = localStorage.getItem(STUDENTS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    return parsed.map(migrateStudent)
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
