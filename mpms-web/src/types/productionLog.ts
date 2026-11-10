export interface ProductionRecordInput {
  productionDate: string
  productionLine: string
  shift: string
  targetUnits: number
  actualUnits: number
  defectUnits: number
  downtimeMinutes: number
  notes: string | null
}

export interface ProductionLog extends ProductionRecordInput {
  id: number
}

export interface RecordFormValues {
  productionDate: string
  productionLine: string
  shift: string
  targetUnits: string
  actualUnits: string
  defectUnits: string
  downtimeMinutes: string
  notes: string
}

export type RecordFormErrors = Partial<Record<keyof RecordFormValues, string>>

export interface ProductionLogFilters {
  search: string
  startDate: string
  endDate: string
  productionLine: string
  shift: string
}
