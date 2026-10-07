'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal: inert background, focus containment, Escape and opener restoration. */
export default function AccessibleDialog({ open, onClose, titleId, children, className = '', canClose = true }: {
  open: boolean
  onClose: () => void
  titleId: string
  children: ReactNode
  className?: string
  canClose?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      element.showModal()
    } else if (!open && element.open) {
      element.close()
      if (opener.current?.isConnected) opener.current.focus()
    }
  }, [open])
  useEffect(() => () => {
    if (opener.current?.isConnected) opener.current.focus()
  }, [])
  return <dialog ref={dialog} aria-labelledby={titleId} className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/50 ${className}`}
    onCancel={event => { event.preventDefault(); if (canClose) onClose() }}
    onClick={event => {
      if (!canClose || event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}>
    {children}
  </dialog>
}
