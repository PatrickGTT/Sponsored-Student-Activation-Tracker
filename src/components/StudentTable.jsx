import {
  FollowUpOverdueBadge,
  MissingStartDateBadge,
  RiskBadge,
  StartStatusBadge,
  StatusBadge,
} from './Badge'
import { fmtDate, fmtMoney, fmtRelative, parseLocalDate } from '../utils/format'

function isFollowUpOverdue(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d) return false
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d <= today
}

export default function StudentTable({ students, showPriorityReason, onSelect }) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 px-6 py-12 text-center text-sm text-slate-500">
        No students match the current filters.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <tr>
              <Th>Student</Th>
              <Th>Agency / Funding</Th>
              <Th>OSS / Location</Th>
              <Th>Lifecycle</Th>
              <Th>Class Start</Th>
              <Th className="text-right">AR</Th>
              <Th>Risk</Th>
              {showPriorityReason ? <Th>Why Priority</Th> : <Th>Last Contact</Th>}
              <Th>Next Follow-up</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr
                key={s.student_id}
                onClick={() => onSelect(s)}
                className="hover:bg-slate-50 cursor-pointer transition"
              >
                <Td>
                  <div className="font-medium text-slate-900">{s.student_name}</div>
                  <div className="text-xs text-slate-500">
                    {s.student_id} · advisor {s.advisor_name}
                  </div>
                </Td>
                <Td>
                  <div className="text-slate-900">{s.agency_or_sponsor}</div>
                  <div className="text-xs text-slate-500">{s.funding_type}</div>
                </Td>
                <Td>
                  <div className="text-slate-900">{s.oss_owner}</div>
                  <div className="text-xs text-slate-500">{s.location}</div>
                </Td>
                <Td>
                  <StatusBadge status={s.lifecycle_status} />
                </Td>
                <Td>
                  {s.class_start_date ? (
                    <>
                      <div className="text-slate-900">{fmtDate(s.class_start_date)}</div>
                      <div className="mt-1">
                        <StartStatusBadge status={s.start_date_status} />
                      </div>
                    </>
                  ) : (
                    <MissingStartDateBadge />
                  )}
                </Td>
                <Td className="text-right">
                  <div className="font-medium text-slate-900">
                    {fmtMoney(s.current_ar_balance)}
                  </div>
                  <div className="text-xs text-slate-500">
                    inv {fmtMoney(s.invoice_amount)}
                  </div>
                </Td>
                <Td>
                  <RiskBadge level={s.risk_level} />
                </Td>
                {showPriorityReason ? (
                  <Td>
                    <div className="text-slate-700 text-xs max-w-[220px]">
                      {s.priority_reason}
                    </div>
                  </Td>
                ) : (
                  <Td>
                    <div className="text-slate-900">{fmtDate(s.last_contact_date)}</div>
                    <div className="text-xs text-slate-500">
                      {s.contact_method ? `${s.contact_method} · ` : ''}
                      {s.contact_result || '—'}
                    </div>
                  </Td>
                )}
                <Td>
                  <div className="text-slate-900">{fmtDate(s.next_follow_up_date)}</div>
                  {isFollowUpOverdue(s.next_follow_up_date) && (
                    <div className="mt-1">
                      <FollowUpOverdueBadge />
                    </div>
                  )}
                </Td>
                <Td>
                  <span className="text-xs text-slate-500" title={s.last_updated_at}>
                    {fmtRelative(s.last_updated_at)}
                  </span>
                  <div className="text-xs text-slate-400">by {s.last_updated_by}</div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className = '' }) {
  return <th className={`px-4 py-3 text-left ${className}`}>{children}</th>
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>
}
