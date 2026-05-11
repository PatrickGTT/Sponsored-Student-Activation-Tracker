const RISK_STYLES = {
  High: 'bg-red-100 text-red-800 ring-red-200',
  Medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  Low: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
}

const STATUS_STYLES = {
  'Agency Approved / Need to Confirm Start Date': 'bg-slate-100 text-slate-700 ring-slate-200',
  'Start Date Confirmed': 'bg-blue-100 text-blue-800 ring-blue-200',
  'Student Contacted – Awaiting Confirmation': 'bg-sky-100 text-sky-800 ring-sky-200',
  'Student Unreachable': 'bg-red-100 text-red-800 ring-red-200',
  Rescheduled: 'bg-amber-100 text-amber-800 ring-amber-200',
  Started: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'Completed / Ready to Bill': 'bg-teal-100 text-teal-800 ring-teal-200',
  'Billing Submitted to Agency': 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  Paid: 'bg-violet-100 text-violet-800 ring-violet-200',
  'Dropped / No-Show': 'bg-rose-100 text-rose-800 ring-rose-200',
  'Issue / Escalation': 'bg-red-200 text-red-900 ring-red-300',
}

const START_STATUS_STYLES = {
  'Not Set': 'bg-slate-100 text-slate-700 ring-slate-200',
  'Pending Agency Approval': 'bg-amber-100 text-amber-800 ring-amber-200',
  Tentative: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  Confirmed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
}

function pillClass(map, key) {
  return map[key] || 'bg-slate-100 text-slate-700 ring-slate-200'
}

export function RiskBadge({ level }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pillClass(RISK_STYLES, level)}`}
    >
      {level}
    </span>
  )
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pillClass(STATUS_STYLES, status)}`}
    >
      {status}
    </span>
  )
}

export function StartStatusBadge({ status }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pillClass(START_STATUS_STYLES, status)}`}
    >
      {status}
    </span>
  )
}

const CONFIDENCE_STYLES = {
  High: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  Low: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function ConfidenceBadge({ level }) {
  if (!level) return <span className="text-xs text-slate-400">—</span>
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pillClass(CONFIDENCE_STYLES, level)}`}
    >
      {level}
    </span>
  )
}

// Inline flag badges — derived states, not enum values. Rendered next to the
// relevant column in the student table.
export function MissingStartDateBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-amber-100 text-amber-800 ring-amber-200">
      Missing Start Date
    </span>
  )
}

export function FollowUpOverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-rose-100 text-rose-800 ring-rose-200">
      Follow-up Overdue
    </span>
  )
}
