import { Pencil, Trash2 } from 'lucide-react'
import type { ProductionLog } from '../../types/productionLog'
import { formatDate, formatNumber, formatPercent } from '../../lib/format'
import { getAchievement, getRecordStatus, isSimulatedRecord, LINE_DESCRIPTIONS } from '../../lib/productionLogs'

interface TableProps {
  records: ProductionLog[]
  disabled: boolean
  highlightedId: number | null
  onEdit: (id: number) => void
  onDelete: (record: ProductionLog) => void
}

export function ProductionLogsTable({ records, disabled, highlightedId, onEdit, onDelete }: TableProps) {
  return (
    <div className="table-scroll" role="region" tabIndex={0} aria-label="Production records table">
      <table className="logs-table">
        <caption className="sr-only">Production records and management actions. Achievement and status are calculated from actual units divided by target units.</caption>
        <thead>
          <tr><th scope="col">Record ID</th><th scope="col">Production Date</th><th scope="col">Production Line</th><th scope="col">Shift</th><th scope="col">Target Units</th><th scope="col">Actual Units</th><th scope="col">Defect Units</th><th scope="col">Downtime Minutes</th><th scope="col">Target Achievement</th><th scope="col">Status</th><th scope="col">Actions</th></tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const achievement = getAchievement(record)
            const status = getRecordStatus(achievement)
            return (
              <tr key={record.id} className={highlightedId === record.id ? 'saved-record' : ''}>
                <th scope="row" className="record-id">#{record.id}{isSimulatedRecord(record) && <span className="simulation-badge" title="Simulated manufacturing demo record" aria-label="Simulated record">SIM</span>}</th>
                <td>{formatDate(record.productionDate)}</td>
                <td><span className="production-line-label" title={LINE_DESCRIPTIONS[record.productionLine]}>{record.productionLine}</span></td>
                <td><span className="shift-label">{record.shift}</span></td>
                <td>{formatNumber(record.targetUnits)}</td><td className="actual-value">{formatNumber(record.actualUnits)}</td>
                <td>{formatNumber(record.defectUnits)}</td><td>{formatNumber(record.downtimeMinutes)}</td>
                <td>{formatPercent(achievement)}</td>
                <td><span className={`achievement-badge ${status.tone}`}>{status.label}</span></td>
                <td><div className="row-actions">
                  <button className="icon-button edit-action" title={`Edit record #${record.id}`} aria-label={`Edit record #${record.id}`} onClick={() => onEdit(record.id)} disabled={disabled}><Pencil size={15} aria-hidden="true" /></button>
                  <button className="icon-button delete-action" title={`Delete record #${record.id}`} aria-label={`Delete record #${record.id}`} onClick={() => onDelete(record)} disabled={disabled}><Trash2 size={15} aria-hidden="true" /></button>
                </div></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
