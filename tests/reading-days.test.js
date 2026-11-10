import test from 'node:test'
import assert from 'node:assert/strict'
import { localDateKey, normalizeReadingDayRecord } from '../src/reading-days.js'

test('normalizes timestamp day entries and merges entries from the same local date', () => {
  const startTime = new Date(2026, 5, 12, 10).getTime()
  const endTime = new Date(2026, 5, 12, 11).getTime()
  const date = localDateKey(startTime)
  const record = {
    bookId: 'book-1',
    days: [
      { date, durationMs: 1200, startPage: 2, endPage: 3, startTime, endTime },
      { date: startTime + 1, durationMs: 0, startPage: 4, endPage: 5, startTime: null, endTime: null },
      { date: endTime, durationMs: 600, startPage: 6, endPage: 7, startTime: endTime, endTime },
    ],
  }

  assert.deepEqual(normalizeReadingDayRecord(record), {
    bookId: 'book-1',
    days: [{
      date,
      durationMs: 1800,
      startPage: 2,
      endPage: 7,
      startTime,
      endTime,
    }],
  })
})

test('preserves records that already contain one entry per date', () => {
  const record = { bookId: 'book-1', days: [{ date: '2026-06-12', durationMs: 1200 }] }

  assert.equal(normalizeReadingDayRecord(record), record)
})
