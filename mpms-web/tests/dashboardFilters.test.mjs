import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardQuery, EMPTY_DASHBOARD_FILTERS, validateDashboardFilters } from '../src/lib/dashboardFilters.ts'
import { fetchDashboard } from '../src/lib/dashboardApi.ts'
import { formatDefectRate } from '../src/lib/format.ts'
import { isSimulatedRecord, SIMULATED_NOTE_PREFIX } from '../src/lib/productionLogs.ts'

test('dashboard query omits unset filters and encodes a complete shared selection', () => {
  assert.equal(dashboardQuery(EMPTY_DASHBOARD_FILTERS), '')
  const filters = { startDate: '2026-10-28', endDate: '2026-11-10', productionLine: 'Line B' }
  const query = new URLSearchParams(dashboardQuery(filters).slice(1))
  assert.deepEqual(Object.fromEntries(query), filters)
  assert.equal(dashboardQuery({ ...EMPTY_DASHBOARD_FILTERS, productionLine: '  ' }), '')
})

test('date validation accepts open or inclusive ranges and rejects invalid dates and reversed bounds', () => {
  for (const filters of [EMPTY_DASHBOARD_FILTERS, { ...EMPTY_DASHBOARD_FILTERS, startDate: '2026-11-10' }, { startDate: '2026-11-10', endDate: '2026-11-10', productionLine: 'Line A' }]) assert.equal(validateDashboardFilters(filters), null)
  assert.ok(validateDashboardFilters({ ...EMPTY_DASHBOARD_FILTERS, startDate: '2026-02-30' }))
  assert.ok(validateDashboardFilters({ ...EMPTY_DASHBOARD_FILTERS, startDate: '2026-11-11', endDate: '2026-11-10' }))
})

test('all dashboard endpoints receive the exact same filters and nullable defect rates are preserved', async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  const summary = { recordCount: 1, simulatedRecordCount: 1, totalProduction: 0, totalTarget: 100, totalDefects: 0, totalDowntimeMinutes: 10, targetAchievement: 0, defectRate: null }
  const fixtures = { summary, trend: [{ date: '2026-11-10', target: 100, actual: 0, defects: 0 }], lines: [{ productionLine: 'Line A', target: 100, actual: 0, defects: 0, downtimeMinutes: 10, achievement: 0, defectRate: null }] }
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url, 'http://localhost')
    calls.push({ endpoint: parsed.pathname.split('/').at(-1), query: parsed.search, signal: options.signal })
    return Response.json(fixtures[parsed.pathname.split('/').at(-1)])
  }
  try {
    const signal = new AbortController().signal
    const filters = { startDate: '2026-11-01', endDate: '2026-11-10', productionLine: 'Line A' }
    const result = await fetchDashboard(signal, filters)
    assert.deepEqual(calls.map((call) => call.endpoint).sort(), ['lines', 'summary', 'trend'])
    assert.ok(calls.every((call) => call.query === dashboardQuery(filters) && call.signal === signal))
    assert.equal(result.summary.defectRate, null)
    assert.equal(result.lines[0].defectRate, null)
    assert.equal(formatDefectRate(null), 'N/A')
    assert.equal(formatDefectRate(0), '0.0%')
  } finally { globalThis.fetch = originalFetch }
})

test('only explicitly marked records are labeled as simulated', () => {
  assert.equal(isSimulatedRecord({ notes: `${SIMULATED_NOTE_PREFIX}2026-11-10:0:0] SIMULATED manufacturing data` }), true)
  assert.equal(isSimulatedRecord({ notes: 'Production team remarks' }), false)
  assert.equal(isSimulatedRecord({ notes: null }), false)
})
