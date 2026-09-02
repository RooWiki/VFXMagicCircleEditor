import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editor'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeOpenIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path d="M1 8C1 8 3.5 3 8 3s7 5 7 5-2.5 5-7 5S1 8 1 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path d="M2 2l12 12" />
      <path d="M6.7 6.8A2 2 0 0 0 8 10a2 2 0 0 0 1.3-3.2" />
      <path d="M9.9 3.5C9.3 3.2 8.7 3 8 3 3.5 3 1 8 1 8s.7 1.4 2 2.7" />
      <path d="M12 5c1.2 1.1 2 2.9 2 3s-2.5 5-7 5c-.7 0-1.4-.1-2-.3" />
    </svg>
  )
}

function LockClosedIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="10" height="7" rx="1.5" />
      <path d="M5.5 8V6a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  )
}

function LockOpenIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="10" height="7" rx="1.5" />
      <path d="M5.5 8V5a2.5 2.5 0 0 1 5 0" />
    </svg>
  )
}

function DuplicateIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V4a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 1 4v7A1.5 1.5 0 0 0 2.5 12.5H4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path d="M2.5 4.5h11M6 4.5V3h4v1.5" />
      <path d="M4 4.5l.7 8.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4.5" />
      <line x1="6.5" y1="7.5" x2="6.5" y2="11" />
      <line x1="9.5" y1="7.5" x2="9.5" y2="11" />
    </svg>
  )
}

function CenterIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5V4M8 12v2.5M1.5 8H4M12 8h2.5" />
    </svg>
  )
}

// ─── Action bar button ────────────────────────────────────────────────────────

interface ActionBtnProps {
  icon: React.ReactNode
  label: string
  title: string
  disabled: boolean
  onClick: () => void
}

function ActionBtn({ icon, label, title, disabled, onClick }: ActionBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        onClick()
        // detail > 0 = pointer click; detail === 0 = keyboard (Space/Enter) — don't blur those
        if (e.detail > 0) e.currentTarget.blur()
      }}
      className={[
        'flex items-center justify-center w-6 h-6 rounded',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
        disabled
          ? 'text-neutral-700 cursor-not-allowed'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200',
      ].join(' ')}
    >
      {icon}
    </button>
  )
}

// detail > 0 = pointer click; detail === 0 = keyboard (Space/Enter) — don't blur those
function blurOnPointer(e: MouseEvent<HTMLButtonElement>) {
  if (e.detail > 0) e.currentTarget.blur()
}

// ─── LayersPanel ──────────────────────────────────────────────────────────────

export default function LayersPanel() {
  const layers = useProjectStore((s) => s.project.layers)
  const reorderLayers = useProjectStore((s) => s.reorderLayers)
  const duplicateLayer = useProjectStore((s) => s.duplicateLayer)
  const renameLayer = useProjectStore((s) => s.renameLayer)
  const removeLayer = useProjectStore((s) => s.removeLayer)
  const centerLayer = useProjectStore((s) => s.centerLayer)
  const toggleLayerVisibility = useProjectStore((s) => s.toggleLayerVisibility)
  const toggleLayerLock = useProjectStore((s) => s.toggleLayerLock)
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds)
  const selectLayer = useEditorStore((s) => s.selectLayer)
  const clearSelection = useEditorStore((s) => s.clearSelection)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Drag state — display-index based (stable during a single drag)
  const [draggedDisplayIndex, setDraggedDisplayIndex] = useState<number | null>(null)
  const [dropTargetDisplayIndex, setDropTargetDisplayIndex] = useState<number | null>(null)

  const selectedId = selectedLayerIds[0] ?? null
  const hasSelection = selectedId !== null
  const isSelectedLocked = layers.find((l) => l.id === selectedId)?.locked ?? false

  // Focus rename input when rename mode starts
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  // Display order: reversed from array (panel top = SVG top)
  const displayLayers = [...layers].reverse()

  // ── Layer actions ──────────────────────────────────────────────────────────

  const handleDuplicate = () => {
    if (!selectedId) return
    const currentLayers = useProjectStore.getState().project.layers
    const origIndex = currentLayers.findIndex((l) => l.id === selectedId)
    if (origIndex === -1) return
    duplicateLayer(selectedId)
    // duplicateLayer inserts at origIndex + 1 in the array
    const newLayer = useProjectStore.getState().project.layers[origIndex + 1]
    if (newLayer) selectLayer(newLayer.id)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
  }

  const handleDelete = () => {
    if (!selectedId) return
    removeLayer(selectedId)
    clearSelection()
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
  }

  const handleCenter = () => {
    if (!selectedId) return
    const layer = useProjectStore.getState().project.layers.find((l) => l.id === selectedId)
    if (!layer || layer.locked) return
    if (layer.transform.x === 0 && layer.transform.y === 0) return
    centerLayer(selectedId)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
  }

  // ── Rename ─────────────────────────────────────────────────────────────────

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setDraftName(currentName)
  }

  const handleCommitRename = () => {
    if (!renamingId) return
    const trimmed = draftName.trim()
    if (trimmed) {
      const before = useProjectStore.getState().project.layers.find((l) => l.id === renamingId)
      if (before && before.name !== trimmed) {
        renameLayer(renamingId, trimmed)
        useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
      }
    }
    setRenamingId(null)
  }

  const handleCancelRename = () => {
    setRenamingId(null)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelRename()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation()
    }
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, displayIndex: number) => {
    setDraggedDisplayIndex(displayIndex)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, displayIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTargetDisplayIndex !== displayIndex) {
      setDropTargetDisplayIndex(displayIndex)
    }
  }

  const handleDrop = (displayIndex: number) => {
    if (draggedDisplayIndex === null) return
    const n = layers.length
    const fromArrayIndex = n - 1 - draggedDisplayIndex
    const toArrayIndex = n - 1 - displayIndex
    if (fromArrayIndex !== toArrayIndex) {
      reorderLayers(fromArrayIndex, toArrayIndex)
      useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    }
    setDraggedDisplayIndex(null)
    setDropTargetDisplayIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedDisplayIndex(null)
    setDropTargetDisplayIndex(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const iconBtnClass = [
    'flex items-center justify-center w-5 h-5 shrink-0 rounded',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
    'hover:text-neutral-200',
  ].join(' ')

  return (
    <div className="flex flex-col h-full">
      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-neutral-800 shrink-0">
        <ActionBtn
          icon={<DuplicateIcon />}
          label="Duplicate selected layer"
          title="Duplicate (Ctrl+D)"
          disabled={!hasSelection}
          onClick={handleDuplicate}
        />
        <ActionBtn
          icon={<TrashIcon />}
          label="Delete selected layer"
          title="Delete (Delete / Backspace)"
          disabled={!hasSelection}
          onClick={handleDelete}
        />
        <div className="flex-1" />
        <ActionBtn
          icon={<CenterIcon />}
          label="Center selected layer on canvas"
          title="Center on canvas"
          disabled={!hasSelection || isSelectedLocked}
          onClick={handleCenter}
        />
      </div>

      {/* ── Layer list or empty state ───────────────────────────────────────── */}
      {layers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 p-6 text-center flex-1">
          <p className="text-sm text-neutral-400">No layers yet. Add a Ring or Radial Lines.</p>
        </div>
      ) : (
        <ol aria-label="Layers" className="flex flex-col py-1 flex-1 overflow-y-auto">
          {displayLayers.map((layer, displayIndex) => {
            const isSelected = layer.id === selectedId
            const isDragging = draggedDisplayIndex === displayIndex
            const isDropTarget =
              dropTargetDisplayIndex === displayIndex && draggedDisplayIndex !== displayIndex
            const isRenaming = renamingId === layer.id

            return (
              <li
                key={layer.id}
                data-panel-layer-id={layer.id}
                draggable={!isRenaming}
                onDragStart={(e) => handleDragStart(e, displayIndex)}
                onDragOver={(e) => handleDragOver(e, displayIndex)}
                onDrop={() => handleDrop(displayIndex)}
                onDragEnd={handleDragEnd}
                className={[
                  'border-t-2',
                  isDropTarget ? 'border-violet-400' : 'border-transparent',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex items-center gap-1 px-2 py-1.5 text-xs',
                    isSelected
                      ? 'bg-violet-900/30 text-neutral-200'
                      : 'text-neutral-300 hover:bg-neutral-800/50',
                    isDragging ? 'opacity-40' : '',
                    !isRenaming ? 'cursor-grab' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="row"
                  aria-selected={isSelected}
                >
                  {/* Visibility toggle */}
                  <button
                    type="button"
                    aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                    onClick={(e) => {
                      toggleLayerVisibility(layer.id)
                      useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
                      blurOnPointer(e)
                    }}
                    style={{ cursor: 'pointer' }}
                    className={[
                      iconBtnClass,
                      layer.visible ? 'text-neutral-400' : 'text-neutral-600',
                    ].join(' ')}
                  >
                    {layer.visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>

                  {/* Lock toggle */}
                  <button
                    type="button"
                    aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`}
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    onClick={(e) => {
                      toggleLayerLock(layer.id)
                      useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
                      blurOnPointer(e)
                    }}
                    style={{ cursor: 'pointer' }}
                    className={[
                      iconBtnClass,
                      layer.locked ? 'text-amber-400' : 'text-neutral-600',
                    ].join(' ')}
                  >
                    {layer.locked ? <LockClosedIcon /> : <LockOpenIcon />}
                  </button>

                  {/* Layer name — rename input or select button */}
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={draftName}
                      aria-label="Rename layer"
                      data-testid="layer-rename-input"
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleCommitRename}
                      style={{ cursor: 'text' }}
                      className={[
                        'flex-1 min-w-0 rounded bg-neutral-800 border border-violet-500 px-1.5 py-0.5',
                        'text-xs text-neutral-200',
                        'focus:outline-none',
                      ].join(' ')}
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Select layer ${layer.name}`}
                      onClick={() => selectLayer(layer.id)}
                      onDoubleClick={() => handleStartRename(layer.id, layer.name)}
                      style={{ cursor: 'pointer' }}
                      className="flex-1 flex items-center gap-2 min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 rounded"
                    >
                      <span className="truncate" data-testid={`layer-name-${layer.id}`}>
                        {layer.name}
                      </span>
                      <span className="ml-auto shrink-0 text-neutral-500 capitalize">
                        {layer.type}
                      </span>
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
