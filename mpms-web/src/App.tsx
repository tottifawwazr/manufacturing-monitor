import { useEffect } from 'react'
import { NavigationLink } from './components/NavigationLink'
import { PageShell } from './components/PageShell'
import { usePathname } from './lib/navigation'
import { DashboardPage } from './pages/DashboardPage'
import { ProductionLogsPage } from './pages/ProductionLogsPage'
import './App.css'

function App() {
  const pathname = usePathname()
  const path = pathname.replace(/\/$/, '') || '/'

  useEffect(() => {
    document.title = `${path === '/' ? 'Production Overview' : path === '/production-logs' ? 'Production Logs' : 'Page not found'} | MPMS`
    document.getElementById('main-content')?.focus()
    window.scrollTo(0, 0)
  }, [path])

  if (path === '/') return <DashboardPage />
  if (path === '/production-logs') return <ProductionLogsPage />
  return (
    <PageShell page="overview">
      <h1>Page not found</h1>
      <p className="page-description">This page does not exist.</p>
      <NavigationLink className="button button-primary" href="/">Return to Overview</NavigationLink>
    </PageShell>
  )
}

export default App
