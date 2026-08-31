import { useEffect } from 'react'
import { useEditorStore } from '../store/editor'
import { useProjectStore } from '../store/project'
import RightSidebar from './RightSidebar'
import StatusBar from './StatusBar'
import ToolRail from './ToolRail'
import TopBar from './TopBar'
import Workspace from './Workspace'

function isEditableElement(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  )
}

export default function EditorShell() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return
      if (isEditableElement(document.activeElement)) return
      if (document.querySelector('[data-testid="layer-rename-input"]')) return

      const { selectedLayerIds, clearSelection } = useEditorStore.getState()
      if (selectedLayerIds.length === 0) return

      useProjectStore.getState().removeLayer(selectedLayerIds[0])
      clearSelection()
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
    </div>
  )
}
