import { ChartColumnIncreasing, ChevronRight, Factory, LayoutDashboard, ListChecks } from 'lucide-react'
import { NavigationLink } from './NavigationLink'

export function Sidebar({ showSections, page }: { showSections: boolean; page: 'overview' | 'production-logs' }) {
  return (
    <aside className="sidebar">
      <NavigationLink className="brand" href="/" aria-label="MPMS dashboard">
        <span className="brand-mark"><Factory size={25} aria-hidden="true" /></span>
        <span><strong>MPMS</strong><small>Manufacturing intelligence</small></span>
      </NavigationLink>
      <div className="sidebar-body">
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <NavigationLink className={`nav-item ${page === 'overview' ? 'selected' : ''}`} href="/" aria-current={page === 'overview' ? 'page' : undefined}>
            <LayoutDashboard size={18} aria-hidden="true" /><span>Overview</span><ChevronRight size={15} aria-hidden="true" />
          </NavigationLink>
          <NavigationLink className={`nav-item ${page === 'production-logs' ? 'selected' : ''}`} href="/production-logs" aria-current={page === 'production-logs' ? 'page' : undefined}>
            <ListChecks size={18} aria-hidden="true" /><span>Production Logs</span><ChevronRight size={15} aria-hidden="true" />
          </NavigationLink>
        </nav>
        {showSections && (
          <>
            <p className="nav-label section-nav-label">ON THIS PAGE</p>
            <nav className="section-nav" aria-label="Dashboard sections">
              <a href="#production-analytics"><ChartColumnIncreasing size={17} aria-hidden="true" />Production analytics</a>
              <a href="#line-performance"><ListChecks size={17} aria-hidden="true" />Line performance</a>
            </nav>
          </>
        )}
      </div>
      <div className="sidebar-footer"><span className="sidebar-footer-icon"><Factory size={18} aria-hidden="true" /></span><div><strong>Production workspace</strong><span>Production log reporting</span></div></div>
    </aside>
  )
}
