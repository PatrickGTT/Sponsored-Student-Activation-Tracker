import { FUNDING_TYPES, LIFECYCLE_STATUSES } from '../data/students'

function uniqueSorted(students, key) {
  return Array.from(new Set(students.map((s) => s[key]))).sort()
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function FilterBar({ students, filters, onChange, onReset }) {
  const ossOwners = uniqueSorted(students, 'oss_owner')
  const locations = uniqueSorted(students, 'location')
  const agencies = uniqueSorted(students, 'agency_or_sponsor')

  function set(field, value) {
    onChange({ ...filters, [field]: value })
  }

  const hasFilters = Object.values(filters).some((v) => v !== 'All')

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex flex-wrap items-end gap-3">
      <Select
        label="OSS Owner"
        value={filters.oss_owner}
        onChange={(v) => set('oss_owner', v)}
        options={ossOwners}
      />
      <Select
        label="Location"
        value={filters.location}
        onChange={(v) => set('location', v)}
        options={locations}
      />
      <Select
        label="Agency"
        value={filters.agency_or_sponsor}
        onChange={(v) => set('agency_or_sponsor', v)}
        options={agencies}
      />
      <Select
        label="Funding Type"
        value={filters.funding_type}
        onChange={(v) => set('funding_type', v)}
        options={FUNDING_TYPES}
      />
      <Select
        label="Risk"
        value={filters.risk_level}
        onChange={(v) => set('risk_level', v)}
        options={['High', 'Medium', 'Low']}
      />
      <Select
        label="Lifecycle Status"
        value={filters.lifecycle_status}
        onChange={(v) => set('lifecycle_status', v)}
        options={LIFECYCLE_STATUSES}
      />
      {hasFilters && (
        <button
          onClick={onReset}
          className="ml-auto text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
