import type { DashboardFilters } from '../types/dashboard'
import { isCalendarDate } from './productionLogs.ts'

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = { startDate: '', endDate: '', productionLine: '' }

export function validateDashboardFilters(filters: DashboardFilters) {
  if (filters.startDate && !isCalendarDate(filters.startDate)) return 'Enter a valid Start Date.'
  if (filters.endDate && !isCalendarDate(filters.endDate)) return 'Enter a valid End Date.'
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return 'Start Date must be on or before End Date.'
  return null
}

export function dashboardQuery(filters: DashboardFilters) {
  const query = new URLSearchParams()
  if (filters.startDate) query.set('startDate', filters.startDate)
  if (filters.endDate) query.set('endDate', filters.endDate)
  if (filters.productionLine.trim()) query.set('productionLine', filters.productionLine.trim())
  return query.size ? `?${query}` : ''
}
