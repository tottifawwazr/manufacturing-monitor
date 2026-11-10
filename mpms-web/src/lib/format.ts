const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const percentFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export const formatNumber = (value: number) => numberFormatter.format(value)
export const formatPercent = (value: number | null) => value === null ? '—' : `${percentFormatter.format(value)}%`
export const formatDefectRate = (value: number | null) => value === null ? 'N/A' : formatPercent(value)
// DateOnly values are local calendar dates, not UTC timestamps.
export const formatDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00`))
export const formatShortDate = (date: string) => shortDateFormatter.format(new Date(`${date}T00:00:00`))
export const formatCompact = (value: number) => value >= 1_000_000 ? `${formatNumber(value / 1_000_000)}m` : value >= 1_000 ? `${formatNumber(value / 1_000)}k` : formatNumber(value)
