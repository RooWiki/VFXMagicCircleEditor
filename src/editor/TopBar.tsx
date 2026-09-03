import { useRef } from 'react'
import { isProjectDirty } from '../persistence/autosave'
import { downloadProject, newProject, openProject } from '../persistence/projectIO'
import { useAnimationStore } from '../store/animation'
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../store/history'
import { useExportModalStore } from '../store/exportModal'
import { useProjectStore } from '../store/project'
import { useTemplateGalleryStore } from '../store/templateGalleryStore'
import { useThemeStore } from '../store/themeStore'

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
        if (e.detail > 0) e.currentTarget.blur()
      }}
      className="px-3 py-1.5 text-[13px] rounded hover:bg-[var(--rw-bg-control)] disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rw-focus)]"
      style={{
        color: disabled ? 'var(--rw-text-disabled)' : 'var(--rw-text-secondary)',
      }}
    >
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      className="w-px h-5 mx-1.5"
      style={{ background: 'var(--rw-border-default)' }}
    />
  )
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M17.5 11.5A7.5 7.5 0 0 1 8.5 2.5a7.5 7.5 0 1 0 9 9z" />
    </svg>
  )
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
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

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
    e.target.value = ''
  }

  const handleSave = () => {
    downloadProject()
  }

  return (
    <header
      role="banner"
      aria-label="Application toolbar"
      className="flex items-center h-11 px-3 shrink-0 gap-2 border-b"
      style={{
        background: 'var(--rw-bg-panel)',
        borderColor: 'var(--rw-border-default)',
      }}
    >
      {/* Brand */}
      <span
        className="text-[13px] font-semibold whitespace-nowrap mr-1"
        style={{ color: 'var(--rw-text-primary)' }}
      >
        Roowiki
      </span>
      <span aria-hidden="true" className="text-[13px]" style={{ color: 'var(--rw-text-tertiary)' }}>
        |
      </span>
      <span
        className="text-[13px] font-medium whitespace-nowrap"
        style={{ color: 'var(--rw-text-secondary)' }}
      >
        Magic Circle Editor
      </span>

      <span
        aria-label="Current project"
        className="text-[13px] truncate max-w-40 ml-1"
        title={title}
        style={{ color: 'var(--rw-text-tertiary)' }}
      >
        {title}
      </span>

      <div className="flex-1" />

      {/* Hidden file input */}
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

      <Divider />

      {/* Theme toggle */}
      <button
        type="button"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={(e) => {
          toggleTheme()
          if (e.detail > 0) e.currentTarget.blur()
        }}
        className="flex items-center justify-center w-8 h-8 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rw-focus)]"
        style={{ color: 'var(--rw-text-secondary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--rw-bg-control)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = ''
        }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  )
}
