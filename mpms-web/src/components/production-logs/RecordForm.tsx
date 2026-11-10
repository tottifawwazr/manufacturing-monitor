import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { LoaderCircle, Save } from 'lucide-react'
import type { ProductionLog, RecordFormErrors, RecordFormValues } from '../../types/productionLog'
import { EMPTY_FORM, MAX_INTEGER, PRODUCTION_LINES, SHIFTS, toFormValues, validateRecord } from '../../lib/productionLogs'
import { getApiErrorMessage, ProductionLogsApiError, saveProductionLog } from '../../lib/productionLogsApi'

interface RecordFormProps {
  record?: ProductionLog
  onSaved: (record: ProductionLog) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

interface FieldProps {
  name: keyof RecordFormValues
  label: string
  children: ReactNode
  error?: string
  optional?: boolean
  className?: string
}

function Field({ name, label, children, error, optional, className = '' }: FieldProps) {
  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={`record-${name}`}>{label} {optional ? <span className="optional-label">(optional)</span> : <span className="required-mark" aria-hidden="true">*</span>}</label>
      {children}
      {error && <p className="field-error" id={`record-${name}-error`}>{error}</p>}
    </div>
  )
}

const numericFields = [
  { name: 'targetUnits', label: 'Target Units', min: 1 },
  { name: 'actualUnits', label: 'Actual Units', min: 0 },
  { name: 'defectUnits', label: 'Defect Units', min: 0 },
  { name: 'downtimeMinutes', label: 'Downtime Minutes', min: 0 },
] as const

export function RecordForm({ record, onSaved, onCancel, onBusyChange }: RecordFormProps) {
  const [values, setValues] = useState<RecordFormValues>(() => record ? toFormValues(record) : { ...EMPTY_FORM })
  const [errors, setErrors] = useState<RecordFormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const submitting = useRef(false)

  function update(name: keyof RecordFormValues, value: string) {
    const next = { ...values, [name]: value }
    setValues(next)
    if (submitted) setErrors(validateRecord(next))
  }

  function inputProps(name: keyof RecordFormValues) {
    return {
      id: `record-${name}`, name, value: values[name], required: name !== 'notes',
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? `record-${name}-error` : undefined,
      onChange: (event: { target: { value: string } }) => update(name, event.target.value),
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    setSubmitted(true)
    const validation = validateRecord(values)
    setErrors(validation)
    setApiError(null)
    if (Object.keys(validation).length > 0) {
      const first = Object.keys(validation)[0]
      document.getElementById(`record-${first}`)?.focus()
      return
    }
    submitting.current = true
    setBusy(true)
    onBusyChange(true)
    try {
      const saved = await saveProductionLog({
        productionDate: values.productionDate, productionLine: values.productionLine, shift: values.shift,
        targetUnits: Number(values.targetUnits), actualUnits: Number(values.actualUnits),
        defectUnits: Number(values.defectUnits), downtimeMinutes: Number(values.downtimeMinutes),
        notes: values.notes.trim() || null,
      }, record?.id)
      onSaved(saved)
    } catch (error) {
      setApiError(getApiErrorMessage(error))
      if (error instanceof ProductionLogsApiError) setErrors(error.fieldErrors)
    } finally {
      submitting.current = false
      setBusy(false)
      onBusyChange(false)
    }
  }

  const extraLine = record && !PRODUCTION_LINES.includes(record.productionLine) ? record.productionLine : null
  const extraShift = record && !SHIFTS.includes(record.shift) ? record.shift : null

  return (
    <form className="record-form" noValidate onSubmit={handleSubmit}>
      <div className="drawer-body">
        <p className="form-required-note">Fields marked <span className="required-mark">*</span> are required.</p>
        {apiError && <div className="form-api-error" role="alert">{apiError}</div>}
        <fieldset disabled={busy} className="record-fieldset">
          <legend className="form-section-title">PRODUCTION DETAILS</legend>
          <div className="form-grid">
            <Field name="productionDate" label="Production Date" error={errors.productionDate} className="field-full">
              <input {...inputProps('productionDate')} type="date" min="0001-01-02" max="9999-12-31" autoFocus data-autofocus />
            </Field>
            <Field name="productionLine" label="Production Line" error={errors.productionLine}>
              <select {...inputProps('productionLine')}><option value="">Select line</option>{extraLine && <option>{extraLine}</option>}{PRODUCTION_LINES.map((line) => <option key={line}>{line}</option>)}</select>
            </Field>
            <Field name="shift" label="Shift" error={errors.shift}>
              <select {...inputProps('shift')}><option value="">Select shift</option>{extraShift && <option>{extraShift}</option>}{SHIFTS.map((shift) => <option key={shift}>{shift}</option>)}</select>
            </Field>
          </div>
        </fieldset>
        <fieldset disabled={busy} className="record-fieldset">
          <legend className="form-section-title">PRODUCTION METRICS</legend>
          <div className="form-grid">
            {numericFields.map(({ name, label, min }) => (
              <Field key={name} name={name} label={label} error={errors[name]}>
                <input {...inputProps(name)} type="number" min={min} max={MAX_INTEGER} step="1" inputMode="numeric" placeholder="0" />
              </Field>
            ))}
          </div>
          <p className="form-help">Enter whole units. Defective units are included in actual production.</p>
        </fieldset>
        <fieldset disabled={busy} className="record-fieldset">
          <legend className="form-section-title">ADDITIONAL INFORMATION</legend>
          <Field name="notes" label="Notes" error={errors.notes} optional>
            <textarea {...inputProps('notes')} maxLength={500} rows={4} placeholder="Add production notes, issues, or observations…" />
          </Field>
          <p className="notes-count">{values.notes.length}/500 characters</p>
        </fieldset>
      </div>
      <footer className="drawer-footer">
        <span>{record ? `Editing record #${record.id}` : 'New production record'}</span>
        <div className="button-group">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {busy ? 'Saving…' : 'Save Record'}
          </button>
        </div>
      </footer>
    </form>
  )
}
