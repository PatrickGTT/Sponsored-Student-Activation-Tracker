import { useEffect, useMemo, useState } from 'react'
import { STUDENTS } from './data/students'
import {
  comparePriority,
  daysSinceEnrollment,
  daysSinceLastContact,
  daysUntilStart,
  evaluateRisk,
  isPriorityThisWeek,
  priorityReason,
} from './utils/calculations'
import { resolveForecast } from './utils/forecast'
import Header from './components/Header'
import LeadershipDashboard from './components/LeadershipDashboard'
import FilterBar from './components/FilterBar'
import StudentTable from './components/StudentTable'
import StudentDrawer from './components/StudentDrawer'
import ForecastView from './components/ForecastView'
import DataToolbar from './components/DataToolbar'

const DEFAULT_FILTERS = {
  oss_owner: 'All',
  location: 'All',
  agency_or_sponsor: 'All',
  funding_type: 'All',
  risk_level: 'All',
  lifecycle_status: 'All',
}

export default function App() {
  const [students, setStudents] = useState(STUDENTS)
  const [view, setView] = useState('dashboard')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState(null)

  // OSS user roster is derived from the current student list — so importing
  // a CSV with new owners adds them to the dropdown automatically.
  const ossUsers = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.oss_owner).filter(Boolean))).sort(),
    [students],
  )
  const [currentUser, setCurrentUser] = useState(ossUsers[0] || '')

  // If the imported data drops the previously selected user, fall back.
  useEffect(() => {
    if (ossUsers.length > 0 && !ossUsers.includes(currentUser)) {
      setCurrentUser(ossUsers[0])
    }
  }, [ossUsers, currentUser])

  const enriched = useMemo(
    () =>
      students.map((s) => {
        const risk = evaluateRisk(s)
        return {
          ...s,
          risk_level: risk.level,
          risk_reasons: risk.reasons,
          days_since_enrollment: daysSinceEnrollment(s),
          days_since_last_contact: daysSinceLastContact(s),
          days_until_start: daysUntilStart(s),
          is_priority: isPriorityThisWeek(s),
          priority_reason: priorityReason(s),
          forecast: resolveForecast(s),
        }
      }),
    [students],
  )

  const myStudentsCount = useMemo(
    () => enriched.filter((s) => s.oss_owner === currentUser).length,
    [enriched, currentUser],
  )
  const priorityCount = useMemo(
    () => enriched.filter((s) => s.is_priority).length,
    [enriched],
  )

  const visible = useMemo(() => {
    let list = enriched

    if (view === 'priority') {
      list = list.filter((s) => s.is_priority)
    } else if (view === 'my_students') {
      list = list.filter((s) => s.oss_owner === currentUser)
    }

    list = list.filter((s) => {
      if (filters.oss_owner !== 'All' && s.oss_owner !== filters.oss_owner) return false
      if (filters.location !== 'All' && s.location !== filters.location) return false
      if (
        filters.agency_or_sponsor !== 'All' &&
        s.agency_or_sponsor !== filters.agency_or_sponsor
      )
        return false
      if (filters.funding_type !== 'All' && s.funding_type !== filters.funding_type)
        return false
      if (filters.risk_level !== 'All' && s.risk_level !== filters.risk_level) return false
      if (
        filters.lifecycle_status !== 'All' &&
        s.lifecycle_status !== filters.lifecycle_status
      )
        return false
      return true
    })

    if (view === 'priority') {
      list = [...list].sort(comparePriority)
    }
    return list
  }, [enriched, filters, view, currentUser])

  const selected = enriched.find((s) => s.student_id === selectedId) || null

  function handleSave(id, updates) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === id
          ? {
              ...s,
              ...updates,
              last_updated_at: new Date().toISOString(),
              last_updated_by: currentUser,
            }
          : s,
      ),
    )
  }

  function handleReplaceStudents(newStudents) {
    setStudents(newStudents)
    setSelectedId(null) // close any open drawer — IDs likely changed
    setFilters(DEFAULT_FILTERS) // reset filters that referenced old values
  }

  function handleResetDemo() {
    setStudents(STUDENTS)
    setSelectedId(null)
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        view={view}
        onChangeView={setView}
        currentUser={currentUser}
        onChangeUser={setCurrentUser}
        ossUsers={ossUsers}
        myStudentsCount={myStudentsCount}
        priorityCount={priorityCount}
      />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6 space-y-6">
        {view === 'dashboard' && (
          <>
            <ViewIntro
              title="Dashboard"
              description="Org-wide view of sponsored students, AR exposure, and where leadership should focus this week."
            />
            <LeadershipDashboard students={enriched} />
            <DataToolbar
              students={enriched}
              onReplaceStudents={handleReplaceStudents}
              onResetDemo={handleResetDemo}
            />
          </>
        )}

        {view === 'priority' && (
          <>
            <ViewIntro
              title="Priority This Week"
              description="Sponsored students who need attention now — High Risk, missing start dates, follow-ups due, or starting within 14 days. Sorted by urgency."
            />
            <FilterBar
              students={enriched}
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            <StudentTable
              students={visible}
              showPriorityReason
              onSelect={(s) => setSelectedId(s.student_id)}
            />
          </>
        )}

        {view === 'my_students' && (
          <>
            <ViewIntro
              title="My Students"
              description={`Sponsored students assigned to ${currentUser || 'the selected OSS'}. Use the row to open the update panel.`}
            />
            <FilterBar
              students={enriched}
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            <StudentTable
              students={visible}
              onSelect={(s) => setSelectedId(s.student_id)}
            />
          </>
        )}

        {view === 'all' && (
          <>
            <ViewIntro
              title="All Sponsored Students"
              description="Every sponsored student in the tracker. Filter by OSS, location, agency, funding type, risk, or lifecycle to drill down."
            />
            <FilterBar
              students={enriched}
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            <StudentTable
              students={visible}
              onSelect={(s) => setSelectedId(s.student_id)}
            />
          </>
        )}

        {view === 'forecast' && (
          <>
            <ViewIntro
              title="Forecast"
              description="Expected agency collections by week and confidence level. Feeds the broader AR / cash forecast."
            />
            <ForecastView
              students={enriched}
              onSelect={(s) => setSelectedId(s.student_id)}
            />
          </>
        )}
      </main>
      {selected && (
        <StudentDrawer
          student={selected}
          currentUser={currentUser}
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function ViewIntro({ title, description }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{description}</p>
    </div>
  )
}
