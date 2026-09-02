import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      data-testid="confirm-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4">
        <h2 id="confirm-dialog-title" className="text-[15px] font-semibold text-neutral-100 mb-2">
          {title}
        </h2>
        <p className="text-[13px] text-neutral-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[13px] rounded text-neutral-300 bg-neutral-800 hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
            className="px-4 py-2 text-[13px] rounded text-white bg-violet-600 hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
