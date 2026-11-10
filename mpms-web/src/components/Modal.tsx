import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  titleId: string
  descriptionId?: string
  className: string
  busy?: boolean
  onDismiss: () => void
  children: ReactNode
}

export function Modal({ titleId, descriptionId, className, busy = false, onDismiss, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
      else document.getElementById('main-content')?.focus()
    }
  }, [])

  useEffect(() => {
    if (!busy) return
    // Disabling the focused Save button can move keyboard focus to the document.
    // Capture Escape there as well as within the dialog until the write finishes.
    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('keydown', blockEscape, true)
    return () => window.removeEventListener('keydown', blockEscape, true)
  }, [busy])

  return (
    <dialog
      ref={ref} className={className} aria-labelledby={titleId} aria-describedby={descriptionId}
      aria-modal="true" aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onDismiss()
      }}
    >
      {children}
    </dialog>
  )
}
