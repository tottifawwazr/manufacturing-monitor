import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import type { ProductionLogFilters as Filters } from '../../types/productionLog'
import { PRODUCTION_LINES, SHIFTS } from '../../lib/productionLogs'

interface FiltersProps {
  filters: Filters
  disabled: boolean
  onChange: (filters: Filters) => void
  onClear: () => void
}

export function ProductionLogFilters({ filters, disabled, onChange, onClear }: FiltersProps) {
  const invalidRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate)
  function update(field: keyof Filters, value: string) { onChange({ ...filters, [field]: value }) }

  return (
    <section className="card logs-filters" aria-labelledby="filters-title">
      <div className="filters-heading"><h2 id="filters-title"><SlidersHorizontal size={15} aria-hidden="true" />Filter records</h2>
        <button className="clear-filters" onClick={onClear} disabled={disabled || !Object.values(filters).some(Boolean)}><RotateCcw size={13} aria-hidden="true" />Clear Filters</button>
      </div>
      <div className="filters-grid">
        <div className="filter-field search-field"><label htmlFor="logs-search">Search records</label><div className="search-input"><Search size={16} aria-hidden="true" /><input id="logs-search" type="search" value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Record ID or notes…" disabled={disabled} /></div></div>
        <div className="filter-field"><label htmlFor="logs-start-date">From date</label><input id="logs-start-date" type="date" min="0001-01-01" max="9999-12-31" value={filters.startDate} onChange={(event) => update('startDate', event.target.value)} disabled={disabled} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'date-range-error' : undefined} /></div>
        <div className="filter-field"><label htmlFor="logs-end-date">To date</label><input id="logs-end-date" type="date" min="0001-01-01" max="9999-12-31" value={filters.endDate} onChange={(event) => update('endDate', event.target.value)} disabled={disabled} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'date-range-error' : undefined} /></div>
        <div className="filter-field"><label htmlFor="logs-line">Production line</label><select id="logs-line" value={filters.productionLine} onChange={(event) => update('productionLine', event.target.value)} disabled={disabled}><option value="">All lines</option>{PRODUCTION_LINES.map((line) => <option key={line}>{line}</option>)}</select></div>
        <div className="filter-field"><label htmlFor="logs-shift">Shift</label><select id="logs-shift" value={filters.shift} onChange={(event) => update('shift', event.target.value)} disabled={disabled}><option value="">All shifts</option>{SHIFTS.map((shift) => <option key={shift}>{shift}</option>)}</select></div>
      </div>
      {invalidRange && <p id="date-range-error" className="field-error" role="alert">From date must be on or before To date.</p>}
    </section>
  )
}
