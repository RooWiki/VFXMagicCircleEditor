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

function blurOnPointer(e: MouseEvent<HTMLButtonElement>) {
  if (e.detail > 0) e.currentTarget.blur()
}

// Overlay button — floats over the canvas; uses semi-transparent panel bg so it
// reads on both dark and light workspace backgrounds.
function OverlayBtn({
  active,
  label,
  title,
  children,
  onClick,
}: {
  active: boolean
  label: string
  title: string
  children: React.ReactNode
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className="flex items-center justify-center h-7 px-2 rounded text-[11px] font-medium focus-visible:outline focus-visible:outline-2"
      style={{
        background: active ? 'var(--rw-active-bg)' : 'var(--rw-bg-panel)',
        color: active ? 'var(--rw-active-text)' : 'var(--rw-text-secondary)',
        border: `1px solid ${active ? 'var(--rw-active-border)' : 'var(--rw-border-default)'}`,
        outlineColor: 'var(--rw-focus)',
        opacity: 0.92,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--rw-bg-control)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? 'var(--rw-active-bg)' : 'var(--rw-bg-panel)'
      }}
    >
      {children}
    </button>
  )
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
      <OverlayBtn
        active={gridVisible}
        label="Toggle grid"
        title={gridVisible ? 'Hide grid' : 'Show grid'}
        onClick={(e) => {
          setGridVisible(!gridVisible)
          blurOnPointer(e)
        }}
      >
        <GridIcon />
      </OverlayBtn>

      {/* Guides toggle */}
      <OverlayBtn
        active={guidesVisible}
        label="Toggle guides"
        title={guidesVisible ? 'Hide guides' : 'Show guides'}
        onClick={(e) => {
          setGuidesVisible(!guidesVisible)
          blurOnPointer(e)
        }}
      >
        <GuidesIcon />
      </OverlayBtn>

      {/* Separator */}
      <span
        aria-hidden="true"
        className="w-px h-4 mx-0.5"
        style={{ background: 'var(--rw-border-default)' }}
      />

      {/* Preview background selector — viewport/preview controls only */}
      {BG_OPTIONS.map(({ value, label }) => (
        <OverlayBtn
          key={value}
          active={previewBackground === value}
          label={`Preview background: ${label}`}
          title={`${label} background`}
          onClick={(e) => {
            setPreviewBackground(value)
            blurOnPointer(e)
          }}
        >
          {label}
        </OverlayBtn>
      ))}
    </div>
  )
}
