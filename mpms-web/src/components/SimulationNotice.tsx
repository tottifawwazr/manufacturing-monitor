import { FlaskConical } from 'lucide-react'
import { formatNumber } from '../lib/format'

export function SimulationNotice({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="simulation-notice" role="note">
      <FlaskConical size={16} aria-hidden="true" />
      <span><strong>Simulated manufacturing data</strong> · This selection includes {formatNumber(count)} development demo {count === 1 ? 'record' : 'records'}.</span>
    </div>
  )
}
