import { lazy, Suspense } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { DashboardFilters } from '../components/DashboardFilters'
import { KpiCards } from '../components/KpiCards'
import { LinePerformanceTable } from '../components/LinePerformanceTable'
import { PageShell } from '../components/PageShell'
import { SimulationNotice } from '../components/SimulationNotice'
import { ChartSkeleton, EmptyState, ErrorState } from '../components/States'
import { useDashboard } from '../hooks/useDashboard'
import { formatDate, formatNumber } from '../lib/format'

const DashboardCharts = lazy(() =>
  import('../components/DashboardCharts').then((module) => ({ default: module.DashboardCharts })),
)

export function DashboardPage() {
  const { data, isLoading, error, updatedAt, refresh, filters, changeFilters, validationError } = useDashboard()
  const dates = data?.trend.map((point) => point.date).sort() ?? []
  const period = dates.length === 0 ? 'No matching dates'
    : dates.length === 1 ? formatDate(dates[0])
      : `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
  const filtered = Object.values(filters).some(Boolean)

  return (
    <PageShell page="overview" showSections={Boolean(data && data.summary.recordCount > 0)}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PRODUCTION DASHBOARD</p>
          <h1>Production Overview</h1>
          <p className="page-description">A clear view of production output, quality, and line performance.</p>
        </div>
        <button className="button button-primary" onClick={refresh} disabled={isLoading || Boolean(validationError)}>
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} aria-hidden="true" />
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <DashboardFilters filters={filters} onChange={changeFilters} error={validationError} />
      <div className="dashboard-meta">
        <span className="date-range"><CalendarDays size={15} aria-hidden="true" />{isLoading ? 'Loading selected production records…' : data ? period : 'Select a valid range and line'}</span>
        <span className="update-status" role="status" aria-live="polite">
          {isLoading ? (data ? 'Refreshing dashboard…' : 'Loading dashboard…') : updatedAt
            ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : validationError ? 'Filters need attention' : 'Data unavailable'}
        </span>
      </div>
      {error && <ErrorState message={error} stale={Boolean(data)} onRetry={refresh} loading={isLoading} />}
      <div className="dashboard-content" aria-busy={isLoading}>
        {data && <SimulationNotice count={data.summary.simulatedRecordCount} />}
        {(data || isLoading) && <KpiCards summary={data?.summary} />}
        {validationError ? (
          <section className="card"><EmptyState title="Check your date range" description={validationError} /></section>
        ) : data?.summary.recordCount === 0 ? (
          <section className="card empty-dashboard" aria-label="No production data">
            <EmptyState title={filtered ? 'No production records match these filters' : 'No production records yet'} description={filtered ? 'Try another date range or production line, or clear the filters.' : 'Add production records in Production Logs, then refresh this dashboard.'} />
          </section>
        ) : (data || isLoading) ? (
          <>
            <Suspense fallback={<section id="production-analytics" className="card" aria-label="Loading production analytics"><ChartSkeleton /></section>}>
              <DashboardCharts trend={data?.trend} lines={data?.lines} />
            </Suspense>
            <LinePerformanceTable lines={data?.lines} />
          </>
        ) : null}
      </div>
      <footer className="dashboard-footer">
        <span>MPMS <span aria-hidden="true">/</span> Production Overview</span>
        <span>{data ? `${formatNumber(data.summary.recordCount)} production ${data.summary.recordCount === 1 ? 'record' : 'records'} · ${filtered ? 'Filtered records' : 'All recorded data'}` : 'Production log reporting'}</span>
      </footer>
    </PageShell>
  )
}
