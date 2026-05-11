// Student-shape-aware CSV import + export.
//
// Import:
//   parseStudentsCsv(text, existingStudents)
//     → { upserted, added, updated, skipped, filtered, errors }
//
// Import is UPSERT-only — it never wipes OSS-entered fields. Match key:
//   1. student_id (if the CSV has one)
//   2. email (normalized to lowercase)
//   3. student_name + phone (fallback)
//
// PowerSuite-style headers are auto-translated:
//   FirstName + LastName  → student_name
//   Balance               → current_ar_balance
//   StartDate             → class_start_date
//   Funding               → funding_type
//
// Sponsored-only filter: rows with empty funding or funding="Self Paid" are
// filtered out. The tracker scope is sponsored students.

import { LIFECYCLE_STATUSES, LOCATION_TO_OSS } from '../data/students'
import { comparePriority } from './calculations'
import { parseCsv, toCsv } from './csv'
import { parseLocalDate } from './format'

const VALID_LIFECYCLES = new Set(LIFECYCLE_STATUSES)
const VALID_CONFIDENCE = new Set(['High', 'Medium', 'Low'])
const DEFAULT_LIFECYCLE = 'Agency Approved / Pending Start Date'

// Funding values we treat as sponsored. Everything else (empty, "Self Paid",
// "Cash", etc.) is filtered out at import.
const SPONSORED_FUNDING = new Set([
  'UNISA',
  'WIOA',
  'GI-Bill',
  'VA',
  'Voc Rehab',
  'Affirm',
  'Finance',
])

// ---------- Import ----------

export function parseStudentsCsv(text, existingStudents = []) {
  const rows = parseCsv(text)
  if (rows.length === 0) {
    return {
      upserted: existingStudents,
      added: 0,
      updated: 0,
      skipped: 0,
      filtered: 0,
      errors: ['CSV is empty.'],
    }
  }

  const headers = rows[0].map(normalizeHeader)
  const errors = []

  // Build lookups against existing students (for upsert matching).
  const byId = new Map()
  const byEmail = new Map()
  const byNamePhone = new Map()
  for (const s of existingStudents) {
    if (s.student_id) byId.set(s.student_id.toLowerCase(), s)
    if (s.email) byEmail.set(s.email.toLowerCase().trim(), s)
    if (s.student_name && s.phone) {
      byNamePhone.set(`${s.student_name.toLowerCase().trim()}|${s.phone.trim()}`, s)
    }
  }

  // We don't strictly require `student_name` in the header — PowerSuite splits
  // it into FirstName / LastName. As long as one of them exists, we're OK.
  const hasName =
    headers.includes('student_name') ||
    headers.includes('firstname') ||
    headers.includes('lastname')
  if (!hasName) {
    return {
      upserted: existingStudents,
      added: 0,
      updated: 0,
      skipped: 0,
      filtered: 0,
      errors: [
        'CSV must include either a student_name column or FirstName + LastName columns.',
      ],
    }
  }

  let added = 0
  let updated = 0
  let skipped = 0
  let filtered = 0
  // Clone the existing list so we can splice in updates.
  const merged = existingStudents.map((s) => ({ ...s }))
  const indexById = new Map(merged.map((s, i) => [s.student_id, i]))

  rows.slice(1).forEach((rawRow, idx) => {
    const record = {}
    headers.forEach((h, i) => {
      record[h] = (rawRow[i] || '').trim()
    })

    // Translate PowerSuite shape into our field names.
    const firstName = record.firstname || ''
    const lastName = record.lastname || ''
    if (!record.student_name && (firstName || lastName)) {
      record.student_name = `${firstName} ${lastName}`.trim()
    }
    if (!record.current_ar_balance && record.balance != null) {
      record.current_ar_balance = record.balance
    }
    if (!record.class_start_date && record.startdate) {
      record.class_start_date = record.startdate
    }
    if (!record.funding_type && record.funding) {
      record.funding_type = record.funding
    }

    if (!record.student_name) {
      errors.push(`Row ${idx + 2}: missing student name — skipped.`)
      skipped++
      return
    }

    // ---- Filter: skip only Self Paid rows. ----
    // Empty funding is intentionally KEPT — those may be future-agency
    // students who haven't been set up with funding yet, and we don't want
    // them slipping through the cracks. An OSS can flag the funding when it
    // arrives.
    const funding = (record.funding_type || '').trim()
    if (funding.toLowerCase() === 'self paid') {
      filtered++
      return
    }
    // Normalize funding casing against our known list (case-insensitive match).
    // Empty funding stays empty — surfaces in the UI as "—".
    const fundingNormalized = funding ? normalizeFunding(funding) : ''

    // ---- Upsert lookup ----
    const lookupEmail = (record.email || '').toLowerCase().trim()
    const lookupNamePhone = record.student_name && record.phone
      ? `${record.student_name.toLowerCase().trim()}|${record.phone.trim()}`
      : null

    let existing = null
    if (record.student_id && byId.has(record.student_id.toLowerCase())) {
      existing = byId.get(record.student_id.toLowerCase())
    } else if (lookupEmail && byEmail.has(lookupEmail)) {
      existing = byEmail.get(lookupEmail)
    } else if (lookupNamePhone && byNamePhone.has(lookupNamePhone)) {
      existing = byNamePhone.get(lookupNamePhone)
    }

    // Validate lifecycle if provided.
    let lifecycle = existing ? existing.lifecycle_status : DEFAULT_LIFECYCLE
    if (record.lifecycle_status) {
      if (VALID_LIFECYCLES.has(record.lifecycle_status)) {
        // Only adopt the imported lifecycle if it's a NEW student. For existing
        // students we never overwrite the OSS-curated status from a CSV import.
        if (!existing) lifecycle = record.lifecycle_status
      } else {
        errors.push(
          `Row ${idx + 2}: unknown lifecycle_status "${record.lifecycle_status}" — ignored.`,
        )
      }
    }

    const classStart = parseDate(record.class_start_date)
    const location = record.location || (existing?.location ?? '')
    const ossOwner =
      record.oss_owner ||
      existing?.oss_owner ||
      LOCATION_TO_OSS[location] ||
      ''

    // Fields that always come from the import (PowerSuite / QBO source-of-truth):
    const importedFields = {
      student_name: record.student_name,
      email: record.email || existing?.email || '',
      phone: record.phone || existing?.phone || '',
      location,
      advisor_name: record.advisor_name || existing?.advisor_name || '',
      agency_or_sponsor:
        record.agency_or_sponsor || existing?.agency_or_sponsor || fundingNormalized,
      invoice_number: record.invoice_number || existing?.invoice_number || '',
      invoice_amount: parseNumber(
        record.invoice_amount != null && record.invoice_amount !== ''
          ? record.invoice_amount
          : existing?.invoice_amount,
      ),
      current_ar_balance: parseNumber(record.current_ar_balance),
      funding_type: fundingNormalized,
      enrollment_date:
        parseDate(record.enrollment_date) || existing?.enrollment_date || null,
      class_start_date: classStart || existing?.class_start_date || null,
    }

    if (existing) {
      // ---- UPDATE path: preserve OSS-entered fields ----
      const idx = indexById.get(existing.student_id)
      merged[idx] = {
        ...existing,
        ...importedFields,
        oss_owner: existing.oss_owner || ossOwner,
        // Adjust start_date_status only if the start date materially changed.
        start_date_status:
          classStart && classStart !== existing.class_start_date
            ? 'Tentative'
            : existing.start_date_status,
        last_updated_at: new Date().toISOString(),
        last_updated_by: 'CSV Import',
      }
      updated++
    } else {
      // ---- INSERT path: brand-new student ----
      merged.push({
        student_id: record.student_id || generateId(merged),
        ...importedFields,
        oss_owner: ossOwner,
        start_date_status: classStart ? 'Tentative' : 'Not Set',
        lifecycle_status: lifecycle,
        last_contact_date: parseDate(record.last_contact_date) || null,
        contact_method: record.contact_method || null,
        contact_result: record.contact_result || null,
        next_follow_up_date: parseDate(record.next_follow_up_date) || null,
        notes: record.notes || '',
        last_updated_at: new Date().toISOString(),
        last_updated_by: 'CSV Import',
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
      added++
    }
  })

  return {
    upserted: merged,
    added,
    updated,
    skipped,
    filtered,
    errors,
  }
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function normalizeFunding(v) {
  const t = v.trim()
  const known = [
    'UNISA',
    'WIOA',
    'GI-Bill',
    'VA',
    'Voc Rehab',
    'Affirm',
    'Finance',
  ]
  const match = known.find((k) => k.toLowerCase() === t.toLowerCase())
  return match || t
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

function generateId(existing) {
  // Auto-assign an IMP-#### id. Find the next number that doesn't collide.
  let n = existing.length + 1
  const taken = new Set(existing.map((s) => s.student_id))
  while (taken.has(`IMP-${String(n).padStart(4, '0')}`)) n++
  return `IMP-${String(n).padStart(4, '0')}`
}

// ---------- Exports ----------

const ALL_STUDENTS_COLUMNS = [
  'student_id',
  'student_name',
  'email',
  'phone',
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
  'email',
  'phone',
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
  const d = parseLocalDate(dateStr)
  if (!d) return ''
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
