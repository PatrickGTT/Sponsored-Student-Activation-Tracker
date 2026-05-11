// Forecasted agency collections per student.
//
// Two pure functions:
//   computeForecast(student, today)  — auto-derived from lifecycle_status.
//   resolveForecast(student, today)  — applies the manual override fields,
//                                      falling back to computeForecast values.
//
// The override fields on a student record are:
//   expected_payment_date   (string YYYY-MM-DD or null)
//   expected_payment_amount (number or null)
//   forecast_confidence     ('High' | 'Medium' | 'Low' | null)
//   forecast_notes          (string)

import { parseLocalDate } from './format'

export const PROGRAM_DURATION_DAYS = 28

const ZERO_AMOUNT_LIFECYCLES = new Set([
  'Student Unreachable',
  'Dropped / No-Show',
  'Issue / Escalation',
])

function addDays(date, n) {
  const d = parseLocalDate(date)
  if (!d) return null
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d
}

function toIsoDate(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : parseLocalDate(d)
  if (!dt || Number.isNaN(dt.getTime())) return null
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function computeForecast(student, today = new Date()) {
  const status = student.lifecycle_status
  const ar = student.current_ar_balance || 0

  switch (status) {
    case 'Paid':
      return {
        expectedDate: null,
        expectedAmount: 0,
        confidence: 'High',
        reason: 'Already paid in full.',
      }

    case 'Completed / Ready to Bill':
      return {
        expectedDate: toIsoDate(addDays(today, 14)),
        expectedAmount: ar,
        confidence: 'High',
        reason: 'Ready to bill — agency typically pays within 14 days of invoicing.',
      }

    case 'Billing Submitted to Agency':
      return {
        expectedDate: toIsoDate(addDays(today, 14)),
        expectedAmount: ar,
        confidence: 'High',
        reason: 'Invoice with agency — typical pay cycle 14 days.',
      }

    case 'Started':
      return {
        expectedDate: student.class_start_date
          ? toIsoDate(addDays(student.class_start_date, PROGRAM_DURATION_DAYS + 14))
          : toIsoDate(addDays(today, PROGRAM_DURATION_DAYS + 14)),
        expectedAmount: ar,
        confidence: 'Medium',
        reason: `Started — class_start + ${PROGRAM_DURATION_DAYS}-day program + 14-day agency lag.`,
      }

    case 'Start Date Confirmed':
      return {
        expectedDate: student.class_start_date
          ? toIsoDate(addDays(student.class_start_date, PROGRAM_DURATION_DAYS + 21))
          : null,
        expectedAmount: ar,
        confidence: 'Medium',
        reason: `Confirmed start — class_start + ${PROGRAM_DURATION_DAYS}-day program + 21-day buffer.`,
      }

    case 'Rescheduled':
      return {
        expectedDate: student.class_start_date
          ? toIsoDate(addDays(student.class_start_date, PROGRAM_DURATION_DAYS + 21))
          : null,
        expectedAmount: ar,
        confidence: 'Low',
        reason: 'Rescheduled — start date may shift again.',
      }

    case 'Agency Approved / Pending Start Date':
      return {
        expectedDate: null,
        expectedAmount: ar,
        confidence: 'Low',
        reason: 'No class start date set — collection date TBD.',
      }

    case 'Student Contacted – Awaiting Confirmation':
      return {
        expectedDate: null,
        expectedAmount: ar,
        confidence: 'Low',
        reason: 'Awaiting student confirmation — collection date TBD.',
      }

    default:
      if (ZERO_AMOUNT_LIFECYCLES.has(status)) {
        return {
          expectedDate: null,
          expectedAmount: 0,
          confidence: 'Low',
          reason: `${status} — assume not collectible without manual override.`,
        }
      }
      return {
        expectedDate: null,
        expectedAmount: 0,
        confidence: 'Low',
        reason: 'No forecast rule for current lifecycle.',
      }
  }
}

export function resolveForecast(student, today = new Date()) {
  const computed = computeForecast(student, today)

  const overrideDate =
    student.expected_payment_date != null && student.expected_payment_date !== ''
      ? student.expected_payment_date
      : null
  const overrideAmount =
    student.expected_payment_amount != null && student.expected_payment_amount !== ''
      ? Number(student.expected_payment_amount)
      : null
  const overrideConfidence =
    student.forecast_confidence != null && student.forecast_confidence !== ''
      ? student.forecast_confidence
      : null

  const isOverridden =
    overrideDate != null || overrideAmount != null || overrideConfidence != null

  return {
    expectedDate: overrideDate ?? computed.expectedDate,
    expectedAmount: overrideAmount != null ? overrideAmount : computed.expectedAmount,
    confidence: overrideConfidence ?? computed.confidence,
    notes: student.forecast_notes || null,
    reason: computed.reason,
    isOverridden,
    computed,
  }
}
