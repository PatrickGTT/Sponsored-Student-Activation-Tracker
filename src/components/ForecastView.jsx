import { ConfidenceBadge, StatusBadge } from './Badge'
import { fmtDate, fmtMoney } from '../utils/format'

const WEEK_COUNT = 12

export default function ForecastView({ students, onSelect }) {
  // Only students whose resolved forecast contributes to collections.
  const contributing = students.filter((s) => (s.forecast?.expectedAmount || 0) > 0)

  return (
    <div className="space-y-6">
      <WeeklySummary students={contributing} />
      <ForecastTable students={students} onSelect={onSelect} />
    </div>
  )
}

// ---------- Weekly summary ----------

function WeeklySummary({ students }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstMonday = startOfWeek(today)

  const buckets = []

  // Overdue (date in the past, before this week's Monday)
  const overdue = students.filter((s) => {
    const d = parseDate(s.forecast.expectedDate)
    return d && d < firstMonday
  })
  if (overdue.length > 0) {
    buckets.push(buildBucket('Overdue', overdue, true))
  }

  // 12 forward weeks
  for (let i = 0; i < WEEK_COUNT; i++) {
    const start = new Date(firstMonday)
    start.setDate(firstMonday.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const inWeek = students.filter((s) => {
      const d = parseDate(s.forecast.expectedDate)
      return d && d >= start && d <= end
    })
    const label =
      i === 0
        ? `This week (of ${formatLabel(start)})`
        : i === 1
        ? `Next week (of ${formatLabel(start)})`
        : `Week of ${formatLabel(start)}`
    buckets.push(buildBucket(label, inWeek))
  }

  // Beyond 12 weeks
  const beyondCutoff = new Date(firstMonday)
  beyondCutoff.setDate(firstMonday.getDate() + WEEK_COUNT * 7)
  const beyond = students.filter((s) => {
    const d = parseDate(s.forecast.expectedDate)
    return d && d >= beyondCutoff
  })
  if (beyond.length > 0) {
    buckets.push(buildBucket(`Beyond ${WEEK_COUNT} weeks`, beyond))
  }

  // Unscheduled
  const unscheduled = students.filter((s) => !s.forecast.expectedDate)
  if (unscheduled.length > 0) {
    buckets.push(buildBucket('Unscheduled (TBD)', unscheduled))
  }

  // Totals row
  const totals = buildBucket('Total Expected Agency Collections', students)

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Weekly Forecast Summary
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Expected agency collections grouped by week and confidence level. Feeds
          the broader AR / cash forecast.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              <th className="text-left py-2 px-3">Week</th>
              <th className="text-right py-2 px-3">High Confidence</th>
              <th className="text-right py-2 px-3">Medium Confidence</th>
              <th className="text-right py-2 px-3">Low Confidence</th>
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-right py-2 px-3"># Students</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {buckets.map((b) => (
              <tr
                key={b.label}
                className={b.tone === 'overdue' ? 'bg-rose-50' : ''}
              >
                <td className="py-2 px-3 text-slate-700">{b.label}</td>
                <Money value={b.high} />
                <Money value={b.medium} />
                <Money value={b.low} />
                <Money value={b.total} bold />
                <td className="py-2 px-3 text-right text-slate-500">{b.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold text-slate-900 border-t-2 border-slate-200">
              <td className="py-3 px-3">{totals.label}</td>
              <Money value={totals.high} bold />
              <Money value={totals.medium} bold />
              <Money value={totals.low} bold />
              <Money value={totals.total} bold />
              <td className="py-3 px-3 text-right">{totals.count}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function Money({ value, bold }) {
  if (!value) {
    return <td className="py-2 px-3 text-right text-slate-300">—</td>
  }
  return (
    <td
      className={`py-2 px-3 text-right ${
        bold ? 'font-semibold text-slate-900' : 'text-slate-700'
      }`}
    >
      {fmtMoney(value)}
    </td>
  )
}

// ---------- Per-student forecast table ----------

function ForecastTable({ students, onSelect }) {
  // Sort by resolved expected date (nulls/TBD last), then by amount desc.
  const sorted = [...students].sort((a, b) => {
    const aDate = parseDate(a.forecast.expectedDate)
    const bDate = parseDate(b.forecast.expectedDate)
    if (aDate && bDate) return aDate - bDate
    if (aDate) return -1
    if (bDate) return 1
    return (b.forecast.expectedAmount || 0) - (a.forecast.expectedAmount || 0)
  })

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          Per-Student Forecast
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Click a row to open the student and adjust the override fields.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Lifecycle</th>
              <th className="text-left px-4 py-3">Expected Date</th>
              <th className="text-right px-4 py-3">Expected Amount</th>
              <th className="text-left px-4 py-3">Confidence</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Reason / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => {
              const f = s.forecast
              return (
                <tr
                  key={s.student_id}
                  onClick={() => onSelect(s)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-900">
                      {s.student_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {s.student_id} · {s.agency_or_sponsor}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={s.lifecycle_status} />
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    {f.expectedDate ? fmtDate(f.expectedDate) : 'TBD'}
                  </td>
                  <td className="px-4 py-3 align-top text-right font-medium text-slate-900">
                    {fmtMoney(f.expectedAmount)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <ConfidenceBadge level={f.confidence} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    {f.isOverridden ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-200">
                        Override
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Computed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600 max-w-[280px]">
                    {f.notes || f.reason}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- Helpers ----------

function buildBucket(label, students, isOverdue = false) {
  const high = sumWhere(students, (s) => s.forecast.confidence === 'High')
  const medium = sumWhere(students, (s) => s.forecast.confidence === 'Medium')
  const low = sumWhere(students, (s) => s.forecast.confidence === 'Low')
  return {
    label,
    high,
    medium,
    low,
    total: high + medium + low,
    count: students.length,
    tone: isOverdue ? 'overdue' : 'normal',
  }
}

function sumWhere(students, predicate) {
  return students
    .filter(predicate)
    .reduce((sum, s) => sum + (s.forecast.expectedAmount || 0), 0)
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return d
}

function parseDate(d) {
  if (!d) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  dt.setHours(0, 0, 0, 0)
  return dt
}

function formatLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
