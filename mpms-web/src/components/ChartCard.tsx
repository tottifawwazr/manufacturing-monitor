import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function ChartCard({ title, subtitle, children, className = '', action }: ChartCardProps) {
  return (
    <section className={`card chart-card ${className}`} aria-label={title}>
      <div className="card-heading">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ProductionLegend() {
  return (
    <div className="chart-legend" aria-label="Chart legend">
      <span><i className="legend-dot actual" />Actual output</span>
      <span><i className="legend-dot target" />Target</span>
    </div>
  )
}
