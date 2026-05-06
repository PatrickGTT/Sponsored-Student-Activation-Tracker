// CSV primitives — parser, writer, browser-side download.
// Hand-rolled (no library dependency) and roughly RFC 4180 compliant:
// - Cells with commas, quotes, or newlines are quoted on write.
// - Embedded quotes are escaped by doubling them ("" inside a quoted field).
// - LF and CRLF line endings are both accepted on read.
// - A leading UTF-8 BOM on the input is stripped.

export function parseCsv(text) {
  if (typeof text !== 'string') return []
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      i++
      continue
    }
    if (ch === '\n' || ch === '\r') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      if (ch === '\r' && text[i + 1] === '\n') i += 2
      else i++
      continue
    }
    cell += ch
    i++
  }

  // Flush any trailing cell / row.
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  // Drop fully empty lines.
  return rows.filter((r) => r.length > 0 && r.some((c) => c !== ''))
}

export function escapeCell(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function toCsvRow(values) {
  return values.map(escapeCell).join(',')
}

export function toCsv(rows) {
  // Use CRLF — friendlier for Excel on Windows.
  return rows.map(toCsvRow).join('\r\n')
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob(['﻿', csvText], {
    // BOM ensures Excel reads UTF-8 correctly.
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
