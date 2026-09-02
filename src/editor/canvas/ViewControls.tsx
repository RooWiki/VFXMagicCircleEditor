import type { MouseEvent } from 'react'
import { useEditorStore, type PreviewBackground } from '../../store/editor'

function GridIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <line x1="5" y1="1" x2="5" y2="15" />
      <line x1="11" y1="1" x2="11" y2="15" />
      <line x1="1" y1="5" x2="15" y2="5" />
      <line x1="1" y1="11" x2="15" y2="11" />
    </svg>
  )
}

function GuidesIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="3 2"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <line x1="8" y1="1" x2="8" y2="15" />
      <line x1="1" y1="8" x2="15" y2="8" />
    </svg>
  )
}

const BG_OPTIONS: { value: PreviewBackground; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'transparent', label: 'Checker' },
]

// detail > 0 = pointer click; detail === 0 = keyboard (Space/Enter) — don't blur those
function blurOnPointer(e: MouseEvent<HTMLButtonElement>) {
  if (e.detail > 0) e.currentTarget.blur()
}

export default function ViewControls() {
  const {
    gridVisible,
    guidesVisible,
    previewBackground,
    setGridVisible,
    setGuidesVisible,
    setPreviewBackground,
  } = useEditorStore()

  return (
    <div
      className="absolute bottom-3 right-3 flex items-center gap-1 pointer-events-auto"
      data-testid="view-controls"
    >
      {/* Grid toggle */}
      <button
        type="button"
        aria-label="Toggle grid"
        aria-pressed={gridVisible}
        title={gridVisible ? 'Hide grid' : 'Show grid'}
        onClick={(e) => {
          setGridVisible(!gridVisible)
          blurOnPointer(e)
        }}
        className={[
          'flex items-center justify-center w-7 h-7 rounded text-xs',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
          gridVisible
            ? 'bg-violet-600/40 text-violet-300'
            : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-200',
        ].join(' ')}
      >
        <GridIcon />
      </button>

      {/* Guides toggle */}
      <button
        type="button"
        aria-label="Toggle guides"
        aria-pressed={guidesVisible}
        title={guidesVisible ? 'Hide guides' : 'Show guides'}
        onClick={(e) => {
          setGuidesVisible(!guidesVisible)
          blurOnPointer(e)
        }}
        className={[
          'flex items-center justify-center w-7 h-7 rounded text-xs',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
          guidesVisible
            ? 'bg-violet-600/40 text-violet-300'
            : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-200',
        ].join(' ')}
      >
        <GuidesIcon />
      </button>

      {/* Separator */}
      <span aria-hidden="true" className="w-px h-4 bg-neutral-700 mx-0.5" />

      {/* Background selector */}
      {BG_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-label={`Preview background: ${label}`}
          aria-pressed={previewBackground === value}
          title={`${label} background`}
          onClick={(e) => {
            setPreviewBackground(value)
            blurOnPointer(e)
          }}
          className={[
            'flex items-center justify-center h-7 px-2 rounded text-[11px] font-medium',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
            previewBackground === value
              ? 'bg-violet-600/40 text-violet-300'
              : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-200',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
