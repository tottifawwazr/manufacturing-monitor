import { useRef, useState } from 'react'
import { AlertTriangle, LoaderCircle, Trash2, X } from 'lucide-react'
import { Modal } from '../Modal'
import type { ProductionLog } from '../../types/productionLog'
import { deleteProductionLog, getApiErrorMessage } from '../../lib/productionLogsApi'
import { formatDate } from '../../lib/format'

interface DeleteDialogProps {
  record: ProductionLog
  onClose: () => void
  onDeleted: (id: number) => void
}

export function DeleteRecordDialog({ record, onClose, onDeleted }: DeleteDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleting = useRef(false)

  async function confirmDelete() {
    if (deleting.current) return
    deleting.current = true
    setBusy(true)
    setError(null)
    try {
      await deleteProductionLog(record.id)
      onDeleted(record.id)
    } catch (error) {
      setError(getApiErrorMessage(error))
    } finally {
      deleting.current = false
      setBusy(false)
    }
  }

  return (
    <Modal className="delete-dialog" titleId="delete-title" descriptionId="delete-description" busy={busy} onDismiss={onClose}>
      <button className="icon-button dialog-close" aria-label="Close delete confirmation" onClick={onClose} disabled={busy}><X size={19} aria-hidden="true" /></button>
      <span className="delete-warning-icon"><AlertTriangle size={25} aria-hidden="true" /></span>
      <h2 id="delete-title">Delete production record?</h2>
      <p id="delete-description">Record <strong>#{record.id}</strong> for {record.productionLine} on {formatDate(record.productionDate)} will be permanently deleted. This action cannot be undone.</p>
      {error && <div className="form-api-error" role="alert">{error}</div>}
      <div className="delete-actions">
        <button className="button button-secondary" onClick={onClose} disabled={busy} data-autofocus>Cancel</button>
        <button className="button button-danger" onClick={confirmDelete} disabled={busy}>
          {busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
          {busy ? 'Deleting…' : 'Delete Record'}
        </button>
      </div>
    </Modal>
  )
}
