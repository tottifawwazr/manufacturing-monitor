import type { ProductionLog, ProductionLogFilters, RecordFormErrors, RecordFormValues } from '../types/productionLog'

export const PRODUCTION_LINES = ['Line A', 'Line B', 'Line C']
export const LINE_DESCRIPTIONS: Record<string, string> = { 'Line A': 'Robotic Stamping', 'Line B': 'Laser Welding', 'Line C': 'Surface Treatment' }
export const SIMULATED_NOTE_PREFIX = '[SIMULATED MPMS-DEMO-20261110-v1:'
export const isSimulatedRecord = (record: ProductionLog) => record.notes?.startsWith(SIMULATED_NOTE_PREFIX) ?? false
export const SHIFTS = ['Morning', 'Afternoon', 'Night']
export const PAGE_SIZE = 10
export const MAX_INTEGER = 2_147_483_647
export const EMPTY_FILTERS: ProductionLogFilters = { search: '', startDate: '', endDate: '', productionLine: '', shift: '' }
export const EMPTY_FORM: RecordFormValues = { productionDate: '', productionLine: '', shift: '', targetUnits: '', actualUnits: '', defectUnits: '', downtimeMinutes: '', notes: '' }

export function getAchievement(record: ProductionLog) {
  return record.targetUnits > 0 ? record.actualUnits / record.targetUnits * 100 : null
}

// Frontend reporting policy. Compare the unrounded percentage at each boundary.
export function getRecordStatus(achievement: number | null) {
  if (achievement === null) return { label: 'No target', tone: 'neutral' }
  if (achievement >= 100) return { label: 'On Target', tone: 'achieved' }
  if (achievement >= 90) return { label: 'At Risk', tone: 'below-target' }
  return { label: 'Below Target', tone: 'status-low' }
}

export function sortRecords(records: ProductionLog[]) {
  return [...records].sort((a, b) => b.productionDate.localeCompare(a.productionDate) || b.id - a.id)
}

export function filterRecords(records: ProductionLog[], filters: ProductionLogFilters) {
  const search = filters.search.trim().toLowerCase().replace(/^#/, '')
  return records.filter((record) => (
    (!search || String(record.id).includes(search) || (record.notes ?? '').toLowerCase().includes(search))
    && (!filters.startDate || record.productionDate >= filters.startDate)
    && (!filters.endDate || record.productionDate <= filters.endDate)
    && (!filters.productionLine || record.productionLine === filters.productionLine)
    && (!filters.shift || record.shift === filters.shift)
  ))
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01' || value > '9999-12-31') return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateRecord(values: RecordFormValues): RecordFormErrors {
  const errors: RecordFormErrors = {}
  if (!isCalendarDate(values.productionDate) || values.productionDate === '0001-01-01') errors.productionDate = 'Enter a valid production date.'
  if (!values.productionLine.trim()) errors.productionLine = 'Select a production line.'
  else if (values.productionLine.length > 50) errors.productionLine = 'Use 50 characters or fewer.'
  if (!values.shift.trim()) errors.shift = 'Select a shift.'
  else if (values.shift.length > 20) errors.shift = 'Use 20 characters or fewer.'
  const numericFields = ['targetUnits', 'actualUnits', 'defectUnits', 'downtimeMinutes'] as const
  for (const field of numericFields) {
    const raw = values[field].trim()
    const value = Number(raw)
    if (!raw) errors[field] = 'This field is required.'
    else if (field === 'targetUnits' && value <= 0) errors[field] = 'Target units must be greater than zero.'
    else if (value < 0) errors[field] = 'Enter zero or a positive whole number.'
    else if (!Number.isInteger(value) || !/^\d+$/.test(raw) || value > MAX_INTEGER) errors[field] = `Enter a whole number up to ${MAX_INTEGER.toLocaleString('en-US')}.`
  }
  if (!errors.defectUnits && !errors.actualUnits && Number(values.defectUnits) > Number(values.actualUnits)) {
    errors.defectUnits = 'Defect units cannot exceed actual units.'
  }
  if (values.notes.length > 500) errors.notes = 'Use 500 characters or fewer.'
  return errors
}

export function toFormValues(record: ProductionLog): RecordFormValues {
  return {
    productionDate: record.productionDate, productionLine: record.productionLine, shift: record.shift,
    targetUnits: String(record.targetUnits), actualUnits: String(record.actualUnits),
    defectUnits: String(record.defectUnits), downtimeMinutes: String(record.downtimeMinutes), notes: record.notes ?? '',
  }
}
