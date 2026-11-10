import { useEffect, useState } from 'react'
import { ClipboardList, LoaderCircle, X } from 'lucide-react'
import { Modal } from '../Modal'
import { RecordForm } from './RecordForm'
import { fetchProductionLog, getApiErrorMessage } from '../../lib/productionLogsApi'
import type { ProductionLog } from '../../types/productionLog'

interface DrawerProps {
  recordId: number | null
  onClose: () => void
  onSaved: (record: ProductionLog) => void
}

export function ProductionRecordDrawer({ recordId, onClose, onSaved }: DrawerProps) {
  const [state, setState] = useState<{ record?: ProductionLog; error: string | null; loading: boolean }>({ error: null, loading: recordId !== null })
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (recordId === null) return
    const controller = new AbortController()
    fetchProductionLog(recordId, controller.signal)
      .then((record) => { if (!controller.signal.aborted) setState({ record, error: null, loading: false }) })
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ error: getApiErrorMessage(error), loading: false }) })
    return () => controller.abort()
  }, [recordId, revision])

  function retry() {
    setState({ loading: true, error: null })
    setRevision((previous) => previous + 1)
  }

  return (
    <Modal className="record-drawer" titleId="drawer-title" descriptionId="drawer-description" busy={busy} onDismiss={onClose}>
      <header className="drawer-header">
        <div className="drawer-title-row"><span className="drawer-icon"><ClipboardList size={21} aria-hidden="true" /></span><div>
          <p className="eyebrow">PRODUCTION LOGS</p>
          <h2 id="drawer-title">{recordId === null ? 'Add Production Record' : 'Edit Production Record'}</h2>
        </div></div>
        <button type="button" className="icon-button" aria-label="Close production record drawer" onClick={onClose} disabled={busy}><X size={19} aria-hidden="true" /></button>
      </header>
      <p className="drawer-description" id="drawer-description">{recordId === null ? 'Enter production details to add a new record.' : `Review and update the details for record #${recordId}.`}</p>
      {state.loading ? <div className="drawer-loading" role="status"><LoaderCircle size={25} className="spin" aria-hidden="true" />Loading production record…</div>
        : state.error ? <div className="drawer-load-error"><div role="alert">{state.error}</div><button className="button button-secondary" onClick={retry}>Try again</button><button className="button button-secondary" onClick={onClose}>Cancel</button></div>
          : <RecordForm record={state.record} onSaved={onSaved} onCancel={onClose} onBusyChange={setBusy} />}
    </Modal>
  )
}
