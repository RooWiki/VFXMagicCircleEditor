import { create } from 'zustand'

// No import of the project store — pruneSelection is domain-neutral.
// Callers are responsible for invoking pruneSelection after project mutations
// that remove or replace layers (e.g. removeLayer, resetProject).

export type ActiveTool = 'select' | 'hand'
export type PreviewBackground = 'dark' | 'light' | 'transparent'

interface EditorState {
  selectedLayerIds: string[]
  activeTool: ActiveTool
  gridVisible: boolean
  guidesVisible: boolean
  previewBackground: PreviewBackground
}

interface EditorActions {
  selectLayer: (id: string | null) => void
  setSelection: (ids: readonly string[]) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  clearSelection: () => void
  pruneSelection: (validLayerIds: readonly string[]) => void
  setActiveTool: (tool: ActiveTool) => void
  setGridVisible: (visible: boolean) => void
  setGuidesVisible: (visible: boolean) => void
  setPreviewBackground: (bg: PreviewBackground) => void
}

export type EditorStore = EditorState & EditorActions

export const useEditorStore = create<EditorStore>((set) => ({
  selectedLayerIds: [],
  activeTool: 'select',
  gridVisible: false,
  guidesVisible: false,
  previewBackground: 'dark',

  selectLayer: (id) => set({ selectedLayerIds: id !== null ? [id] : [] }),

  setSelection: (ids) =>
    set({
      selectedLayerIds: [...new Set(ids)],
    }),

  addToSelection: (id) =>
    set((state) => ({
      selectedLayerIds: state.selectedLayerIds.includes(id)
        ? state.selectedLayerIds
        : [...state.selectedLayerIds, id],
    })),

  removeFromSelection: (id) =>
    set((state) => ({
      selectedLayerIds: state.selectedLayerIds.filter((sid) => sid !== id),
    })),

  clearSelection: () => set({ selectedLayerIds: [] }),

  pruneSelection: (validLayerIds) =>
    set((state) => {
      const valid = new Set(validLayerIds)
      const pruned = state.selectedLayerIds.filter((id) => valid.has(id))
      if (pruned.length === state.selectedLayerIds.length) return state
      return { selectedLayerIds: pruned }
    }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setGridVisible: (visible) => set({ gridVisible: visible }),

  setGuidesVisible: (visible) => set({ guidesVisible: visible }),

  setPreviewBackground: (bg) => set({ previewBackground: bg }),
}))
