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
      <div className="relative z-10 w-80 rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl p-5 flex flex-col gap-4">
        <p id="confirm-dialog-message" className="text-sm text-neutral-200 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => respond(false)}
            className="px-3 py-1.5 text-[13px] rounded text-neutral-300 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            autoFocus
            className="px-3 py-1.5 text-[13px] rounded bg-violet-600 text-white hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
