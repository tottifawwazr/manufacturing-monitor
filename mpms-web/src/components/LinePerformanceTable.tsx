import { Factory } from 'lucide-react'
import type { LinePerformance } from '../types/dashboard'
import { formatDefectRate, formatNumber, formatPercent } from '../lib/format'
import { EmptyState } from './States'

export function LinePerformanceTable({ lines }: { lines?: LinePerformance[] }) {
  return (
    <section id="line-performance" className="card performance-card" aria-labelledby="line-performance-title">
      <div className="card-heading"><div><h2 id="line-performance-title">Line Performance Summary</h2><p>Production results across all recorded lines</p></div>{lines && <span className="line-count">{formatNumber(lines.length)} {lines.length === 1 ? 'line' : 'lines'}</span>}</div>
      {lines === undefined ? <div className="table-loading" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" />)}</div> : lines.length === 0 ? <EmptyState title="No production lines available" description="Line performance will appear here when production is recorded." /> : (
        <div className="table-scroll" role="region" aria-label="Line performance data" tabIndex={0}>
          <table className="performance-table">
            <caption className="sr-only">Target, actual production, achievement, defects, defect rate, and downtime by production line</caption>
            <thead><tr><th scope="col">Production line</th><th scope="col">Target</th><th scope="col">Actual</th><th scope="col">Achievement</th><th scope="col">Defects</th><th scope="col">Defect rate</th><th scope="col">Downtime</th></tr></thead>
            <tbody>{lines.map((line) => (
              <tr key={line.productionLine}>
                <th scope="row"><span className="line-name"><span className="line-icon"><Factory size={16} aria-hidden="true" /></span>{line.productionLine}</span></th>
                <td>{formatNumber(line.target)}</td><td className="actual-value">{formatNumber(line.actual)}</td>
                <td><span className={`achievement-badge ${line.target === 0 ? 'neutral' : line.achievement >= 100 ? 'achieved' : 'below-target'}`} title={line.target === 0 ? 'No target recorded' : line.achievement >= 100 ? 'Target met' : 'Below target'}>{formatPercent(line.achievement)}</span></td>
                <td>{formatNumber(line.defects)}</td><td title={line.defectRate === null ? 'No actual production' : undefined}>{formatDefectRate(line.defectRate)}</td><td>{formatNumber(line.downtimeMinutes)} <span className="unit">min</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="table-note">Achievement = actual / target. Defect rate = defects / actual; N/A indicates no actual production.</div>
    </section>
  )
}
