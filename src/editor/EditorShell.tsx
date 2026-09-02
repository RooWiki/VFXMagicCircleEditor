import { useEffect } from 'react'
import { useEditorStore } from '../store/editor'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import { useViewportStore } from '../store/viewport'
import { isEditableElement } from '../utils/keyboard'
import RightSidebar from './RightSidebar'
import StatusBar from './StatusBar'
import ToastContainer from './ToastContainer'
import ToolRail from './ToolRail'
import TopBar from './TopBar'
import Workspace from './Workspace'

export default function EditorShell() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()
      const isEditable = isEditableElement(document.activeElement)
      const isRenaming = !!document.querySelector('[data-testid="layer-rename-input"]')

      // ── Ctrl+Z: Undo ────────────────────────────────────────────────────────
      if (ctrl && !shift && key === 'z' && !isEditable) {
        e.preventDefault()
        useHistoryStore.getState().undo()
        return
      }

      // ── Ctrl+Shift+Z / Ctrl+Y: Redo ─────────────────────────────────────────
      if (ctrl && ((shift && key === 'z') || (!shift && key === 'y')) && !isEditable) {
        e.preventDefault()
        useHistoryStore.getState().redo()
        return
      }

      // ── Ctrl+0: Fit View ────────────────────────────────────────────────────
      if (ctrl && e.key === '0' && !isEditable) {
        e.preventDefault()
        const canvas = useProjectStore.getState().project.canvas
        useViewportStore.getState().fitView(canvas.width, canvas.height)
        return
      }

      // ── Ctrl+D: Duplicate selected layer ────────────────────────────────────
      if (ctrl && key === 'd' && !isEditable) {
        e.preventDefault()
        const { selectedLayerIds, selectLayer } = useEditorStore.getState()
        const selectedId = selectedLayerIds[0] ?? null
        if (!selectedId) return
        const layers = useProjectStore.getState().project.layers
        const origIndex = layers.findIndex((l) => l.id === selectedId)
        if (origIndex === -1) return
        useProjectStore.getState().duplicateLayer(selectedId)
        const newLayer = useProjectStore.getState().project.layers[origIndex + 1]
        if (newLayer) selectLayer(newLayer.id)
        useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
        return
      }

      // ── Tab: Cycle layers ────────────────────────────────────────────────────
      if (e.key === 'Tab' && !isEditable && !isRenaming) {
        const layers = useProjectStore.getState().project.layers
        if (layers.length === 0) return
        e.preventDefault()
        const { selectedLayerIds, selectLayer } = useEditorStore.getState()
        const selectedId = selectedLayerIds[0] ?? null
        const currentIndex = selectedId !== null ? layers.findIndex((l) => l.id === selectedId) : -1
        const forward = !shift
        let nextIndex: number
        if (forward) {
          nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % layers.length
        } else {
          nextIndex =
            currentIndex === -1
              ? layers.length - 1
              : (currentIndex - 1 + layers.length) % layers.length
        }
        selectLayer(layers[nextIndex].id)
        return
      }

      // ── Delete / Backspace: Delete selected layer ────────────────────────────
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable && !isRenaming) {
        const { selectedLayerIds, clearSelection } = useEditorStore.getState()
        if (selectedLayerIds.length === 0) return
        useProjectStore.getState().removeLayer(selectedLayerIds[0])
        clearSelection()
        useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
        return
      }

      // ── Arrow nudge ──────────────────────────────────────────────────────────
      if (!isEditable && !isRenaming) {
        const isArrow =
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown'
        if (!isArrow) return

        const { selectedLayerIds } = useEditorStore.getState()
        const selectedId = selectedLayerIds[0] ?? null
        if (!selectedId) return
        const layer = useProjectStore.getState().project.layers.find((l) => l.id === selectedId)
        if (!layer || layer.locked) return

        e.preventDefault()
        const amount = shift ? 10 : 1
        const { x, y } = layer.transform
        let dx = 0
        let dy = 0
        if (e.key === 'ArrowLeft') dx = -amount
        else if (e.key === 'ArrowRight') dx = amount
        else if (e.key === 'ArrowUp') dy = -amount
        else if (e.key === 'ArrowDown') dy = amount

        useProjectStore.getState().updateLayerTransform(selectedId, { x: x + dx, y: y + dy })
        useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden bg-neutral-950 text-neutral-100"
      data-testid="editor-shell"
    >
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <ToolRail />
        <Workspace />
        <RightSidebar />
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  )
}
