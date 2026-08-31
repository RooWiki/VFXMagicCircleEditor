import type { ReactNode } from 'react'

interface ToolButtonProps {
  label: string
  title: string
  active?: boolean
  disabled?: boolean
  icon: ReactNode
}

function ToolButton({ label, title, active = false, disabled = false, icon }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ? true : undefined}
      title={title}
      disabled={disabled}
      className={[
        'flex items-center justify-center w-9 h-9 rounded mx-auto my-0.5',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
        active
          ? 'bg-violet-600/30 text-violet-300'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200',
        disabled
          ? 'text-neutral-600 cursor-not-allowed hover:bg-transparent hover:text-neutral-600'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
    </button>
  )
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M4 2.5v14.2l3.4-3.4 2.1 4.7 1.8-.8-2.1-4.7H13L4 2.5z" />
    </svg>
  )
}

function RingIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.5" />
    </svg>
  )
}

function RadialLinesIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <line x1="10" y1="2.5" x2="10" y2="17.5" />
      <line x1="2.5" y1="10" x2="17.5" y2="10" />
      <line x1="4.6" y1="4.6" x2="15.4" y2="15.4" />
      <line x1="15.4" y1="4.6" x2="4.6" y2="15.4" />
    </svg>
  )
}

function PanIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M10 2v16M2 10h16" />
      <path d="M10 2l-2 2.5M10 2l2 2.5M10 18l-2-2.5M10 18l2-2.5" />
      <path d="M2 10l2.5-2M2 10l2.5 2M18 10l-2.5-2M18 10l-2.5 2" />
    </svg>
  )
}

function FitViewIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
      <rect x="6" y="6" width="8" height="8" strokeWidth="1" />
    </svg>
  )
}

export default function ToolRail() {
  return (
    <nav
      aria-label="Tools"
      className="flex flex-col w-14 shrink-0 bg-neutral-900 border-r border-neutral-700 py-1.5"
    >
      <ToolButton
        label="Select"
        title="Select (coming in Phase 4)"
        active
        disabled
        icon={<SelectIcon />}
      />

      <div aria-hidden="true" className="mx-2 my-1.5 h-px bg-neutral-700" />

      <ToolButton
        label="Add Ring"
        title="Add Ring (coming in Phase 5)"
        disabled
        icon={<RingIcon />}
      />
      <ToolButton
        label="Add Radial Lines"
        title="Add Radial Lines (coming in Phase 9)"
        disabled
        icon={<RadialLinesIcon />}
      />

      <div aria-hidden="true" className="mx-2 my-1.5 h-px bg-neutral-700" />

      <ToolButton label="Pan" title="Pan (coming in Phase 4)" disabled icon={<PanIcon />} />
      <ToolButton
        label="Fit View"
        title="Fit View (coming in Phase 4)"
        disabled
        icon={<FitViewIcon />}
      />
    </nav>
  )
}
