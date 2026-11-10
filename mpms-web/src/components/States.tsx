import { AlertCircle, Database, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
}

export function EmptyState({ title, description, icon = <Database size={23} aria-hidden="true" /> }: EmptyStateProps) {
  return <div className="empty-state"><span className="empty-state-icon">{icon}</span><h3>{title}</h3><p>{description}</p></div>
}

export function ErrorState({ message, stale, loading, onRetry, title }: { message: string; stale: boolean; loading: boolean; onRetry: () => void; title?: string }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={21} aria-hidden="true" />
      <div><h2>{title ?? (stale ? 'Refresh failed' : 'Unable to load the dashboard')}</h2><p>{message}{stale ? ' Showing the last successfully loaded data.' : ''}</p></div>
      <button className="button button-secondary" onClick={onRetry} disabled={loading}><RefreshCw size={15} aria-hidden="true" />Try again</button>
    </div>
  )
}

export function ChartSkeleton() {
  return <div className="chart-skeleton" aria-hidden="true"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
}
