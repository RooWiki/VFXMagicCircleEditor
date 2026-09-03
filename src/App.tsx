import { useEffect } from 'react'
import {
  resetDirtyState,
  startAutosaveSubscription,
  tryRestoreFromAutosave,
} from './persistence/autosave'
import { useAnimationLoop } from './hooks/useAnimationLoop'
import { useEditorStore } from './store/editor'
import { useHistoryStore } from './store/history'
import { loadPreferences, savePreferences } from './store/preferences'
import { useProjectStore } from './store/project'
import ConfirmDialog from './editor/ConfirmDialog'
import EditorShell from './editor/EditorShell'
import ExportModal from './editor/ExportModal'
import GeneratorModal from './editor/GeneratorModal'
import NotificationBar from './editor/NotificationBar'
import TemplateGallery from './editor/TemplateGallery'

export default function App() {
  useAnimationLoop()

  useEffect(() => {
    // 1. Restore from autosave BEFORE subscribing so restore itself doesn't mark dirty
    const restored = tryRestoreFromAutosave()
    if (restored) {
      useProjectStore.getState().setProject(restored)
    }

    // 2. Initialize history with the current project (restored or default)
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    // 3. Start autosave subscription (after restore to avoid false dirty flag)
    const unsubProject = startAutosaveSubscription()

    // 4. Apply saved preferences to editor state
    const prefs = loadPreferences()
    if (prefs.previewBackground) {
      useEditorStore.getState().setPreviewBackground(prefs.previewBackground)
    }

    // 5. Persist preference changes
    const unsubEditor = useEditorStore.subscribe((state, prevState) => {
      if (state.previewBackground !== prevState.previewBackground) {
        savePreferences({ previewBackground: state.previewBackground })
      }
    })

    // Freshly initialized (restored or default) — treat as clean baseline
    resetDirtyState()

    return () => {
      unsubProject()
      unsubEditor()
    }
  }, [])

  return (
    <>
      <EditorShell />
      <ConfirmDialog />
      <ExportModal />
      <GeneratorModal />
      <TemplateGallery />
      <NotificationBar />
    </>
  )
}
