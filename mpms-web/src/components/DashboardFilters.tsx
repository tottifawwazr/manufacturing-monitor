import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { DashboardFilters as Filters } from '../types/dashboard'
import { EMPTY_DASHBOARD_FILTERS } from '../lib/dashboardFilters'
import { LINE_DESCRIPTIONS, PRODUCTION_LINES } from '../lib/productionLogs'

interface DashboardFiltersProps {
  filters: Filters
  error: string | null
  onChange: (filters: Filters) => void
}

export function DashboardFilters({ filters, error, onChange }: DashboardFiltersProps) {
  const update = (field: keyof Filters, value: string) => onChange({ ...filters, [field]: value })
  return (
    <section className="card dashboard-filters" aria-labelledby="dashboard-filters-title">
      <div className="dashboard-filter-heading">
        <h2 id="dashboard-filters-title"><SlidersHorizontal size={15} aria-hidden="true" />Dashboard filters</h2>
        <button className="dashboard-clear" onClick={() => onChange({ ...EMPTY_DASHBOARD_FILTERS })} disabled={!Object.values(filters).some(Boolean)}><RotateCcw size={13} aria-hidden="true" />Clear Filters</button>
      </div>
      <div className="dashboard-filter-grid">
        <div className="dashboard-filter-field"><label htmlFor="dashboard-start-date">Start Date</label><input id="dashboard-start-date" type="date" min="0001-01-01" max="9999-12-31" value={filters.startDate} onChange={(event) => update('startDate', event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'dashboard-filter-error' : undefined} /></div>
        <div className="dashboard-filter-field"><label htmlFor="dashboard-end-date">End Date</label><input id="dashboard-end-date" type="date" min="0001-01-01" max="9999-12-31" value={filters.endDate} onChange={(event) => update('endDate', event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'dashboard-filter-error' : undefined} /></div>
        <div className="dashboard-filter-field"><label htmlFor="dashboard-line">Production Line</label><select id="dashboard-line" value={filters.productionLine} onChange={(event) => update('productionLine', event.target.value)}><option value="">All production lines</option>{PRODUCTION_LINES.map((line) => <option key={line} value={line}>{line} — {LINE_DESCRIPTIONS[line]}</option>)}</select></div>
      </div>
      {error && <p className="dashboard-filter-error" role="alert" id="dashboard-filter-error">{error}</p>}
      <p className="dashboard-filter-help">Filters update all KPIs, charts, and line results together. Date boundaries are inclusive.</p>
    </section>
  )
}
