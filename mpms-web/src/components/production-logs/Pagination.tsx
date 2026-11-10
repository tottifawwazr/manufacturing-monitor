import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE } from '../../lib/productionLogs'
import { formatNumber } from '../../lib/format'

interface PaginationProps {
  count: number
  page: number
  onChange: (page: number) => void
  disabled: boolean
}

export function Pagination({ count, page, onChange, disabled }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index)

  return (
    <div className="logs-pagination">
      <p role="status">Showing <strong>{count ? formatNumber((page - 1) * PAGE_SIZE + 1) : '0'}–{formatNumber(Math.min(page * PAGE_SIZE, count))}</strong> of <strong>{formatNumber(count)}</strong> records</p>
      <nav aria-label="Production logs pagination">
        <span className="page-description-text">{PAGE_SIZE} per page</span>
        <button className="page-button" aria-label="Previous page" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        {pages.map((number) => <button key={number} className={`page-button ${page === number ? 'current-page' : ''}`} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined} disabled={disabled || count === 0} onClick={() => onChange(number)}>{number}</button>)}
        <button className="page-button" aria-label="Next page" disabled={disabled || page >= pageCount} onClick={() => onChange(page + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
    </div>
  )
}
