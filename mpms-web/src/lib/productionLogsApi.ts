import type { ProductionLog, ProductionRecordInput, RecordFormErrors, RecordFormValues } from '../types/productionLog'
import { isCalendarDate, MAX_INTEGER } from './productionLogs.ts'
import { apiUrl } from './apiConfig.ts'

export class ProductionLogsApiError extends Error {
  status: number
  fieldErrors: RecordFormErrors

  constructor(message: string, status = 0, fieldErrors: RecordFormErrors = {}) {
    super(message)
    this.name = 'ProductionLogsApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function isRecord(value: unknown): value is ProductionLog {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Number.isInteger(row.id) && Number(row.id) > 0
    && typeof row.productionDate === 'string' && isCalendarDate(row.productionDate)
    && typeof row.productionLine === 'string' && typeof row.shift === 'string'
    && ['targetUnits', 'actualUnits', 'defectUnits', 'downtimeMinutes'].every((key) => Number.isInteger(row[key]) && Number(row[key]) >= 0 && Number(row[key]) <= MAX_INTEGER)
    && (row.notes === null || typeof row.notes === 'string')
}

async function request(path = '', options: RequestInit = {}) {
  const signal = AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(20_000)])
  let response: Response
  try {
    response = await fetch(apiUrl(`productionlogs${path}`), {
      ...options, signal, cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    const write = options.method && options.method !== 'GET'
    throw new ProductionLogsApiError(`${signal.aborted ? 'The API request timed out.' : 'Could not reach the production API.'} ${write ? 'Reload records before retrying; the change may have reached the server.' : 'Check the backend connection and try again.'}`)
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const problem = body && typeof body === 'object' ? body as Record<string, unknown> : {}
    const fieldErrors: RecordFormErrors = {}
    if (problem.errors && typeof problem.errors === 'object') {
      for (const [key, value] of Object.entries(problem.errors)) {
        const field = `${key.charAt(0).toLowerCase()}${key.slice(1)}` as keyof RecordFormValues
        if (Array.isArray(value) && value.every((message) => typeof message === 'string')) fieldErrors[field] = value.join(' ')
      }
    }
    const fallback = response.status === 404 ? 'This production record no longer exists. Reload the records list.' : `The API request failed (HTTP ${response.status}). Please try again.`
    throw new ProductionLogsApiError(typeof problem.message === 'string' ? problem.message : typeof problem.title === 'string' ? problem.title : fallback, response.status, fieldErrors)
  }
  return response
}

async function readRecord(response: Response) {
  const value: unknown = await response.json()
  if (!isRecord(value)) throw new ProductionLogsApiError('The API returned an unexpected production record.')
  return value
}

export async function fetchProductionLogs(signal?: AbortSignal) {
  const response = await request('', { signal })
  const value: unknown = await response.json()
  if (!Array.isArray(value) || !value.every(isRecord)) throw new ProductionLogsApiError('The API returned an unexpected records list.')
  return value
}

export async function fetchProductionLog(id: number, signal?: AbortSignal) {
  return readRecord(await request(`/${id}`, { signal }))
}

export async function saveProductionLog(values: ProductionRecordInput, id?: number): Promise<ProductionLog> {
  const response = await request(id === undefined ? '' : `/${id}`, { method: id === undefined ? 'POST' : 'PUT', body: JSON.stringify(values) })
  // PUT returns 204; the submitted fields are exactly the fields persisted by the API.
  return id === undefined ? readRecord(response) : { ...values, id }
}

export async function deleteProductionLog(id: number) {
  await request(`/${id}`, { method: 'DELETE' })
}

export const getApiErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
