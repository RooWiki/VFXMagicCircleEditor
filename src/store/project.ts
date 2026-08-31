import { create } from 'zustand'
import type { Layer, Transform } from '../types/layer'
import type { CanvasConfig, ProjectFile, ProjectMeta } from '../types/project'
import { createDefaultProject } from '../utils/factories'
import { generateId } from '../utils/id'

// Explicit whitelists — compile-time guarantee that ring updates cannot
// carry radial-lines-only fields and vice versa.
export interface RingArtworkPatch {
  radius?: number
  strokeWidth?: number
  color?: string
  opacity?: number
}

export interface RadialLinesArtworkPatch {
  count?: number
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  strokeWidth?: number
  color?: string
  opacity?: number
}

interface ProjectState {
  project: ProjectFile
}

interface ProjectActions {
  setProject: (project: ProjectFile) => void
  resetProject: () => void
  setProjectMeta: (patch: Partial<ProjectMeta>) => void
  setCanvasConfig: (patch: Partial<CanvasConfig>) => void
  addLayer: (layer: Layer) => void
  updateRingLayer: (id: string, patch: RingArtworkPatch) => void
  updateRadialLinesLayer: (id: string, patch: RadialLinesArtworkPatch) => void
  updateLayerTransform: (id: string, patch: Partial<Transform>) => void
  renameLayer: (id: string, name: string) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
}

export type ProjectStore = ProjectState & ProjectActions

export const useProjectStore = create<ProjectStore>((set) => ({
  project: createDefaultProject(),

  setProject: (project) => set({ project }),

  resetProject: () => set({ project: createDefaultProject() }),

  setProjectMeta: (patch) =>
    set((state) => ({
      project: { ...state.project, meta: { ...state.project.meta, ...patch } },
    })),

  setCanvasConfig: (patch) =>
    set((state) => ({
      project: {
        ...state.project,
        canvas: { ...state.project.canvas, ...patch },
      },
    })),

  addLayer: (layer) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: [...state.project.layers, layer],
      },
    })),

  updateRingLayer: (id, patch) =>
    set((state) => {
      const layer = state.project.layers.find((l) => l.id === id)
      if (layer === undefined || layer.type !== 'ring' || layer.locked) {
        return state
      }
      return {
        project: {
          ...state.project,
          layers: state.project.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        },
      }
    }),

  updateRadialLinesLayer: (id, patch) =>
    set((state) => {
      const layer = state.project.layers.find((l) => l.id === id)
      if (layer === undefined || layer.type !== 'radial-lines' || layer.locked) {
        return state
      }
      return {
        project: {
          ...state.project,
          layers: state.project.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        },
      }
    }),

  updateLayerTransform: (id, patch) =>
    set((state) => {
      const layer = state.project.layers.find((l) => l.id === id)
      if (layer === undefined || layer.locked) return state
      return {
        project: {
          ...state.project,
          layers: state.project.layers.map((l) =>
            l.id === id ? { ...l, transform: { ...l.transform, ...patch } } : l
          ),
        },
      }
    }),

  renameLayer: (id, name) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((l) => (l.id === id ? { ...l, name } : l)),
      },
    })),

  removeLayer: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.filter((l) => l.id !== id),
      },
    })),

  duplicateLayer: (id) =>
    set((state) => {
      const index = state.project.layers.findIndex((l) => l.id === id)
      if (index === -1) return state
      const original = state.project.layers[index]
      const duplicate: Layer = {
        ...original,
        id: generateId(),
        name: `Copy of ${original.name}`,
        transform: { ...original.transform },
      }
      const layers = [
        ...state.project.layers.slice(0, index + 1),
        duplicate,
        ...state.project.layers.slice(index + 1),
      ]
      return { project: { ...state.project, layers } }
    }),

  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      const { layers } = state.project
      if (
        fromIndex < 0 ||
        fromIndex >= layers.length ||
        toIndex < 0 ||
        toIndex >= layers.length ||
        fromIndex === toIndex
      ) {
        return state
      }
      const reordered = [...layers]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)
      return { project: { ...state.project, layers: reordered } }
    }),

  toggleLayerVisibility: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
      },
    })),

  toggleLayerLock: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
      },
    })),
}))
