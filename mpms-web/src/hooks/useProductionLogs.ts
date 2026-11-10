import { useEffect, useState } from 'react'
import { fetchProductionLogs, getApiErrorMessage } from '../lib/productionLogsApi'
import { sortRecords } from '../lib/productionLogs'
import type { ProductionLog } from '../types/productionLog'

interface LogsState {
  records: ProductionLog[] | null
  isLoading: boolean
  error: string | null
}

export function useProductionLogs() {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<LogsState>({ records: null, isLoading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    fetchProductionLogs(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setState({ records: sortRecords(records), isLoading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState((previous) => ({ ...previous, isLoading: false, error: getApiErrorMessage(error) }))
      })
    return () => controller.abort()
  }, [revision])

  function reload() {
    setState((previous) => ({ ...previous, isLoading: true, error: null }))
    setRevision((previous) => previous + 1)
  }

  function upsert(record: ProductionLog) {
    setState((previous) => ({ ...previous, error: null, records: sortRecords([record, ...(previous.records ?? []).filter((row) => row.id !== record.id)]) }))
  }

  function remove(id: number) {
    setState((previous) => ({ ...previous, error: null, records: (previous.records ?? []).filter((row) => row.id !== id) }))
  }

  return { ...state, reload, upsert, remove }
}
