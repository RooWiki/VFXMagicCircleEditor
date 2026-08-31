import { useProjectStore } from '../store/project'

interface TopBarButtonProps {
  label: string
  title: string
  disabled?: boolean
}

function TopBarButton({ label, title, disabled = false }: TopBarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      className="px-3 py-1.5 text-[13px] rounded text-neutral-200 hover:bg-neutral-800 hover:text-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
    >
      {label}
    </button>
  )
}

function Divider() {
  return <div aria-hidden="true" className="w-px h-5 bg-neutral-700 mx-1.5" />
}

export default function TopBar() {
  const title = useProjectStore((s) => s.project.meta.title)

  return (
    <header
      role="banner"
      aria-label="Application toolbar"
      className="flex items-center h-11 px-3 bg-neutral-900 border-b border-neutral-700 shrink-0 gap-2"
    >
      <span className="text-[14px] font-semibold text-neutral-100 whitespace-nowrap mr-1">
        Magic Circle Editor
      </span>

      <span
        aria-label="Current project"
        className="text-[13px] text-neutral-400 truncate max-w-40"
        title={title}
      >
        {title}
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <TopBarButton label="New" title="New Project (Phase 10)" disabled />
        <TopBarButton label="Open" title="Open Project (Phase 10)" disabled />
        <TopBarButton label="Save" title="Save Project (Phase 10)" disabled />
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <TopBarButton label="Undo" title="Undo (Phase 8)" disabled />
        <TopBarButton label="Redo" title="Redo (Phase 8)" disabled />
      </div>

      <Divider />

      <TopBarButton label="Export" title="Export PNG (Phase 11)" disabled />
    </header>
  )
}
