// Parses a date input as a LOCAL-time Date.
//
// Why this exists: `new Date("2026-05-09")` is parsed as UTC midnight per the
// ECMAScript spec. In a US timezone that converts to the previous evening,
// so display formatters then show the wrong day. This helper detects pure
// YYYY-MM-DD strings and constructs them with the local-time Date(y, m, d)
// constructor so they stay anchored to the calendar day the user typed.
//
// Date objects pass through unchanged. Other string forms (ISO datetimes
// with explicit timezone, M/D/YYYY, etc.) fall back to the native parser.
export function parseLocalDate(input) {
  if (input == null || input === '') return null
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }
  const str = String(input).trim()
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

export function fmtDate(d) {
  const date = parseLocalDate(d)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function fmtDateTime(d) {
  if (!d) return '—'
  // ISO datetimes (e.g. last_updated_at) carry their own timezone — let the
  // native parser handle them.
  const date = typeof d === 'string' && d.includes('T') ? new Date(d) : parseLocalDate(d)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function fmtRelative(d) {
  if (!d) return '—'
  // Same logic as fmtDateTime — ISO timestamps go to native, plain dates go
  // through parseLocalDate.
  const date = typeof d === 'string' && d.includes('T') ? new Date(d) : parseLocalDate(d)
  if (!date || Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return fmtDate(d)
}

export function fmtMoney(n) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

// HTML date inputs need yyyy-mm-dd. Uses parseLocalDate so the input value
// stays aligned with the visible date.
export function toInputDate(d) {
  if (!d) return ''
  const dt = parseLocalDate(d)
  if (!dt) return ''
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
