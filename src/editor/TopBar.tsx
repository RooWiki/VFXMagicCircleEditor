import { useCallback, useRef, useState } from 'react'
import { parseProjectFile } from '../schema/project'
import { useEditorStore } from '../store/editor'
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../store/history'
import { usePersistenceStore } from '../store/persistence'
import { useProjectStore } from '../store/project'
import { useToastStore } from '../store/toast'
import { sanitizeFilename } from '../utils/persistence'
import { createDefaultProject } from '../utils/factories'
import ConfirmDialog from './ConfirmDialog'

// ─── Shared button component ──────────────────────────────────────────────────

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

// ─── Confirm dialog state ─────────────────────────────────────────────────────

interface PendingAction {
  type: 'open' | 'new'
  execute: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TopBar() {
  const title = useProjectStore((s) => s.project.meta.title)
  const isDirty = usePersistenceStore((s) => s.isDirty)

  const canUndo = useHistoryStore(selectCanUndo)
  const canRedo = useHistoryStore(selectCanRedo)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  // After confirming the dirty-open dialog, skip the re-check in handleFileChange
  const skipDirtyCheckRef = useRef(false)

  const addToast = useToastStore((s) => s.addToast)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const hasLayers = () => useProjectStore.getState().project.layers.length > 0
  const needsConfirm = () => isDirty && hasLayers()

  const confirmOrExecute = useCallback(
    (type: 'open' | 'new', execute: () => void) => {
      if (needsConfirm()) {
        setPendingAction({ type, execute })
      } else {
        execute()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDirty]
  )

  // ── Download ───────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    const now = new Date().toISOString()
    const currentProject = useProjectStore.getState().project
    const projectToSave = {
      ...currentProject,
      meta: { ...currentProject.meta, modified: now },
    }
    const json = JSON.stringify(projectToSave, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(projectToSave.meta.title)}.mce.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Update meta.modified in the store and push history entry
    useProjectStore.getState().setProjectMeta({ modified: now })
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    usePersistenceStore.getState().setBaseline(useProjectStore.getState().project)
  }, [])

  // ── Open ───────────────────────────────────────────────────────────────────

  const executeOpen = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (typeof text !== 'string') {
          addToast('error', 'Could not read the file.')
          return
        }
        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          addToast('error', 'The file is not valid JSON and could not be opened.')
          return
        }
        const result = parseProjectFile(parsed)
        if (!result.ok) {
          addToast('error', result.error)
          return
        }
        if (result.warnings.length > 0) {
          result.warnings.forEach((w) => addToast('warning', w))
        }
        useProjectStore.getState().setProject(result.project)
        useEditorStore.getState().clearSelection()
        useHistoryStore.getState().initHistory(result.project)
        usePersistenceStore.getState().setBaseline(result.project)
        addToast('success', `Opened "${result.project.meta.title}"`)
      }
      reader.readAsText(file)
    },
    [addToast]
  )

  const handleOpenClick = useCallback(() => {
    const triggerInput = () => {
      fileInputRef.current?.click()
    }
    confirmOrExecute('open', triggerInput)
  }, [confirmOrExecute])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Reset so the same file can be re-selected
      e.target.value = ''

      const doOpen = () => executeOpen(file)
      // If the user already confirmed the dirty-open dialog, skip the check this time.
      if (skipDirtyCheckRef.current) {
        skipDirtyCheckRef.current = false
        doOpen()
        return
      }
      if (needsConfirm()) {
        setPendingAction({ type: 'open', execute: doOpen })
      } else {
        doOpen()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executeOpen, isDirty]
  )

  // ── New ────────────────────────────────────────────────────────────────────

  const handleNewClick = useCallback(() => {
    const doNew = () => {
      const freshProject = createDefaultProject()
      useProjectStore.getState().setProject(freshProject)
      useEditorStore.getState().clearSelection()
      useHistoryStore.getState().initHistory(freshProject)
      usePersistenceStore.getState().setBaseline(freshProject)
    }
    confirmOrExecute('new', doNew)
  }, [confirmOrExecute])

  // ── Confirm dialog handlers ────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const action = pendingAction
    setPendingAction(null)
    if (action?.type === 'open') {
      skipDirtyCheckRef.current = true
    }
    action?.execute()
  }, [pendingAction])

  const handleCancel = useCallback(() => {
    setPendingAction(null)
  }, [])

  // ── Dialog title/message ───────────────────────────────────────────────────

  const dialogTitle = pendingAction?.type === 'new' ? 'New Project' : 'Open Project'
  const dialogMessage =
    pendingAction?.type === 'new'
      ? 'You have unsaved changes. Creating a new project will discard them. Continue?'
      : 'You have unsaved changes. Opening a new project will discard them. Continue?'

  return (
    <>
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
          {isDirty && (
            <span aria-label="unsaved changes" className="ml-1 text-neutral-500">
              •
            </span>
          )}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <TopBarButton label="New" title="New Project" onClick={handleNewClick} />
          <TopBarButton label="Open" title="Open Project" onClick={handleOpenClick} />
          <TopBarButton label="Save" title="Download Project" onClick={handleDownload} />
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.mce.json,application/json"
        aria-hidden="true"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
        data-testid="file-input"
      />

      {/* Confirmation dialog */}
      {pendingAction !== null && (
        <ConfirmDialog
          title={dialogTitle}
          message={dialogMessage}
          confirmLabel="Discard and Continue"
          cancelLabel="Keep Editing"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}
