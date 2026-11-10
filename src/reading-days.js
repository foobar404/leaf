export function localDateKey(milliseconds) {
  const date = new Date(milliseconds)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function mergeReadingDays(existing, next) {
  const startTime = [existing.startTime, next.startTime].filter(Number.isFinite)
  const endTime = [existing.endTime, next.endTime].filter(Number.isFinite)

  return {
    ...existing,
    durationMs: (Number(existing.durationMs) || 0) + (Number(next.durationMs) || 0),
    startPage: existing.startPage ?? next.startPage ?? null,
    endPage: next.endPage ?? existing.endPage ?? null,
    startTime: startTime.length ? Math.min(...startTime) : null,
    endTime: endTime.length ? Math.max(...endTime) : null,
  }
}

export function normalizeReadingDayRecord(record) {
  if (!Array.isArray(record.days)) return record

  let changed = false
  const daysByDate = new Map()
  for (const day of record.days) {
    const date = Number.isFinite(day.date) ? localDateKey(day.date) : day.date
    const normalizedDay = date === day.date ? day : { ...day, date }
    const existing = daysByDate.get(date)
    if (existing) {
      daysByDate.set(date, mergeReadingDays(existing, normalizedDay))
      changed = true
    } else {
      daysByDate.set(date, normalizedDay)
    }
    if (normalizedDay !== day) changed = true
  }

  return changed ? { ...record, days: [...daysByDate.values()] } : record
}
