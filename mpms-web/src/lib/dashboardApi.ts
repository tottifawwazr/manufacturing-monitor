import type { DashboardData, DashboardFilters, DashboardSummaryResponse, LinePerformance, ProductionTrend } from '../types/dashboard'
import { dashboardQuery } from './dashboardFilters.ts'
import { EMPTY_FILTERS, filterRecords, isSimulatedRecord } from './productionLogs.ts'
import { fetchProductionLogs } from './productionLogsApi.ts'
import { apiUrl } from './apiConfig.ts'

type JsonRecord = Record<string, unknown>
const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const hasNumbers = (value: JsonRecord, keys: string[]) => keys.every((key) => isNumber(value[key]))
const hasRate = (value: JsonRecord) => value.defectRate === null || isNumber(value.defectRate)

function isSummary(value: unknown): value is DashboardSummaryResponse {
  return isRecord(value)
    && hasNumbers(value, ['recordCount', 'totalProduction', 'totalTarget', 'totalDefects', 'totalDowntimeMinutes', 'targetAchievement'])
    && hasRate(value)
    && (!Object.hasOwn(value, 'simulatedRecordCount')
      || (isNumber(value.simulatedRecordCount) && Number.isInteger(value.simulatedRecordCount) && value.simulatedRecordCount <= Number(value.recordCount)))
}

function isTrend(value: unknown): value is ProductionTrend[] {
  return Array.isArray(value) && value.every((row) => isRecord(row)
    && typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    && Number.isFinite(Date.parse(`${row.date}T00:00:00`))
    && hasNumbers(row, ['target', 'actual', 'defects']))
}

function isLines(value: unknown): value is LinePerformance[] {
  return Array.isArray(value) && value.every((row) => isRecord(row)
    && typeof row.productionLine === 'string'
    && hasNumbers(row, ['target', 'actual', 'defects', 'downtimeMinutes', 'achievement']) && hasRate(row))
}

async function request<T>(endpoint: string, validate: (value: unknown) => value is T, signal: AbortSignal, query: string): Promise<T> {
  const response = await fetch(apiUrl(`dashboard/${endpoint}${query}`), { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`The ${endpoint} request failed (HTTP ${response.status}).`)
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new Error(`The ${endpoint} API returned invalid JSON.`)
  }
  if (!validate(value)) throw new Error(`The ${endpoint} API returned an unexpected response.`)
  return value
}

export async function fetchDashboard(signal: AbortSignal, filters: DashboardFilters): Promise<DashboardData> {
  const query = dashboardQuery(filters)
  // Commit one complete snapshot only after all three requests succeed.
  const [summary, trend, lines] = await Promise.all([
    request('summary', isSummary, signal, query),
    request('trend', isTrend, signal, query),
    request('lines', isLines, signal, query),
  ])

  let simulatedRecordCount = summary.simulatedRecordCount
  if (simulatedRecordCount === undefined) {
    // Preserve labels when talking to an older summary contract. Never assume a count:
    // derive it from the same database records and inclusive date/line selection.
    const records = await fetchProductionLogs(signal)
    const matching = filterRecords(records, { ...EMPTY_FILTERS, ...filters, productionLine: filters.productionLine.trim() })
    if (matching.length !== summary.recordCount) throw new Error('Production records changed while loading the dashboard. Please refresh to load a consistent selection.')
    simulatedRecordCount = matching.filter(isSimulatedRecord).length
  }

  return { summary: { ...summary, simulatedRecordCount }, trend, lines }
}
