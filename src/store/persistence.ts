import { create } from 'zustand'
import type { ProjectFile } from '../types/project'

interface PersistenceState {
  /** The project object reference at the last save/download/open/new. */
  baselineProject: ProjectFile | null
  /** JSON.stringify of baselineProject — used for the first-mutation dirty check. */
  baselineSerialized: string
  /** True when the live project differs from the saved baseline. */
  isDirty: boolean
}

interface PersistenceActions {
  /**
   * Record a new baseline (after download/open/new/startup).
   * Stores the project reference and serialization, and resets isDirty to false.
   */
  setBaseline: (project: ProjectFile) => void
  /** Mark the project as dirty (called on first mutation since last baseline). */
  markDirty: () => void
  /** Directly set the dirty flag (used to clear it after undo returns to baseline). */
  setDirtyFlag: (dirty: boolean) => void
}

export type PersistenceStore = PersistenceState & PersistenceActions

export const usePersistenceStore = create<PersistenceStore>((set) => ({
  baselineProject: null,
  baselineSerialized: '',
  isDirty: false,

  setBaseline: (project) => {
    set({
      baselineProject: project,
      baselineSerialized: JSON.stringify(project),
      isDirty: false,
    })
  },

  markDirty: () => {
    set({ isDirty: true })
  },

  setDirtyFlag: (dirty) => {
    set({ isDirty: dirty })
  },
}))
