import { StatusBadge } from './Badge'
import { fmtDate, fmtMoney, parseLocalDate } from '../utils/format'

// Lifecycle states that represent "has started" or later — for filtering
// "missed start" vs "started" sections.
const STARTED_OR_LATER = new Set([
  'Started',
  'Completed / Ready to Bill',
  'Billing Submitted to Agency',
  'Paid',
])

const PRE_START = new Set([
  'Agency Approved / Need to Confirm Start Date',
  'Start Date Confirmed',
  'Student Contacted – Awaiting Confirmation',
  'Student Unreachable',
  'Rescheduled',
  'Issue / Escalation',
])

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

export default function DailyReport({ students, onSelect }) {
  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const inSevenDays = new Date(today)
  inSevenDays.setDate(today.getDate() + 7)

  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // ---- Buckets ----
  const startedYesterday = students.filter((s) => {
    const d = parseLocalDate(s.class_start_date)
    if (!d) return false
    return isSameDay(d, yesterday) && STARTED_OR_LATER.has(s.lifecycle_status)
  })

  const missedYesterday = students.filter((s) => {
    const d = parseLocalDate(s.class_start_date)
    if (!d) return false
    return isSameDay(d, yesterday) && !STARTED_OR_LATER.has(s.lifecycle_status)
  })

  const startingToday = students.filter((s) => {
    const d = parseLocalDate(s.class_start_date)
    if (!d) return false
    return isSameDay(d, today) && !STARTED_OR_LATER.has(s.lifecycle_status)
  })

  const startingThisWeek = students.filter((s) => {
    const d = parseLocalDate(s.class_start_date)
    if (!d) return false
    const day = startOfDay(d)
    return (
      day > today &&
      day <= inSevenDays &&
      !STARTED_OR_LATER.has(s.lifecycle_status)
    )
  })

  const missingStartDate = students.filter(
    (s) => !s.class_start_date && PRE_START.has(s.lifecycle_status),
  )

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900">
            Daily Activation Report
          </h2>
          <div className="text-sm text-slate-500">{todayLabel}</div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          What happened yesterday, what's on for today, and what's coming.
          Click any student to open their record.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section
          tone="success"
          title="Started Yesterday"
          subtitle="Students whose class start date was yesterday and lifecycle moved to Started."
          students={startedYesterday}
          emptyMessage="No students were scheduled to start yesterday."
          onSelect={onSelect}
        />
        <Section
          tone="alert"
          title="Missed Start Yesterday — Escalate"
          subtitle="Scheduled to start yesterday but lifecycle isn't Started. OSS to follow up today."
          students={missedYesterday}
          emptyMessage="No missed starts yesterday. ✓"
          onSelect={onSelect}
        />
      </div>

      <Section
        tone="info"
        title="Starting Today"
        subtitle="Should be in class today. Confirm attendance."
        students={startingToday}
        emptyMessage="No students scheduled to start today."
        onSelect={onSelect}
      />

      <Section
        tone="info"
        title="Starting This Week"
        subtitle="Class start in the next 7 days. Verify confirmations before start day."
        students={startingThisWeek}
        emptyMessage="No starts scheduled in the next 7 days."
        onSelect={onSelect}
      />

      <Section
        tone="warn"
        title="Missing Start Date"
        subtitle="Sponsored students with no class start scheduled. OSS to slot into a cohort."
        students={missingStartDate}
        emptyMessage="No sponsored students missing a start date. ✓"
        onSelect={onSelect}
      />
    </div>
  )
}

function Section({ tone, title, subtitle, students, emptyMessage, onSelect }) {
  const accent =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/40'
      : tone === 'alert'
      ? 'border-rose-200 bg-rose-50/40'
      : tone === 'warn'
      ? 'border-amber-200 bg-amber-50/40'
      : 'border-slate-200 bg-white'

  return (
    <div className={`rounded-lg border ${accent} px-5 py-4`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-sm font-semibold text-slate-900">
          {students.length}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500 italic">{emptyMessage}</div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {students.map((s) => (
            <li
              key={s.student_id}
              onClick={() => onSelect(s)}
              className="py-2 cursor-pointer hover:bg-white rounded px-2 -mx-2 flex items-center gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900">
                  {s.student_name}
                </div>
                <div className="text-xs text-slate-500">
                  {s.location} · OSS {s.oss_owner || '—'} · {s.agency_or_sponsor}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={s.lifecycle_status} />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Start</div>
                <div className="text-sm text-slate-900">
                  {fmtDate(s.class_start_date)}
                </div>
              </div>
              <div className="text-right min-w-[80px]">
                <div className="text-xs text-slate-500">AR</div>
                <div className="text-sm font-medium text-slate-900">
                  {fmtMoney(s.current_ar_balance)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
