import { LIFECYCLE_STATUSES } from '../data/students'
import { fmtMoney, parseLocalDate } from '../utils/format'

// Lifecycle states where the student hasn't started class yet — used by the
// "Starting in Next 7 Days" KPI to avoid double-counting students who have
// already started.
const PRE_START_LIFECYCLE = new Set([
  'Agency Approved / Need to Confirm Start Date',
  'Start Date Confirmed',
  'Student Contacted – Awaiting Confirmation',
  'Student Unreachable',
  'Rescheduled',
])

// Lifecycle states where the student has started/completed and the AR is
// expected to be collectible from the agency soon (Paid is excluded — already
// in the bank).
const COLLECTIBLE_LIFECYCLE = new Set([
  'Started',
  'Completed / Ready to Bill',
  'Billing Submitted to Agency',
])

const LIFECYCLE_BAR_COLOR = {
  'Agency Approved / Need to Confirm Start Date': 'bg-slate-400',
  'Start Date Confirmed': 'bg-blue-500',
  'Student Contacted – Awaiting Confirmation': 'bg-sky-500',
  'Student Unreachable': 'bg-red-500',
  Rescheduled: 'bg-amber-500',
  Started: 'bg-emerald-500',
  'Completed / Ready to Bill': 'bg-teal-500',
  'Billing Submitted to Agency': 'bg-indigo-500',
  Paid: 'bg-violet-500',
  'Dropped / No-Show': 'bg-rose-500',
  'Issue / Escalation': 'bg-red-600',
}

export default function LeadershipDashboard({ students }) {
  const total = students.length
  const totalAr = sumAr(students)
  const missingStart = students.filter((s) => !s.class_start_date).length
  const highRiskCount = students.filter((s) => s.risk_level === 'High').length
  const startingNext7 = students.filter(
    (s) =>
      s.days_until_start !== null &&
      s.days_until_start >= 0 &&
      s.days_until_start <= 7 &&
      PRE_START_LIFECYCLE.has(s.lifecycle_status),
  ).length
  const contactedThisWeek = students.filter(
    (s) =>
      s.days_since_last_contact !== null &&
      s.days_since_last_contact >= 0 &&
      s.days_since_last_contact <= 7,
  ).length
  const expectedCollections = sumAr(
    students.filter((s) => COLLECTIBLE_LIFECYCLE.has(s.lifecycle_status)),
  )

  const kpis = [
    { label: 'Total Sponsored Students', value: total },
    {
      label: 'Total Sponsored AR Balance',
      value: fmtMoney(totalAr),
      sub: 'Sponsored only — Self-Paid AR tracked separately',
    },
    {
      label: 'Students Missing Start Date',
      value: missingStart,
      tone: 'amber',
    },
    { label: 'High Risk Students', value: highRiskCount, tone: 'red' },
    {
      label: 'Starting in Next 7 Days',
      value: startingNext7,
      tone: 'blue',
      sub: 'Pre-start lifecycle only',
    },
    {
      label: 'Contacted This Week',
      value: contactedThisWeek,
      tone: 'green',
      sub: 'Last 7 days',
    },
    {
      label: 'Expected Agency Collections',
      value: fmtMoney(expectedCollections),
      tone: 'green',
      sub: 'AR from Started / Completed / Billing',
    },
  ]

  const lifecycleRows = LIFECYCLE_STATUSES.map((status) => ({
    label: status,
    value: students.filter((s) => s.lifecycle_status === status).length,
    color: LIFECYCLE_BAR_COLOR[status],
  }))

  const missingByOss = groupCounts(
    students.filter((s) => !s.class_start_date),
    'oss_owner',
    'bg-amber-500',
  )

  const upcomingByWeek = buildWeekBuckets(students, 6)

  return (
    <section className="space-y-6">
      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Upcoming Starts by Week"
          subtitle="Class start dates over the next 6 weeks"
        >
          <BarChart rows={upcomingByWeek} showZero />
        </ChartCard>

        <ChartCard
          title="Students Missing Start Date by OSS Owner"
          subtitle="Who needs to push for a start date"
        >
          <BarChart
            rows={missingByOss}
            emptyMessage="No students are missing a start date."
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Students by Lifecycle Status"
        subtitle="Distribution across the activation pipeline"
      >
        <BarChart rows={lifecycleRows} showZero />
      </ChartCard>
    </section>
  )
}

// ---------- Layout helpers ----------

function KpiGrid({ kpis }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <KpiCard key={k.label} {...k} />
      ))}
    </div>
  )
}

const TONE_BORDER = {
  red: 'border-red-200',
  amber: 'border-amber-200',
  green: 'border-emerald-200',
  blue: 'border-blue-200',
}

function KpiCard({ label, value, sub, tone }) {
  const border = TONE_BORDER[tone] || 'border-slate-200'
  return (
    <div className={`bg-white rounded-lg border ${border} px-5 py-4`}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function BarChart({
  rows,
  formatValue,
  showZero = false,
  emptyMessage = 'No data.',
}) {
  const filtered = showZero ? rows : rows.filter((r) => r.value > 0)
  if (filtered.length === 0) {
    return <div className="text-sm text-slate-500 italic py-2">{emptyMessage}</div>
  }
  const max = filtered.reduce((m, r) => Math.max(m, r.value), 0)
  return (
    <div className="space-y-2.5">
      {filtered.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between items-baseline text-xs text-slate-700 mb-1 gap-2">
            <span className="truncate">{r.label}</span>
            <span className="font-medium text-slate-900 whitespace-nowrap">
              {formatValue ? formatValue(r.value) : r.value}
              {r.suffix && (
                <span className="font-normal text-slate-500">{r.suffix}</span>
              )}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${r.color || 'bg-blue-500'}`}
              style={{ width: max > 0 ? `${(r.value / max) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Data helpers ----------

function sumAr(students) {
  return students.reduce((sum, s) => sum + (s.current_ar_balance || 0), 0)
}

function groupCounts(students, key, color) {
  const map = new Map()
  for (const s of students) {
    const k = s[key] || '—'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, color }))
    .sort((a, b) => b.value - a.value)
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return d
}

function formatWeekLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildWeekBuckets(students, weekCount) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstMonday = startOfWeek(today)

  return Array.from({ length: weekCount }, (_, i) => {
    const weekStart = new Date(firstMonday)
    weekStart.setDate(firstMonday.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const count = students.filter((s) => {
      const sd = parseLocalDate(s.class_start_date)
      if (!sd) return false
      sd.setHours(0, 0, 0, 0)
      return sd >= weekStart && sd <= weekEnd
    }).length

    const label =
      i === 0
        ? `This week (of ${formatWeekLabel(weekStart)})`
        : i === 1
        ? `Next week (of ${formatWeekLabel(weekStart)})`
        : `Week of ${formatWeekLabel(weekStart)}`

    return { label, value: count, color: 'bg-blue-500' }
  })
}
