import { useEffect, useRef } from 'react'
import { parseProjectFile } from './schema/project'
import { useEditorStore } from './store/editor'
import { useHistoryStore } from './store/history'
import { usePersistenceStore } from './store/persistence'
import { useProjectStore } from './store/project'
import {
  loadPreferences,
  loadRawAutosave,
  saveAutosave,
  savePreferences,
} from './utils/persistence'
import EditorShell from './editor/EditorShell'

const AUTOSAVE_DEBOUNCE_MS = 2000

export default function App() {
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // ── Load persisted preferences first ────────────────────────────────────
    const prefs = loadPreferences()
    if (prefs) {
      useEditorStore.getState().setGridVisible(prefs.gridVisible)
      useEditorStore.getState().setGuidesVisible(prefs.guidesVisible)
      useEditorStore.getState().setPreviewBackground(prefs.previewBackground)
    }

    // ── Auto-restore from localStorage ──────────────────────────────────────
    let initialProject = useProjectStore.getState().project
    const raw = loadRawAutosave()
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        const result = parseProjectFile(parsed)
        if (result.ok) {
          useProjectStore.getState().setProject(result.project)
          initialProject = result.project
        }
      } catch {
        // Corrupt data — ignore and start fresh
      }
    }

    // ── Init history and establish the baseline ──────────────────────────────
    useHistoryStore.getState().initHistory(initialProject)
    usePersistenceStore.getState().setBaseline(initialProject)

    // ── Autosave subscription (debounced 2s) ─────────────────────────────────
    // The subscription callback itself does NO serialization — it only resets a
    // timer. The actual JSON.stringify runs once, after 2 seconds of idle, inside
    // the timer callback using getState() so no project snapshot is held in the
    // closure while the user is actively editing.
    const unsubProject = useProjectStore.subscribe(() => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current)
      }
      autosaveTimerRef.current = setTimeout(() => {
        saveAutosave(useProjectStore.getState().project)
        autosaveTimerRef.current = null
      }, AUTOSAVE_DEBOUNCE_MS)
    })

    // ── Dirty-state subscription ─────────────────────────────────────────────
    // Uses object-reference comparison against the baseline for zero-cost undo
    // recovery, and serializes only once (on the first mutation since baseline)
    // to confirm actual content change. After the first mutation, all subsequent
    // mutations during a drag leave isDirty=true with no serialization work.
    //
    // cachedIsDirty and cachedBaseline mirror persistence store state in closure
    // locals so the hot path (isDirty=true, not at baseline) can short-circuit
    // without calling getState() on every project mutation.
    let cachedIsDirty = usePersistenceStore.getState().isDirty
    let cachedBaseline = usePersistenceStore.getState().baselineProject

    const unsubPersistence = usePersistenceStore.subscribe((s) => {
      cachedIsDirty = s.isDirty
      cachedBaseline = s.baselineProject
    })

    const unsubDirty = useProjectStore.subscribe((state, prevState) => {
      if (state.project === prevState.project) return

      // Hot path: already dirty and not returning to baseline — nothing to do.
      // Two cheap reference comparisons, no getState() call.
      if (cachedIsDirty && state.project !== cachedBaseline) return

      const persistence = usePersistenceStore.getState()

      if (state.project === persistence.baselineProject) {
        // Undo returned the exact baseline snapshot — clean.
        if (persistence.isDirty) persistence.setDirtyFlag(false)
        return
      }

      if (!persistence.isDirty) {
        // First mutation since last baseline: serialize once to confirm it's
        // truly a content change (not a benign same-content reset).
        if (JSON.stringify(state.project) !== persistence.baselineSerialized) {
          persistence.markDirty()
        }
      }
    })

    // ── Preferences subscription ─────────────────────────────────────────────
    // Only writes localStorage when preferences-relevant fields actually change.
    // Selection, active tool, and other editor state do not trigger a write.
    let prevGrid = useEditorStore.getState().gridVisible
    let prevGuides = useEditorStore.getState().guidesVisible
    let prevBg = useEditorStore.getState().previewBackground

    const unsubEditor = useEditorStore.subscribe((state) => {
      if (
        state.gridVisible === prevGrid &&
        state.guidesVisible === prevGuides &&
        state.previewBackground === prevBg
      ) {
        return
      }
      prevGrid = state.gridVisible
      prevGuides = state.guidesVisible
      prevBg = state.previewBackground
      savePreferences({
        gridVisible: state.gridVisible,
        guidesVisible: state.guidesVisible,
        previewBackground: state.previewBackground,
      })
    })

    return () => {
      unsubProject()
      unsubPersistence()
      unsubDirty()
      unsubEditor()
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  return <EditorShell />
}
