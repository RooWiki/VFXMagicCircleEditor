import { useToastStore, type ToastKind } from '../store/toast'

function kindClass(kind: ToastKind): string {
  if (kind === 'success') return 'bg-emerald-900 border-emerald-700 text-emerald-100'
  if (kind === 'error') return 'bg-red-900 border-red-700 text-red-100'
  return 'bg-amber-900 border-amber-700 text-amber-100'
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-[13px] shadow-lg pointer-events-auto ${kindClass(toast.kind)}`}
          data-testid={`toast-${toast.kind}`}
        >
          <span className="flex-1 leading-relaxed">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 text-current leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
