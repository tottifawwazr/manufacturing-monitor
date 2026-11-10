import { CircleCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LinePerformance, ProductionTrend } from '../types/dashboard'
import { formatCompact, formatDate, formatNumber, formatPercent, formatShortDate } from '../lib/format'
import { ChartCard, ProductionLegend } from './ChartCard'
import { ChartSkeleton, EmptyState } from './States'
import { LINE_DESCRIPTIONS } from '../lib/productionLogs'

const defectColors = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#E76F51', '#64748B']
const axisTick = { fill: '#64748B', fontSize: 11 }
const tooltipStyle = { border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px #14263d12' }
const unitsTooltip = (value: unknown) => `${formatNumber(Number(value))} units`

function OutputChart({ lines }: { lines?: LinePerformance[] }) {
  return (
    <ChartCard title="Production Output vs Target" subtitle="Total output by production line" action={<span className="card-tag">UNITS</span>} className="output-card">
      <ProductionLegend />
      {lines === undefined ? <ChartSkeleton /> : lines.length === 0 ? <EmptyState title="No line output available" description="Production line data will appear here when recorded." /> : (
        <div className="chart-scroll" role="region" aria-label="Output chart by production line" tabIndex={0}><div className="chart-area" style={{ minWidth: Math.max(300, lines.length * 76) }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={lines} margin={{ top: 14, right: 12, left: 0, bottom: 2 }} barGap={5}>
              <CartesianGrid stroke="#EDF1F5" vertical={false} />
              <XAxis dataKey="productionLine" tick={axisTick} axisLine={false} tickLine={false} tickMargin={12} interval={0} height={42} tickFormatter={(value: string) => value.length > 14 ? `${value.slice(0, 13)}…` : value} />
              <YAxis tick={axisTick} tickFormatter={formatCompact} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F8FAFC' }} formatter={unitsTooltip} labelFormatter={(label) => LINE_DESCRIPTIONS[String(label)] ? `${label} — ${LINE_DESCRIPTIONS[String(label)]}` : String(label)} />
              <Bar dataKey="actual" name="Actual output" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
              <Bar dataKey="target" name="Target" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div></div>
      )}
    </ChartCard>
  )
}

function TrendChart({ trend }: { trend?: ProductionTrend[] }) {
  return (
    <ChartCard title="Production Trend" subtitle="Daily actual output and planned target" className="trend-card">
      <ProductionLegend />
      {trend === undefined ? <ChartSkeleton /> : trend.length === 0 ? <EmptyState title="No daily production available" description="Daily totals will appear here when production is recorded." /> : (
        <>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={trend} margin={{ top: 14, right: 20, left: 0, bottom: 2 }}>
                <CartesianGrid stroke="#EDF1F5" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={axisTick} axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} height={42} />
                <YAxis tick={axisTick} tickFormatter={formatCompact} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={unitsTooltip} labelFormatter={(label) => formatDate(String(label))} />
                <Line type="linear" dataKey="target" name="Target" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={2} dot={trend.length === 1} isAnimationActive={false} />
                <Line type="linear" dataKey="actual" name="Actual output" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data">
            <summary>View daily data</summary>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Daily production totals</caption>
                <thead>
                  <tr><th scope="col">Date</th><th scope="col">Target</th><th scope="col">Actual</th><th scope="col">Defects</th></tr>
                </thead>
                <tbody>
                  {trend.map((row) => (
                    <tr key={row.date}>
                      <th scope="row">{formatDate(row.date)}</th>
                      <td>{formatNumber(row.target)}</td>
                      <td>{formatNumber(row.actual)}</td>
                      <td>{formatNumber(row.defects)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </ChartCard>
  )
}

function DefectChart({ lines }: { lines?: LinePerformance[] }) {
  const defects = lines?.filter((line) => line.defects > 0)
  const total = defects?.reduce((sum, line) => sum + line.defects, 0) ?? 0
  return (
    <ChartCard title="Defect Distribution" subtitle="Recorded defects by production line" className="defect-card">
      {lines === undefined ? <ChartSkeleton /> : total === 0 ? (
        <EmptyState title={lines.length > 0 ? 'No defects recorded' : 'No defect data available'} description={lines.length > 0 ? 'No defective units were reported in the production records.' : 'Defects by production line will appear here when recorded.'} icon={<CircleCheck size={24} aria-hidden="true" />} />
      ) : (
        <>
          <div className="donut-area">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={defects} dataKey="defects" nameKey="productionLine"
                  cx="50%" cy="50%" innerRadius="66%" outerRadius="88%"
                  paddingAngle={defects && defects.length > 1 ? 3 : 0}
                  strokeWidth={0} startAngle={90} endAngle={-270} isAnimationActive={false}
                >
                  {defects?.map((line, index) => (
                    <Cell key={line.productionLine} fill={defectColors[index % defectColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${formatNumber(Number(value))} defective units`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-hidden="true"><strong>{formatNumber(total)}</strong><span>Total defects</span></div>
          </div>
          <ul className="defect-legend" aria-label={`${formatNumber(total)} total defects by production line`}>
            {defects?.map((line, index) => (
              <li key={line.productionLine}>
                <span className="defect-line">
                  <i className="legend-dot" style={{ background: defectColors[index % defectColors.length] }} />
                  {line.productionLine}
                </span>
                <strong>{formatNumber(line.defects)}</strong>
                <span>{formatPercent(line.defects / total * 100)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartCard>
  )
}

export function DashboardCharts({ trend, lines }: { trend?: ProductionTrend[]; lines?: LinePerformance[] }) {
  return (
    <section id="production-analytics" className="analytics-grid" aria-label="Production analytics">
      <OutputChart lines={lines} />
      <TrendChart trend={trend} />
      <DefectChart lines={lines} />
    </section>
  )
}
