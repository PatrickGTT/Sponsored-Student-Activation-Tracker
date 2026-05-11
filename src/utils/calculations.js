// Helper functions for the system fields on a student record.
// All functions are pure — they don't mutate the input — so they can be
// called in render paths without side effects.

import { parseLocalDate } from './format'

const DAY_MS = 1000 * 60 * 60 * 24

function diffDays(from, to) {
  if (!from || !to) return null
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  if (!a || !b) return null
  // Strip time so partial days don't skew the count.
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.round((b - a) / DAY_MS)
}

export function daysSinceEnrollment(student, today = new Date()) {
  return diffDays(student.enrollment_date, today)
}

export function daysSinceLastContact(student, today = new Date()) {
  return diffDays(student.last_contact_date, today)
}

export function daysUntilStart(student, today = new Date()) {
  return diffDays(today, student.class_start_date)
}

// Risk evaluation — applies the High → Medium → Low precedence specified
// in the product brief. Returns { level, reasons } so the UI can show the
// "why" alongside the level.
export function evaluateRisk(student, today = new Date()) {
  const dslc = daysSinceLastContact(student, today)
  const dus = daysUntilStart(student, today)
  const reasons = []

  // ===== High Risk — any of the following =====
  if (!student.class_start_date) {
    reasons.push('No class start date set')
  }
  if (student.lifecycle_status === 'Student Unreachable') {
    reasons.push('Lifecycle: Student Unreachable')
  }
  if (student.lifecycle_status === 'Dropped / No-Show') {
    reasons.push('Lifecycle: Dropped / No-Show')
  }
  if (!student.last_contact_date) {
    reasons.push('No contact recorded')
  }
  if (dslc !== null && dslc > 7) {
    reasons.push(`No contact in ${dslc} days`)
  }
  if (student.lifecycle_status === 'Rescheduled') {
    reasons.push('Student rescheduled')
  }
  if (
    dus !== null &&
    dus >= 0 &&
    dus <= 7 &&
    student.start_date_status !== 'Confirmed'
  ) {
    reasons.push(
      `Starts in ${dus} day${dus === 1 ? '' : 's'} but not Confirmed`,
    )
  }
  if (student.current_ar_balance > 0 && !student.next_follow_up_date) {
    reasons.push('Open AR with no follow-up scheduled')
  }

  if (reasons.length > 0) {
    return { level: 'High', reasons }
  }

  // ===== Medium Risk =====
  if (
    student.class_start_date &&
    student.start_date_status !== 'Confirmed'
  ) {
    reasons.push('Start date set but not Confirmed')
  }
  if (dslc !== null && dslc >= 4 && dslc <= 7) {
    reasons.push(`Last contact ${dslc} days ago`)
  }
  if (student.lifecycle_status === 'Student Contacted – Awaiting Confirmation') {
    reasons.push('Awaiting student confirmation')
  }
  if (student.contact_result === 'Student Requested Delay') {
    reasons.push('Student requested delay')
  }
  if (student.contact_result === 'Needs Paperwork') {
    reasons.push('Paperwork needed')
  }

  if (reasons.length > 0) {
    return { level: 'Medium', reasons }
  }

  return { level: 'Low', reasons: ['On track'] }
}

// Convenience wrapper that matches the field name in the data model spec.
export function calculateRiskLevel(student, today = new Date()) {
  return evaluateRisk(student, today).level
}

// Priority This Week inclusion — a student lands on the priority list if
// any of these are true.
export function isPriorityThisWeek(student, today = new Date()) {
  if (evaluateRisk(student, today).level === 'High') return true
  if (!student.class_start_date) return true

  if (student.next_follow_up_date) {
    const dnf = diffDays(today, student.next_follow_up_date)
    if (dnf !== null && dnf <= 0) return true
  }

  const dus = daysUntilStart(student, today)
  if (dus !== null && dus >= 0 && dus <= 14) return true

  return false
}

// One short label that explains why a student is on the priority list.
// Used in the "Why Priority" column.
export function priorityReason(student, today = new Date()) {
  const risk = evaluateRisk(student, today)
  if (risk.level === 'High') return risk.reasons[0]

  if (!student.class_start_date) return 'No class start date set'

  if (student.next_follow_up_date) {
    const dnf = diffDays(today, student.next_follow_up_date)
    if (dnf !== null && dnf <= 0) {
      if (dnf === 0) return 'Follow-up due today'
      return `Follow-up overdue by ${-dnf} day${-dnf === 1 ? '' : 's'}`
    }
  }

  const dus = daysUntilStart(student, today)
  if (dus !== null && dus >= 0 && dus <= 14) {
    if (dus === 0) return 'Scheduled to start today'
    return `Starts in ${dus} day${dus === 1 ? '' : 's'}`
  }

  return 'On watch'
}

// "Needs My Update" inclusion — students assigned to the current OSS user
// that need attention from them specifically.
export function needsMyUpdate(student, ossUser, today = new Date()) {
  if (!ossUser || student.oss_owner !== ossUser) return false
  if (evaluateRisk(student, today).level === 'High') return true
  if (student.next_follow_up_date) {
    const dnf = diffDays(today, student.next_follow_up_date)
    if (dnf !== null && dnf <= 0) return true
  }
  if (student.lifecycle_status === 'Agency Approved / Need to Confirm Start Date') return true
  return false
}

// Default sort for every student-list view: earliest class start date first.
// Students with no class start date sort to the end (TBD). Student name acts
// as a stable tiebreaker.
export function compareByStartDate(a, b) {
  const aDate = a.class_start_date
  const bDate = b.class_start_date
  if (aDate && bDate) {
    if (aDate < bDate) return -1
    if (aDate > bDate) return 1
  } else if (aDate) {
    return -1
  } else if (bDate) {
    return 1
  }
  return (a.student_name || '').localeCompare(b.student_name || '')
}

// Sort comparator for the Priority This Week view (retained for reference,
// not currently used — every view now sorts by class start date instead).
// Order: High Risk first → earliest start date → largest AR → oldest last contact.
const RISK_ORDER = { High: 0, Medium: 1, Low: 2 }

export function comparePriority(a, b) {
  const r = (RISK_ORDER[a.risk_level] ?? 99) - (RISK_ORDER[b.risk_level] ?? 99)
  if (r !== 0) return r

  // Earliest start date wins. Records with no start date sort to the end —
  // they're already pulled to the top of the list by the High Risk rule.
  const aStart = parseLocalDate(a.class_start_date)?.getTime() ?? Number.POSITIVE_INFINITY
  const bStart = parseLocalDate(b.class_start_date)?.getTime() ?? Number.POSITIVE_INFINITY
  if (aStart !== bStart) return aStart - bStart

  // Largest AR wins.
  const arDelta = (b.current_ar_balance || 0) - (a.current_ar_balance || 0)
  if (arDelta !== 0) return arDelta

  // Oldest last contact wins. Null is treated as oldest possible (most urgent).
  const aContact = parseLocalDate(a.last_contact_date)?.getTime() ?? Number.NEGATIVE_INFINITY
  const bContact = parseLocalDate(b.last_contact_date)?.getTime() ?? Number.NEGATIVE_INFINITY
  return aContact - bContact
}
