import { create } from 'zustand'
import { MAX_HISTORY_DEPTH } from '../constants'
import type { ProjectFile } from '../types/project'
import { useEditorStore } from './editor'
import { useProjectStore } from './project'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryState {
  snapshots: readonly ProjectFile[]
  pointer: number
  /** Project state captured when an inspector field gains focus. */
  pendingEditSnapshot: ProjectFile | null
}

interface HistoryActions {
  /** Call once on app start with the initial project state. */
  initHistory: (project: ProjectFile) => void
  /** Push a post-action snapshot of the current project state. */
  pushSnapshot: (project: ProjectFile) => void
  undo: () => void
  redo: () => void
  /** Call when an inspector field gains focus to capture the pre-edit state. */
  beginInspectorEdit: () => void
  /** Call when an inspector field blurs — commits one history step if state changed. */
  commitInspectorEdit: () => void
}

export type HistoryStore = HistoryState & HistoryActions

// ─── Selector helpers (stable function references for subscriptions) ───────────

export const selectCanUndo = (s: HistoryState): boolean => s.pointer > 0
export const selectCanRedo = (s: HistoryState): boolean => s.pointer < s.snapshots.length - 1

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  snapshots: [],
  pointer: -1,
  pendingEditSnapshot: null,

  initHistory: (project) => {
    set({ snapshots: [project], pointer: 0, pendingEditSnapshot: null })
  },

  pushSnapshot: (project) => {
    const { snapshots, pointer } = get()
    // Discard any redo branch above the current pointer
    const base = snapshots.slice(0, pointer + 1) as ProjectFile[]
    const next = [...base, project]
    // Enforce depth cap — keep the newest MAX_HISTORY_DEPTH entries
    const trimmed =
      next.length > MAX_HISTORY_DEPTH ? next.slice(next.length - MAX_HISTORY_DEPTH) : next
    set({ snapshots: trimmed, pointer: trimmed.length - 1 })
  },

  undo: () => {
    const { snapshots, pointer } = get()
    if (pointer <= 0) return
    const newPointer = pointer - 1
    const snapshot = snapshots[newPointer]
    set({ pointer: newPointer, pendingEditSnapshot: null })
    useProjectStore.getState().setProject(snapshot)
    useEditorStore.getState().pruneSelection(snapshot.layers.map((l) => l.id))
  },

  redo: () => {
    const { snapshots, pointer } = get()
    if (pointer >= snapshots.length - 1) return
    const newPointer = pointer + 1
    const snapshot = snapshots[newPointer]
    set({ pointer: newPointer, pendingEditSnapshot: null })
    useProjectStore.getState().setProject(snapshot)
    useEditorStore.getState().pruneSelection(snapshot.layers.map((l) => l.id))
  },

  beginInspectorEdit: () => {
    // Do not overwrite an already-open edit session. In a real browser,
    // React's controlled-input reconciliation can fire onFocus again during
    // a re-render caused by mid-session typing, which would overwrite the
    // pre-edit baseline with the current (post-typing) project, making the
    // commitInspectorEdit comparison always equal → no history entry pushed.
    if (get().pendingEditSnapshot !== null) return
    const project = useProjectStore.getState().project
    set({ pendingEditSnapshot: JSON.parse(JSON.stringify(project)) as ProjectFile })
  },

  commitInspectorEdit: () => {
    const { pendingEditSnapshot } = get()
    if (!pendingEditSnapshot) return
    // Clear first to prevent any re-entrant commit from double-pushing.
    set({ pendingEditSnapshot: null })
    const currentProject = useProjectStore.getState().project
    // Structural comparison (not reference) so a deep-cloned baseline is
    // compared correctly even if it is never reference-equal to the live project.
    if (JSON.stringify(currentProject) !== JSON.stringify(pendingEditSnapshot)) {
      get().pushSnapshot(currentProject)
    }
  },
}))
