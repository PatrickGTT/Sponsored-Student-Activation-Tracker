import { useRef, useState } from 'react'
import { downloadCsv } from '../utils/csv'
import {
  buildAllStudentsCsv,
  buildForecastCsv,
  buildPriorityCsv,
  parseStudentsCsv,
} from '../utils/csvSerializers'

function todayTag() {
  return new Date().toISOString().slice(0, 10)
}

export default function DataToolbar({
  students,
  onReplaceStudents,
  onResetDemo,
}) {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null)

  function triggerImport() {
    fileInputRef.current?.click()
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same filename later
    if (!file) return

    const ok = window.confirm(
      `Importing "${file.name}" will replace the current ${students.length} student records. Continue?`,
    )
    if (!ok) return

    try {
      const text = await file.text()
      const result = parseStudentsCsv(text)

      if (result.students.length === 0) {
        setStatus({
          tone: 'error',
          text:
            result.errors[0] ||
            'No valid rows found in CSV. Make sure a student_name column is present.',
        })
        return
      }

      onReplaceStudents(result.students)
      const skipped = result.errors.length
      setStatus({
        tone: 'success',
        text: `Imported ${result.importedCount} students from ${file.name}${
          skipped > 0 ? ` · ${skipped} row${skipped === 1 ? '' : 's'} skipped` : ''
        }`,
        details: skipped > 0 ? result.errors : null,
      })
    } catch (err) {
      setStatus({ tone: 'error', text: `Import failed: ${err.message}` })
    }
  }

  function exportAll() {
    downloadCsv(`students-${todayTag()}.csv`, buildAllStudentsCsv(students))
    setStatus({ tone: 'success', text: `Exported ${students.length} student records.` })
  }

  function exportPriority() {
    const priority = students.filter((s) => s.is_priority)
    downloadCsv(`priority-this-week-${todayTag()}.csv`, buildPriorityCsv(students))
    setStatus({
      tone: 'success',
      text: `Exported ${priority.length} priority students.`,
    })
  }

  function exportForecast() {
    downloadCsv(`weekly-forecast-${todayTag()}.csv`, buildForecastCsv(students))
    setStatus({
      tone: 'success',
      text: `Exported forecast for ${students.length} students.`,
    })
  }

  function reset() {
    const ok = window.confirm(
      'Reset to demo data? Any imported records will be lost.',
    )
    if (!ok) return
    onResetDemo()
    setStatus({ tone: 'success', text: 'Reset to demo data.' })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          Data
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />

        <PrimaryBtn onClick={triggerImport}>Import CSV…</PrimaryBtn>

        <Divider />

        <SecondaryBtn onClick={exportAll}>Export All Students</SecondaryBtn>
        <SecondaryBtn onClick={exportPriority}>
          Export Priority This Week
        </SecondaryBtn>
        <SecondaryBtn onClick={exportForecast}>
          Export Weekly Forecast
        </SecondaryBtn>

        <Divider />

        <SubtleBtn onClick={reset}>Reset Demo Data</SubtleBtn>

        {status && (
          <div
            className={`ml-auto text-xs ${
              status.tone === 'error' ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {status.text}
          </div>
        )}
      </div>

      {status?.details && status.details.length > 0 && (
        <details className="mt-2 text-xs text-slate-600">
          <summary className="cursor-pointer hover:text-slate-900">
            Show {status.details.length} skipped row
            {status.details.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {status.details.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function PrimaryBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      {children}
    </button>
  )
}

function SecondaryBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-white rounded-md ring-1 ring-blue-200 hover:bg-blue-50"
    >
      {children}
    </button>
  )
}

function SubtleBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 mx-1" />
}
