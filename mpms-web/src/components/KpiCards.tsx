import { Clock3, Package, ShieldCheck, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardSummary } from '../types/dashboard'
import { formatDefectRate, formatNumber, formatPercent } from '../lib/format'

interface KpiCardProps {
  label: string
  value?: string
  unit?: string
  detail?: string
  icon: LucideIcon
  tone: string
}

function KpiCard({ label, value, unit, detail, icon: Icon, tone }: KpiCardProps) {
  return (
    <article className="card kpi-card">
      <div className="kpi-top"><h2>{label}</h2><span className={`kpi-icon ${tone}`}><Icon size={19} aria-hidden="true" /></span></div>
      {value === undefined ? <><div className="skeleton kpi-value-skeleton" /><div className="skeleton kpi-detail-skeleton" /></> : <><p className="kpi-value">{value}{unit && <span>{unit}</span>}</p><p className="kpi-detail">{detail}</p></>}
    </article>
  )
}

export function KpiCards({ summary }: { summary?: DashboardSummary }) {
  return (
    <section className="kpi-grid" aria-label="Production key performance indicators">
      <KpiCard label="Total Production" value={summary && formatNumber(summary.totalProduction)} unit="units" detail={summary && `${formatNumber(summary.totalTarget)} units planned`} icon={Package} tone="blue" />
      <KpiCard label="Target Achievement" value={summary && formatPercent(summary.targetAchievement)} detail="Actual output / planned target" icon={Target} tone="green" />
      <KpiCard label="Defect Rate" value={summary && formatDefectRate(summary.defectRate)} detail={summary && (summary.defectRate === null ? 'N/A — no actual production' : `${formatNumber(summary.totalDefects)} defective units recorded`)} icon={ShieldCheck} tone="amber" />
      <KpiCard label="Total Downtime" value={summary && formatNumber(summary.totalDowntimeMinutes)} unit="min" detail="Total recorded downtime" icon={Clock3} tone="purple" />
    </section>
  )
}
