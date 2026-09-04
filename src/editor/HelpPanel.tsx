import { useEffect, useRef } from 'react'
import { useHelpPanelStore } from '../store/helpPanel'

interface ShortcutRow {
  keys: string[]
  action: string
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['Ctrl+Z'], action: 'Undo' },
  { keys: ['Ctrl+Shift+Z', 'Ctrl+Y'], action: 'Redo' },
  { keys: ['Ctrl+S'], action: 'Save / Download project' },
  { keys: ['Ctrl+D'], action: 'Duplicate selected layer' },
  { keys: ['Ctrl+0'], action: 'Fit View' },
  { keys: ['Delete', 'Backspace'], action: 'Delete selected layer' },
  { keys: ['Tab', 'Shift+Tab'], action: 'Cycle through layers' },
  { keys: ['↑ ↓ ← →'], action: 'Nudge selected layer 1 unit' },
  { keys: ['Shift+↑↓←→'], action: 'Nudge selected layer 10 units' },
  { keys: ['?'], action: 'Open keyboard shortcuts' },
  { keys: ['Esc'], action: 'Close this panel' },
]

export default function HelpPanel() {
  const { isOpen, close } = useHelpPanelStore()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-panel-title"
      data-testid="help-panel"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative z-10 w-[480px] max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl border flex flex-col"
        style={{
          background: 'var(--rw-bg-panel)',
          borderColor: 'var(--rw-border-default)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--rw-border-default)' }}
        >
          <h2
            id="help-panel-title"
            className="text-sm font-semibold"
            style={{ color: 'var(--rw-text-primary)' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close keyboard shortcuts"
            onClick={close}
            className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2"
            style={{ color: 'var(--rw-text-secondary)', outlineColor: 'var(--rw-focus)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--rw-bg-control)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ''
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        {/* Shortcut table */}
        <table className="w-full border-collapse" role="table" aria-label="Keyboard shortcuts">
          <thead>
            <tr className="text-left" style={{ borderBottom: '1px solid var(--rw-border-subtle)' }}>
              <th
                className="px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--rw-text-tertiary)' }}
              >
                Shortcut
              </th>
              <th
                className="px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--rw-text-tertiary)' }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ keys, action }) => (
              <tr
                key={action}
                className="border-t"
                style={{ borderColor: 'var(--rw-border-subtle)' }}
              >
                <td className="px-5 py-2.5 align-middle">
                  <span className="flex flex-wrap gap-1">
                    {keys.map((k) => (
                      <kbd
                        key={k}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono border"
                        style={{
                          background: 'var(--rw-bg-raised)',
                          borderColor: 'var(--rw-border-default)',
                          color: 'var(--rw-text-primary)',
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </td>
                <td
                  className="px-5 py-2.5 text-sm align-middle"
                  style={{ color: 'var(--rw-text-secondary)' }}
                >
                  {action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
