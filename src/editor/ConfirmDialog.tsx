import { useConfirmStore } from '../store/confirm'

export default function ConfirmDialog() {
  const { isOpen, message, respond } = useConfirmStore()

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => respond(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative z-10 w-80 rounded-lg shadow-2xl p-5 flex flex-col gap-4 border"
        style={{
          background: 'var(--rw-bg-panel)',
          borderColor: 'var(--rw-border-default)',
        }}
      >
        <p
          id="confirm-dialog-message"
          className="text-sm leading-relaxed"
          style={{ color: 'var(--rw-text-primary)' }}
        >
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => respond(false)}
            className="px-3 py-1.5 text-[13px] rounded focus-visible:outline focus-visible:outline-2"
            style={{
              color: 'var(--rw-text-secondary)',
              outlineColor: 'var(--rw-focus)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--rw-bg-control)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ''
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            autoFocus
            className="px-3 py-1.5 text-[13px] rounded focus-visible:outline focus-visible:outline-2"
            style={{
              background: 'var(--rw-text-primary)',
              color: 'var(--rw-bg-panel)',
              outlineColor: 'var(--rw-focus)',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
