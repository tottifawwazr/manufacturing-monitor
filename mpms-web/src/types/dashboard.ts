// Simulation metadata was added in Phase 3; older API binaries return the core metrics only.
export interface DashboardSummaryResponse {
  recordCount: number
  simulatedRecordCount?: number
  totalProduction: number
  totalTarget: number
  totalDefects: number
  totalDowntimeMinutes: number
  targetAchievement: number
  defectRate: number | null
}

// The API service resolves optional metadata from stored records before publishing a snapshot.
export interface DashboardSummary extends DashboardSummaryResponse {
  simulatedRecordCount: number
}

export interface ProductionTrend {
  date: string
  target: number
  actual: number
  defects: number
}

export interface LinePerformance {
  productionLine: string
  target: number
  actual: number
  defects: number
  downtimeMinutes: number
  achievement: number
  defectRate: number | null
}

export interface DashboardData {
  summary: DashboardSummary
  trend: ProductionTrend[]
  lines: LinePerformance[]
}

export interface DashboardFilters {
  startDate: string
  endDate: string
  productionLine: string
}
