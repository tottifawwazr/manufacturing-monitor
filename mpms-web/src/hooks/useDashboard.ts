import { useEffect, useRef, useState } from 'react'
import { fetchDashboard } from '../lib/dashboardApi'
import type { DashboardData, DashboardFilters } from '../types/dashboard'
import { EMPTY_DASHBOARD_FILTERS, validateDashboardFilters } from '../lib/dashboardFilters'

interface DashboardState {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  updatedAt: Date | null
}

export function useDashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({ ...EMPTY_DASHBOARD_FILTERS })
  const validationError = validateDashboardFilters(filters)
  const { startDate, endDate, productionLine } = filters
  const [revision, setRevision] = useState(0)
  const requestVersion = useRef(0)
  const [state, setState] = useState<DashboardState>({ data: null, isLoading: true, error: null, updatedAt: null })

  useEffect(() => {
    if (validationError) return
    const version = ++requestVersion.current
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 15_000)

    fetchDashboard(controller.signal, { startDate, endDate, productionLine })
      .then((data) => {
        if (active && version === requestVersion.current) setState({ data, isLoading: false, error: null, updatedAt: new Date() })
      })
      .catch((error: unknown) => {
        if (!active || version !== requestVersion.current) return
        controller.abort()
        const message = timedOut ? 'The API took too long to respond. Please try again.'
          : error instanceof TypeError ? 'Could not reach the production API. Check that the backend is running and try again.'
            : error instanceof Error ? error.message : 'Could not load production data. Please try again.'
        setState((previous) => ({ ...previous, isLoading: false, error: message }))
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [revision, startDate, endDate, productionLine, validationError])

  function changeFilters(next: DashboardFilters) {
    if (next.startDate === startDate && next.endDate === endDate && next.productionLine === productionLine) return
    requestVersion.current++
    setFilters(next)
    // A new selection must never display totals from the previous selection.
    setState({ data: null, isLoading: !validateDashboardFilters(next), error: null, updatedAt: null })
  }

  function refresh() {
    if (validationError) return
    requestVersion.current++
    setState((previous) => ({ ...previous, isLoading: true, error: null }))
    setRevision((previous) => previous + 1)
  }

  return { ...state, filters, validationError, changeFilters, refresh }
}
