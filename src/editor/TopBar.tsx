import { useHistoryStore, selectCanUndo, selectCanRedo } from '../store/history'
import { useProjectStore } from '../store/project'

interface TopBarButtonProps {
  label: string
  title: string
  disabled?: boolean
  onClick?: () => void
}

function TopBarButton({ label, title, disabled = false, onClick }: TopBarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
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
  const canUndo = useHistoryStore(selectCanUndo)
  const canRedo = useHistoryStore(selectCanRedo)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

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
        <TopBarButton label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} />
        <TopBarButton
          label="Redo"
          title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
          disabled={!canRedo}
          onClick={redo}
        />
      </div>

      <Divider />

      <TopBarButton label="Export" title="Export PNG (Phase 11)" disabled />
    </header>
  )
}
