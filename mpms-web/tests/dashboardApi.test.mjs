import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchDashboard } from '../src/lib/dashboardApi.ts'
import { EMPTY_DASHBOARD_FILTERS } from '../src/lib/dashboardFilters.ts'
import { SIMULATED_NOTE_PREFIX } from '../src/lib/productionLogs.ts'

const coreSummary = { recordCount: 1, totalProduction: 90, totalTarget: 100, totalDefects: 1, totalDowntimeMinutes: 5, targetAchievement: 90, defectRate: 1.11 }
const record = { id: 1, productionDate: '2026-11-10', productionLine: 'Line B', shift: 'Morning', targetUnits: 100, actualUnits: 90, defectUnits: 1, downtimeMinutes: 5, notes: `${SIMULATED_NOTE_PREFIX}test] SIMULATED manufacturing data` }

async function withResponses(responses, run) {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url) => {
    const path = new URL(url, 'http://localhost').pathname
    requests.push(url)
    const endpoint = path.split('/').at(-1)
    return Response.json(responses[endpoint] ?? [])
  }
  try { await run(requests) } finally { globalThis.fetch = originalFetch }
}

test('older summary response loads actual KPI values and derives simulation labels from stored records', async () => {
  const filters = { startDate: '2026-11-10', endDate: '2026-11-10', productionLine: 'Line B' }
  const records = [record, { ...record, id: 2, productionLine: 'Line A' }, { ...record, id: 3, productionDate: '2026-11-09' }]
  await withResponses({ summary: coreSummary, productionlogs: records }, async (requests) => {
    const result = await fetchDashboard(new AbortController().signal, filters)
    assert.deepEqual(result.summary, { ...coreSummary, simulatedRecordCount: 1 })
    assert.equal(requests.length, 4)
    assert.equal(requests.at(-1), '/api/productionlogs')
  })
})

test('current summary metadata is accepted without an additional records request', async () => {
  await withResponses({ summary: { ...coreSummary, simulatedRecordCount: 1 } }, async (requests) => {
    const result = await fetchDashboard(new AbortController().signal, EMPTY_DASHBOARD_FILTERS)
    assert.equal(result.summary.simulatedRecordCount, 1)
    assert.equal(requests.length, 3)
  })
})

test('missing metadata never fabricates simulated labels for ordinary stored records', async () => {
  await withResponses({ summary: coreSummary, productionlogs: [{ ...record, notes: 'Operator remarks' }] }, async () => {
    const result = await fetchDashboard(new AbortController().signal, EMPTY_DASHBOARD_FILTERS)
    assert.equal(result.summary.simulatedRecordCount, 0)
    assert.equal(result.summary.totalProduction, coreSummary.totalProduction)
  })
})

test('null defect rates and empty arrays remain valid for empty selections', async () => {
  const empty = { recordCount: 0, totalProduction: 0, totalTarget: 0, totalDefects: 0, totalDowntimeMinutes: 0, targetAchievement: 0, defectRate: null }
  await withResponses({ summary: empty }, async () => {
    const result = await fetchDashboard(new AbortController().signal, EMPTY_DASHBOARD_FILTERS)
    assert.deepEqual(result.summary, { ...empty, simulatedRecordCount: 0 })
    assert.deepEqual(result.trend, [])
    assert.deepEqual(result.lines, [])
  })
})

test('core KPI fields and provided simulation metadata are still strictly validated', async () => {
  const { totalProduction: _omitted, ...missingProduction } = coreSummary
  const invalid = [missingProduction, { ...coreSummary, totalProduction: '90' }, { ...coreSummary, defectRate: undefined }, { ...coreSummary, simulatedRecordCount: null }, { ...coreSummary, simulatedRecordCount: 2 }, { ...coreSummary, simulatedRecordCount: 0.5 }]
  for (const summary of invalid) {
    await withResponses({ summary }, async () => {
      await assert.rejects(fetchDashboard(new AbortController().signal, EMPTY_DASHBOARD_FILTERS), /summary API returned an unexpected response/)
    })
  }
})

test('metadata fallback rejects a changed record selection instead of mixing snapshots', async () => {
  await withResponses({ summary: coreSummary, productionlogs: [] }, async () => {
    await assert.rejects(fetchDashboard(new AbortController().signal, EMPTY_DASHBOARD_FILTERS), /Production records changed/)
  })
})
