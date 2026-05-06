import { useEffect, useState } from 'react'
import {
  CONTACT_METHODS,
  CONTACT_RESULTS,
  LIFECYCLE_STATUSES,
  START_DATE_STATUSES,
} from '../data/students'
import { ConfidenceBadge, RiskBadge, StartStatusBadge, StatusBadge } from './Badge'
import { fmtDate, fmtDateTime, fmtMoney, toInputDate } from '../utils/format'

// Spec-defined editable surface — keep this list in sync with the brief.
const EDITABLE_FIELDS = [
  'lifecycle_status',
  'class_start_date',
  'start_date_status',
  'contact_method',
  'contact_result',
  'next_follow_up_date',
  'notes',
  // Forecast override fields
  'expected_payment_date',
  'expected_payment_amount',
  'forecast_confidence',
  'forecast_notes',
]

function emptyToNull(v) {
  return v === '' ? null : v
}

function todayInputDate() {
  return toInputDate(new Date())
}

export default function StudentDrawer({ student, currentUser, onClose, onSave }) {
  const [form, setForm] = useState(() => buildForm(student))

  useEffect(() => {
    setForm(buildForm(student))
  }, [student.student_id])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSave() {
    const methodChanged = (form.contact_method || '') !== (student.contact_method || '')
    const resultChanged = (form.contact_result || '') !== (student.contact_result || '')
    const contactLogged = methodChanged || resultChanged

    const updates = {
      lifecycle_status: form.lifecycle_status,
      class_start_date: emptyToNull(form.class_start_date),
      start_date_status: form.start_date_status,
      contact_method: emptyToNull(form.contact_method),
      contact_result: emptyToNull(form.contact_result),
      next_follow_up_date: emptyToNull(form.next_follow_up_date),
      notes: form.notes,
      // Forecast overrides — empty inputs clear back to "use computed".
      expected_payment_date: emptyToNull(form.expected_payment_date),
      expected_payment_amount:
        form.expected_payment_amount === '' || form.expected_payment_amount == null
          ? null
          : Number(form.expected_payment_amount),
      forecast_confidence: emptyToNull(form.forecast_confidence),
      forecast_notes: form.forecast_notes || '',
    }

    // Auto-stamp last_contact_date when the OSS logs new contact info.
    if (contactLogged) {
      updates.last_contact_date = todayInputDate()
    }

    onSave(student.student_id, updates)
    onClose()
  }

  const dirty = EDITABLE_FIELDS.some((f) => {
    const current = form[f] ?? ''
    let original
    if (f.endsWith('_date')) {
      original = toInputDate(student[f])
    } else if (f === 'expected_payment_amount') {
      original = student[f] == null ? '' : String(student[f])
    } else {
      original = student[f] ?? ''
    }
    return String(current) !== String(original)
  })

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/30 z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col">
        <header className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">
                {student.student_name}
              </h2>
              <RiskBadge level={student.risk_level} />
            </div>
            <p className="text-sm text-slate-500">
              {student.student_id} · {student.agency_or_sponsor} ·{' '}
              {student.location}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              OSS {student.oss_owner} · Advisor {student.advisor_name} · Last
              updated {fmtDateTime(student.last_updated_at)} by{' '}
              {student.last_updated_by}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none ml-2"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <ReadOnlyGrid
            rows={[
              ['Funding Type', student.funding_type],
              ['Invoice #', student.invoice_number],
              ['Invoice Amount', fmtMoney(student.invoice_amount)],
              ['Current AR Balance', fmtMoney(student.current_ar_balance)],
              ['Enrollment Date', fmtDate(student.enrollment_date)],
              ['Last Contact Date', fmtDate(student.last_contact_date)],
            ]}
          />

          <ComputedGrid
            rows={[
              ['Days Since Enrollment', student.days_since_enrollment],
              ['Days Since Last Contact', student.days_since_last_contact],
              ['Days Until Start', student.days_until_start],
            ]}
          />

          {student.risk_reasons && student.risk_reasons.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-1">
                Risk signals
              </div>
              <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
                {student.risk_reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <Field label="Lifecycle Status">
            <select
              value={form.lifecycle_status}
              onChange={(e) => set('lifecycle_status', e.target.value)}
              className="input"
            >
              {LIFECYCLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="mt-1">
              <StatusBadge status={form.lifecycle_status} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Class Start Date">
              <input
                type="date"
                value={form.class_start_date}
                onChange={(e) => set('class_start_date', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Start Date Status">
              <select
                value={form.start_date_status}
                onChange={(e) => set('start_date_status', e.target.value)}
                className="input"
              >
                {START_DATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="mt-1">
                <StartStatusBadge status={form.start_date_status} />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Method">
              <select
                value={form.contact_method || ''}
                onChange={(e) => set('contact_method', e.target.value)}
                className="input"
              >
                <option value="">—</option>
                {CONTACT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contact Result">
              <select
                value={form.contact_result || ''}
                onChange={(e) => set('contact_result', e.target.value)}
                className="input"
              >
                <option value="">—</option>
                {CONTACT_RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="-mt-3 text-xs text-slate-500">
            Saving with a changed Contact Method or Result will stamp Last Contact
            Date to today.
          </p>

          <Field label="Next Follow-up Date">
            <input
              type="date"
              value={form.next_follow_up_date}
              onChange={(e) => set('next_follow_up_date', e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={4}
              className="input resize-y"
              placeholder="Latest conversation, blockers, next steps..."
            />
          </Field>

          {student.forecast && <ForecastSection student={student} form={form} set={set} />}
        </div>

        <footer className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
          <div className="text-xs text-slate-500">
            Will save as <span className="font-medium text-slate-700">{currentUser}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Save changes
            </button>
          </div>
        </footer>
      </aside>
      <style>{`
        .input {
          width: 100%;
          background: white;
          border: 1px solid rgb(203 213 225);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.875rem;
          color: rgb(15 23 42);
        }
        .input:focus {
          outline: none;
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgb(59 130 246 / 0.4);
        }
      `}</style>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function ReadOnlyGrid({ rows }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-slate-200 p-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-slate-900">{value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

function ComputedGrid({ rows }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md bg-blue-50 ring-1 ring-blue-100 px-3 py-2"
        >
          <div className="text-[11px] font-medium text-blue-700 uppercase tracking-wide">
            {label}
          </div>
          <div className="text-lg font-semibold text-slate-900">
            {value == null ? '—' : value}
          </div>
        </div>
      ))}
    </div>
  )
}

function buildForm(student) {
  return {
    lifecycle_status: student.lifecycle_status,
    class_start_date: toInputDate(student.class_start_date),
    start_date_status: student.start_date_status || 'Not Set',
    contact_method: student.contact_method || '',
    contact_result: student.contact_result || '',
    next_follow_up_date: toInputDate(student.next_follow_up_date),
    notes: student.notes || '',
    // Forecast override fields
    expected_payment_date: toInputDate(student.expected_payment_date),
    expected_payment_amount:
      student.expected_payment_amount == null
        ? ''
        : String(student.expected_payment_amount),
    forecast_confidence: student.forecast_confidence || '',
    forecast_notes: student.forecast_notes || '',
  }
}

function ForecastSection({ student, form, set }) {
  const f = student.forecast
  return (
    <section className="border-t border-slate-200 pt-5 mt-2">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Agency Collection Forecast
      </h3>

      <div className="rounded-md bg-blue-50 ring-1 ring-blue-100 p-3 mb-4 text-xs">
        <div className="font-medium text-blue-900 mb-1">Computed forecast</div>
        <div className="text-blue-900">{f.reason}</div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div>
            <div className="text-blue-700">Date</div>
            <div className="font-medium text-slate-900">
              {f.computed.expectedDate ? fmtDate(f.computed.expectedDate) : 'TBD'}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Amount</div>
            <div className="font-medium text-slate-900">
              {fmtMoney(f.computed.expectedAmount)}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Confidence</div>
            <div className="font-medium text-slate-900">
              {f.computed.confidence}
            </div>
          </div>
        </div>
      </div>

      {f.isOverridden && (
        <div className="rounded-md bg-violet-50 ring-1 ring-violet-100 p-3 mb-4 text-xs text-violet-900">
          <span className="font-medium">Currently overriding the computed values.</span>{' '}
          Clear an override field below to fall back to computed.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Override Expected Date">
          <input
            type="date"
            value={form.expected_payment_date}
            onChange={(e) => set('expected_payment_date', e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Override Expected Amount ($)">
          <input
            type="number"
            min="0"
            step="100"
            value={form.expected_payment_amount}
            onChange={(e) => set('expected_payment_amount', e.target.value)}
            className="input"
            placeholder="(use computed)"
          />
        </Field>
      </div>
      <Field label="Override Confidence">
        <select
          value={form.forecast_confidence}
          onChange={(e) => set('forecast_confidence', e.target.value)}
          className="input"
        >
          <option value="">Use computed</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {form.forecast_confidence && (
          <div className="mt-1">
            <ConfidenceBadge level={form.forecast_confidence} />
          </div>
        )}
      </Field>
      <Field label="Forecast Notes">
        <textarea
          value={form.forecast_notes}
          onChange={(e) => set('forecast_notes', e.target.value)}
          rows={2}
          className="input resize-y"
          placeholder="Why is this forecast different from computed? Internal context for finance / leadership."
        />
      </Field>
    </section>
  )
}
