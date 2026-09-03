import { useRef } from 'react'
import { isProjectDirty } from '../persistence/autosave'
import { downloadProject, newProject, openProject } from '../persistence/projectIO'
import { useAnimationStore } from '../store/animation'
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../store/history'
import { useExportModalStore } from '../store/exportModal'
import { useProjectStore } from '../store/project'
import { useTemplateGalleryStore } from '../store/templateGalleryStore'

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
      onClick={(e) => {
        onClick?.()
        // detail > 0 = pointer click; detail === 0 = keyboard (Space/Enter) — don't blur those
        if (e.detail > 0) e.currentTarget.blur()
      }}
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
  const openExportModal = useExportModalStore((s) => s.open)
  const openTemplates = useTemplateGalleryStore((s) => s.open)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const playAnimation = useAnimationStore((s) => s.play)
  const pauseAnimation = useAnimationStore((s) => s.pause)
  const resetAnimation = useAnimationStore((s) => s.reset)

  // Hidden file input for Open Project
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNew = () => {
    void newProject(isProjectDirty())
  }

  const handleOpenClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    void openProject(file, isProjectDirty())
    // Reset so the same file can be opened again
    e.target.value = ''
  }

  const handleSave = () => {
    downloadProject()
  }

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

      {/* Hidden file input for Open Project */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.mce.json,application/json"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-0.5">
        <TopBarButton label="New" title="New Project" onClick={handleNew} />
        <TopBarButton label="Templates" title="New from Template" onClick={openTemplates} />
        <TopBarButton label="Open" title="Open Project" onClick={handleOpenClick} />
        <TopBarButton label="Save" title="Download Project (Ctrl+S)" onClick={handleSave} />
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

      <div className="flex items-center gap-0.5">
        <TopBarButton
          label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause Animation (Space)' : 'Play Animation (Space)'}
          onClick={isPlaying ? pauseAnimation : playAnimation}
        />
        <TopBarButton label="Reset" title="Reset Animation" onClick={resetAnimation} />
      </div>

      <Divider />

      <TopBarButton label="Export" title="Export PNG" onClick={openExportModal} />
    </header>
  )
}
