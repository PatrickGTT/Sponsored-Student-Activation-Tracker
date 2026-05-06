// Student-shape-aware CSV import + export.
//
// Import path: parseStudentsCsv(text) → { students, errors, importedCount }.
// Export path: build*Csv(students) → CSV string ready for downloadCsv().
//
// On import, missing fields are filled with safe defaults (see DEFAULTS below).
// `student_id` is honored if present, otherwise generated as S-IMP-NNNN.

import { LIFECYCLE_STATUSES } from '../data/students'
import { comparePriority } from './calculations'
import { parseCsv, toCsv } from './csv'

// Columns the user said the import CSV must accept.
export const IMPORT_COLUMNS = [
  'student_name',
  'location',
  'oss_owner',
  'advisor_name',
  'agency_or_sponsor',
  'invoice_number',
  'invoice_amount',
  'current_ar_balance',
  'funding_type',
  'enrollment_date',
  'class_start_date',
  'lifecycle_status',
  'last_contact_date',
  'next_follow_up_date',
  'notes',
]

const VALID_LIFECYCLES = new Set(LIFECYCLE_STATUSES)
const VALID_CONFIDENCE = new Set(['High', 'Medium', 'Low'])
const DEFAULT_LIFECYCLE = 'Agency Approved / Pending Start Date'

// ---------- Import ----------

export function parseStudentsCsv(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) {
    return { students: [], errors: ['CSV is empty.'], importedCount: 0 }
  }

  const headers = rows[0].map(normalizeHeader)
  if (!headers.includes('student_name')) {
    return {
      students: [],
      errors: ['CSV must have a student_name column.'],
      importedCount: 0,
    }
  }

  const errors = []
  const students = []
  let nextSeq = 1

  rows.slice(1).forEach((rawRow, idx) => {
    const record = {}
    headers.forEach((h, i) => {
      record[h] = (rawRow[i] || '').trim()
    })

    if (!record.student_name) {
      errors.push(`Row ${idx + 2}: missing student_name — skipped.`)
      return
    }

    const lifecycle = record.lifecycle_status
    let resolvedLifecycle = DEFAULT_LIFECYCLE
    if (lifecycle) {
      if (VALID_LIFECYCLES.has(lifecycle)) {
        resolvedLifecycle = lifecycle
      } else {
        errors.push(
          `Row ${idx + 2}: unknown lifecycle_status "${lifecycle}", defaulted to "${DEFAULT_LIFECYCLE}".`,
        )
      }
    }

    const classStart = parseDate(record.class_start_date)

    students.push({
      student_id:
        record.student_id || `S-IMP-${String(nextSeq).padStart(4, '0')}`,
      student_name: record.student_name,
      location: record.location || '',
      oss_owner: record.oss_owner || '',
      advisor_name: record.advisor_name || '',
      agency_or_sponsor: record.agency_or_sponsor || '',
      invoice_number: record.invoice_number || '',
      invoice_amount: parseNumber(record.invoice_amount),
      current_ar_balance: parseNumber(record.current_ar_balance),
      funding_type: record.funding_type || '',
      enrollment_date: parseDate(record.enrollment_date),
      class_start_date: classStart,
      // start_date_status isn't in the import spec — derive a sensible default.
      start_date_status: record.start_date_status || (classStart ? 'Tentative' : 'Not Set'),
      lifecycle_status: resolvedLifecycle,
      last_contact_date: parseDate(record.last_contact_date),
      contact_method: record.contact_method || null,
      contact_result: record.contact_result || null,
      next_follow_up_date: parseDate(record.next_follow_up_date),
      notes: record.notes || '',
      last_updated_at: new Date().toISOString(),
      last_updated_by: 'CSV Import',
      // Forecast overrides — preserved if present (so Export All → Import
      // round-trips cleanly). Empty / missing → null = "use computed".
      expected_payment_date: parseDate(record.expected_payment_date),
      expected_payment_amount:
        record.expected_payment_amount === '' ||
        record.expected_payment_amount == null
          ? null
          : parseNumber(record.expected_payment_amount),
      forecast_confidence: VALID_CONFIDENCE.has(record.forecast_confidence)
        ? record.forecast_confidence
        : null,
      forecast_notes: record.forecast_notes || '',
    })
    nextSeq++
  })

  return { students, errors, importedCount: students.length }
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function parseNumber(v) {
  if (v == null || v === '') return 0
  const cleaned = String(v).replace(/[$,\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function parseDate(v) {
  if (!v) return null
  const trimmed = String(v).trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------- Exports ----------

const ALL_STUDENTS_COLUMNS = [
  'student_id',
  'student_name',
  'location',
  'oss_owner',
  'advisor_name',
  'agency_or_sponsor',
  'invoice_number',
  'invoice_amount',
  'current_ar_balance',
  'funding_type',
  'enrollment_date',
  'class_start_date',
  'start_date_status',
  'lifecycle_status',
  'last_contact_date',
  'contact_method',
  'contact_result',
  'next_follow_up_date',
  'notes',
  'last_updated_at',
  'last_updated_by',
  'expected_payment_date',
  'expected_payment_amount',
  'forecast_confidence',
  'forecast_notes',
]

export function buildAllStudentsCsv(students) {
  const rows = [ALL_STUDENTS_COLUMNS]
  for (const s of students) {
    rows.push(ALL_STUDENTS_COLUMNS.map((c) => csvValue(s[c])))
  }
  return toCsv(rows)
}

const PRIORITY_COLUMNS = [
  'student_id',
  'student_name',
  'location',
  'oss_owner',
  'agency_or_sponsor',
  'lifecycle_status',
  'risk_level',
  'priority_reason',
  'class_start_date',
  'days_until_start',
  'current_ar_balance',
  'last_contact_date',
  'days_since_last_contact',
  'contact_result',
  'next_follow_up_date',
]

export function buildPriorityCsv(enrichedStudents) {
  const priority = enrichedStudents
    .filter((s) => s.is_priority)
    .slice()
    .sort(comparePriority)
  const rows = [PRIORITY_COLUMNS]
  for (const s of priority) {
    rows.push(PRIORITY_COLUMNS.map((c) => csvValue(s[c])))
  }
  return toCsv(rows)
}

const FORECAST_COLUMNS = [
  'student_id',
  'student_name',
  'location',
  'oss_owner',
  'agency_or_sponsor',
  'lifecycle_status',
  'current_ar_balance',
  'expected_payment_date',
  'expected_payment_amount',
  'week_starting',
  'forecast_confidence',
  'forecast_source',
  'forecast_notes_or_reason',
]

export function buildForecastCsv(enrichedStudents) {
  const rows = [FORECAST_COLUMNS]
  for (const s of enrichedStudents) {
    const f = s.forecast
    if (!f) continue
    rows.push([
      csvValue(s.student_id),
      csvValue(s.student_name),
      csvValue(s.location),
      csvValue(s.oss_owner),
      csvValue(s.agency_or_sponsor),
      csvValue(s.lifecycle_status),
      csvValue(s.current_ar_balance),
      csvValue(f.expectedDate),
      csvValue(f.expectedAmount),
      csvValue(weekStarting(f.expectedDate)),
      csvValue(f.confidence),
      csvValue(f.isOverridden ? 'Override' : 'Computed'),
      csvValue(f.notes || f.reason),
    ])
  }
  return toCsv(rows)
}

function weekStarting(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function csvValue(v) {
  if (v == null) return ''
  return v
}
