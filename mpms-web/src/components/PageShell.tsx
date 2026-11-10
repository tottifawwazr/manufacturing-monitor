import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { publicDemoReadOnly } from '../lib/apiConfig'

interface PageShellProps {
  page: 'overview' | 'production-logs'
  showSections?: boolean
  children: ReactNode
}

export function PageShell({ page, showSections = false, children }: PageShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar page={page} showSections={showSections} />
      <div className="workspace">
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>Workspace</span><ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">{page === 'overview' ? 'Overview' : 'Production Logs'}</span>
          </nav>
          <span className="topbar-label">Manufacturing Production Monitoring System</span>
        </header>
        <main id="main-content" tabIndex={-1}>
          {publicDemoReadOnly && <div className="simulation-notice public-demo-notice" role="note">Public demo: read-only. Run MPMS locally to add, edit, or delete production records.</div>}
          {children}
        </main>
      </div>
    </div>
  )
}
