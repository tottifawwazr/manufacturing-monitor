import assert from 'node:assert/strict'
import test from 'node:test'
import { EMPTY_FILTERS, EMPTY_FORM, MAX_INTEGER, filterRecords, getAchievement, getRecordStatus, isCalendarDate, sortRecords, toFormValues, validateRecord } from '../src/lib/productionLogs.ts'

const values = { ...EMPTY_FORM, productionDate: '2026-11-10', productionLine: 'Line A', shift: 'Morning', targetUnits: '100', actualUnits: '90', defectUnits: '2', downtimeMinutes: '0' }
const record = { id: 12, productionDate: values.productionDate, productionLine: values.productionLine, shift: values.shift, targetUnits: 100, actualUnits: 90, defectUnits: 2, downtimeMinutes: 0, notes: null }

test('empty form requires all seven mandatory fields, while notes remain optional', () => {
  assert.equal(Object.keys(validateRecord(EMPTY_FORM)).length, 7)
  assert.deepEqual(validateRecord(values), {})
  assert.equal(validateRecord(EMPTY_FORM).notes, undefined)
})

test('unit validation enforces positive targets, nonnegative integers, and backend limits', () => {
  assert.match(validateRecord({ ...values, targetUnits: '0' }).targetUnits, /greater than zero/)
  for (const field of ['actualUnits', 'defectUnits', 'downtimeMinutes']) {
    for (const invalid of ['-1', '1.5', '1e3', String(MAX_INTEGER + 1), '']) {
      assert.ok(validateRecord({ ...values, [field]: invalid })[field], `${field}: ${invalid}`)
    }
  }
  assert.deepEqual(validateRecord({ ...values, actualUnits: '0', defectUnits: '0' }), {})
  assert.ok(validateRecord({ ...values, actualUnits: '1', defectUnits: '2' }).defectUnits)
})

test('calendar dates and notes enforce backend-compatible boundaries', () => {
  assert.equal(isCalendarDate('2024-02-29'), true)
  for (const invalid of ['2026-02-29', '2026-02-30', '0000-01-01', '2026-11-10T00:00:00', '']) assert.equal(isCalendarDate(invalid), false)
  assert.equal(validateRecord({ ...values, notes: 'x'.repeat(500) }).notes, undefined)
  assert.ok(validateRecord({ ...values, notes: 'x'.repeat(501) }).notes)
  assert.ok(validateRecord({ ...values, productionDate: '0001-01-01' }).productionDate)
})

test('achievement status compares unrounded percentages consistently at 90% and 100%', () => {
  for (const [achievement, label] of [[null, 'No target'], [0, 'Below Target'], [89.999, 'Below Target'], [90, 'At Risk'], [99.999, 'At Risk'], [100, 'On Target'], [150, 'On Target']]) {
    assert.equal(getRecordStatus(achievement).label, label)
  }
  assert.equal(getAchievement(record), 90)
  assert.equal(getAchievement({ ...record, targetUnits: 0 }), null)
})

test('search handles IDs, case-insensitive notes, and nullable notes', () => {
  const records = [record, { ...record, id: 13, notes: 'Tool change required' }]
  assert.deepEqual(filterRecords(records, { ...EMPTY_FILTERS, search: '#12' }).map((row) => row.id), [12])
  assert.deepEqual(filterRecords(records, { ...EMPTY_FILTERS, search: 'TOOL CHANGE' }).map((row) => row.id), [13])
  assert.deepEqual(filterRecords(records, { ...EMPTY_FILTERS, search: 'missing' }), [])
})

test('filters combine inclusive date bounds with exact production line and shift', () => {
  const records = [record, { ...record, id: 13, productionLine: 'Line B' }, { ...record, id: 14, shift: 'Night' }, { ...record, id: 15, productionDate: '2026-11-11' }]
  const filters = { ...EMPTY_FILTERS, startDate: '2026-11-10', endDate: '2026-11-10', productionLine: 'Line A', shift: 'Morning' }
  assert.deepEqual(filterRecords(records, filters).map((row) => row.id), [12])
  assert.deepEqual(filterRecords(records, { ...filters, startDate: '2026-11-12' }), [])
})

test('sorting is newest date then newest ID and never mutates the source', () => {
  const records = [record, { ...record, id: 13 }, { ...record, id: 1, productionDate: '2026-11-11' }]
  assert.deepEqual(sortRecords(records).map((row) => row.id), [1, 13, 12])
  assert.equal(records[0].id, 12)
  assert.deepEqual(toFormValues(record), values)
})
