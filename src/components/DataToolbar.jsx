import { useRef, useState } from 'react'
import { downloadCsv } from '../utils/csv'
import {
  buildAllStudentsCsv,
  buildForecastCsv,
  buildPriorityCsv,
  parseOssMappingCsv,
  parseStudentsCsv,
} from '../utils/csvSerializers'
import { fmtRelative } from '../utils/format'

function todayTag() {
  return new Date().toISOString().slice(0, 10)
}

// Per-source import configuration.
//   PowerSuite is the primary roster — adds new students.
//   Enrollment / QuickBooks only enrich rows that already exist in the
//   tracker (update-only) so a misplaced row doesn't accidentally create a
//   ghost student.
const IMPORT_MODES = {
  powersuite: {
    label: 'PowerSuite',
    options: { allowAddNew: true, applySponsoredFilter: true },
  },
  enrollment: {
    label: 'Enrollment',
    options: { allowAddNew: false, applySponsoredFilter: false },
  },
  quickbooks: {
    label: 'QuickBooks',
    options: { allowAddNew: false, applySponsoredFilter: false },
  },
}

export default function DataToolbar({
  students,
  locationOss,
  importHistory,
  onUpsertStudents,
  onUpsertOssMapping,
  onRecordImport,
  onResetDemo,
}) {
  const history = importHistory || {}
  const studentsFileRef = useRef(null)
  const ossFileRef = useRef(null)
  const [pendingMode, setPendingMode] = useState(null)
  const [status, setStatus] = useState(null)

  function pickStudentsFile(mode) {
    setPendingMode(mode)
    studentsFileRef.current?.click()
  }

  function pickOssFile() {
    ossFileRef.current?.click()
  }

  async function handleStudentsFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    const mode = pendingMode
    setPendingMode(null)
    if (!file || !mode) return

    const cfg = IMPORT_MODES[mode]
    if (!cfg) return

    try {
      const text = await file.text()
      const result = parseStudentsCsv(text, students, {
        ...cfg.options,
        locationToOss,
      })

      if (result.errors[0] === 'CSV is empty.' ||
          (result.errors[0] || '').startsWith('CSV must include')) {
        setStatus({ tone: 'error', text: result.errors[0] })
        return
      }

      onUpsertStudents(result.upserted)

      const parts = []
      if (result.added > 0) parts.push(`${result.added} new`)
      if (result.updated > 0) parts.push(`${result.updated} updated`)
      if (result.filtered > 0) parts.push(`${result.filtered} self-paid skipped`)
      if (result.notFound > 0) parts.push(`${result.notFound} not matched`)
      if (result.skipped > 0) parts.push(`${result.skipped} invalid`)
      const summary = parts.join(' · ') || 'no changes'

      onRecordImport?.(mode, { filename: file.name, summary })

      setStatus({
        tone: 'success',
        text: `${cfg.label} import · ${file.name} · ${summary}`,
        details: result.errors.length > 0 ? result.errors : null,
      })
    } catch (err) {
      setStatus({ tone: 'error', text: `Import failed: ${err.message}` })
    }
  }

  async function handleOssFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const result = parseOssMappingCsv(text)

      if (Object.keys(result.mapping).length === 0) {
        setStatus({
          tone: 'error',
          text: result.errors[0] || 'No OSS mappings found in CSV.',
        })
        return
      }

      onUpsertOssMapping(result.mapping)

      const summary = `${result.added} location${result.added === 1 ? '' : 's'} mapped`
      onRecordImport?.('oss_names', { filename: file.name, summary })

      setStatus({
        tone: 'success',
        text: `OSS Names import · ${file.name} · ${summary}`,
        details: result.errors.length > 0 ? result.errors : null,
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
      'Reset to demo data? Any imported records and OSS mappings will be lost.',
    )
    if (!ok) return
    onResetDemo()
    setStatus({ tone: 'success', text: 'Reset to demo data.' })
  }

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-start gap-2 flex-wrap">
        {/* Hidden file inputs */}
        <input
          ref={studentsFileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleStudentsFile}
          className="hidden"
        />
        <input
          ref={ossFileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleOssFile}
          className="hidden"
        />

        <Group label="Import">
          <ImportWithHistory
            label="PowerSuite"
            history={history.powersuite}
            onClick={() => pickStudentsFile('powersuite')}
          />
          <ImportWithHistory
            label="Enrollment"
            history={history.enrollment}
            onClick={() => pickStudentsFile('enrollment')}
          />
          <ImportWithHistory
            label="QuickBooks"
            history={history.quickbooks}
            onClick={() => pickStudentsFile('quickbooks')}
          />
          <ImportWithHistory
            label="OSS Names"
            history={history.oss_names}
            onClick={pickOssFile}
          />
        </Group>
        <span className="text-[11px] text-slate-400 hidden md:inline self-start mt-1.5">
          upsert · OSS notes preserved
        </span>

        <Divider />

        <Group label="Export">
          <ExportBtn onClick={exportAll}>All Students</ExportBtn>
          <ExportBtn onClick={exportPriority}>Priority This Week</ExportBtn>
          <ExportBtn onClick={exportForecast}>Weekly Forecast</ExportBtn>
        </Group>

        <Divider />

        <SubtleBtn onClick={reset}>Reset Demo Data</SubtleBtn>

        {status && (
          <div
            className={`ml-auto text-xs ${
              status.tone === 'error' ? 'text-red-700' : 'text-emerald-700'
            } max-w-[600px] truncate`}
            title={status.text}
          >
            {status.text}
          </div>
        )}
      </div>

      {status?.details && status.details.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-6 pb-2">
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer hover:text-slate-900">
              {status.details.length} note{status.details.length === 1 ? '' : 's'} from
              the import
            </summary>
            <ul className="mt-1 list-disc pl-5 space-y-0.5 max-h-32 overflow-y-auto">
              {status.details.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  )
}

function Group({ label, children }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mr-1 mt-1.5 hidden md:inline">
        {label}:
      </span>
      {children}
    </div>
  )
}

function ImportBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      {children}
    </button>
  )
}

function ImportWithHistory({ label, history, onClick }) {
  const filename = history?.filename
  const timestamp = history?.timestamp
  const tooltip = history
    ? `Last import: ${filename}\n${history.summary || ''}\n${timestamp ? `Imported ${fmtRelative(timestamp)}` : ''}`.trim()
    : `${label} — not yet imported`

  return (
    <div className="flex flex-col items-start gap-0.5" title={tooltip}>
      <ImportBtn onClick={onClick}>{label}</ImportBtn>
      <div className="text-[10px] leading-tight max-w-[140px]">
        {filename ? (
          <>
            <div className="text-emerald-700 truncate" title={filename}>
              ✓ {filename}
            </div>
            <div className="text-slate-400 truncate">
              {timestamp ? fmtRelative(timestamp) : ''}
            </div>
          </>
        ) : (
          <div className="text-slate-400 italic">not yet imported</div>
        )}
      </div>
    </div>
  )
}

function ExportBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-white rounded-md ring-1 ring-blue-200 hover:bg-blue-50"
    >
      {children}
    </button>
  )
}

function SubtleBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 mx-1" />
}
