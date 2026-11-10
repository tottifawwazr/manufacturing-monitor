import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, Plus, RefreshCw, X } from 'lucide-react'
import { PageShell } from '../components/PageShell'
import { SimulationNotice } from '../components/SimulationNotice'
import { EmptyState, ErrorState } from '../components/States'
import { DeleteRecordDialog } from '../components/production-logs/DeleteRecordDialog'
import { Pagination } from '../components/production-logs/Pagination'
import { ProductionLogFilters } from '../components/production-logs/ProductionLogFilters'
import { ProductionLogsTable } from '../components/production-logs/ProductionLogsTable'
import { ProductionRecordDrawer } from '../components/production-logs/ProductionRecordDrawer'
import { useProductionLogs } from '../hooks/useProductionLogs'
import { EMPTY_FILTERS, filterRecords, isSimulatedRecord, PAGE_SIZE, sortRecords } from '../lib/productionLogs'
import { formatNumber } from '../lib/format'
import { publicDemoReadOnly } from '../lib/apiConfig'
import type { ProductionLog, ProductionLogFilters as Filters } from '../types/productionLog'
import './ProductionLogs.css'

export function ProductionLogsPage() {
  const { records, isLoading, error, reload, upsert, remove } = useProductionLogs()
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS })
  const [page, setPage] = useState(1)
  const [drawer, setDrawer] = useState<{ recordId: number | null } | null>(null)
  const [deleting, setDeleting] = useState<ProductionLog | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const filtered = useMemo(() => filterRecords(records ?? [], filters), [records, filters])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
  const visibleRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const filtersActive = Object.values(filters).some(Boolean)

  function changeFilters(next: Filters) {
    setFilters(next)
    setPage(1)
  }

  function handleSaved(record: ProductionLog) {
    const isEdit = drawer?.recordId != null
    const next = sortRecords([record, ...(records ?? []).filter((row) => row.id !== record.id)])
    upsert(record)
    reload()
    setFilters({ ...EMPTY_FILTERS })
    setPage(Math.floor(next.findIndex((row) => row.id === record.id) / PAGE_SIZE) + 1)
    setHighlightedId(record.id)
    setSuccess(`Record #${record.id} ${isEdit ? 'updated' : 'created'} successfully.${filtersActive ? ' Filters cleared to show the saved record.' : ''}`)
    setDrawer(null)
  }

  function handleDeleted(id: number) {
    remove(id)
    reload()
    setDeleting(null)
    setSuccess(`Record #${id} deleted successfully.`)
  }

  return (
    <PageShell page="production-logs">
      <div className="page-heading logs-page-heading">
        <div><p className="eyebrow">PRODUCTION MANAGEMENT</p><h1>Production Logs</h1><p className="page-description">Manage daily production records across your manufacturing lines.</p></div>
        <div className="button-group">
          <button className="button button-secondary" onClick={reload} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spin' : ''} aria-hidden="true" />Refresh</button>
          <button className="button button-primary" onClick={() => setDrawer({ recordId: null })} disabled={isLoading || records === null || publicDemoReadOnly}><Plus size={17} aria-hidden="true" />Add Production Record</button>
        </div>
      </div>
      <div className="logs-content">
        <SimulationNotice count={filtered.filter(isSimulatedRecord).length} />
        {success && <div className="success-feedback" role="status"><CheckCircle2 size={18} aria-hidden="true" /><span>{success}</span><button className="icon-button" aria-label="Dismiss success message" onClick={() => setSuccess(null)}><X size={16} aria-hidden="true" /></button></div>}
        <section className="card logs-summary" aria-label="Total production records">
          <span className="summary-icon"><ClipboardList size={24} aria-hidden="true" /></span>
          <div className="summary-number"><h2>Total Production Records</h2>{records === null ? isLoading ? <div className="skeleton" aria-label="Loading record count" /> : <p aria-label="Record count unavailable">—</p> : <p>{formatNumber(records.length)}<span>records</span></p>}</div>
          <div className="logs-summary-note"><strong>Every record, one workspace.</strong><p>Review output, track targets, and keep your production history up to date.</p></div>
        </section>
        <ProductionLogFilters filters={filters} onChange={changeFilters} onClear={() => changeFilters({ ...EMPTY_FILTERS })} disabled={isLoading} />
        {error && <ErrorState title={records ? 'Could not refresh production records' : 'Unable to load production records'} message={error} stale={records !== null} loading={isLoading} onRetry={reload} />}
        <section className="card logs-data-card" aria-labelledby="records-title" aria-busy={isLoading}>
          <div className="card-heading"><div><h2 id="records-title">Production Records</h2><p>{isLoading ? 'Loading records…' : `${formatNumber(filtered.length)} ${filtered.length === 1 ? 'record' : 'records'}${filtersActive ? ' match your filters' : ' across all production lines'}`}</p></div><span className="card-tag">ALL RECORDED DATA</span></div>
          {records === null ? isLoading ? <div className="table-loading" role="status" aria-label="Loading production records">{Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton" aria-hidden="true" />)}</div> : <EmptyState title="Production records unavailable" description="Retry the API request above to load your records." />
            : records.length === 0 ? <EmptyState title="No production records yet" description="Select Add Production Record to enter your first production log." />
              : filtered.length === 0 ? <div><EmptyState title="No matching production records" description="Try a different search, date range, production line, or shift." /><button className="button button-secondary empty-clear" onClick={() => changeFilters({ ...EMPTY_FILTERS })}>Clear Filters</button></div>
                : <ProductionLogsTable records={visibleRecords} disabled={isLoading || publicDemoReadOnly} highlightedId={highlightedId} onEdit={(id) => setDrawer({ recordId: id })} onDelete={setDeleting} />}
          {records !== null && <Pagination count={filtered.length} page={currentPage} onChange={setPage} disabled={isLoading} />}
          <p className="status-policy">Calculated status: On Target ≥100% · At Risk 90–&lt;100% · Below Target &lt;90%. Achievement = actual / target; — means no target.</p>
        </section>
      </div>
      <footer className="dashboard-footer"><span>MPMS <span aria-hidden="true">/</span> Production Logs</span><span>Production log reporting</span></footer>
      {drawer && <ProductionRecordDrawer key={drawer.recordId ?? 'new'} recordId={drawer.recordId} onClose={() => setDrawer(null)} onSaved={handleSaved} />}
      {deleting && <DeleteRecordDialog record={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />}
    </PageShell>
  )
}
