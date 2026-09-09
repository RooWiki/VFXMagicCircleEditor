import { create } from 'zustand'
import type { Layer, Transform, RingDecoration, RadialPattern } from '../types/layer'
import type { CanvasConfig, ProjectFile, ProjectMeta } from '../types/project'
import { findLayer, mapLayer, cloneLayer, withinLayerBudget } from '../utils/layerTree'
import { LayerSchema } from '../schema/project'
import { createGroupLayer, createDefaultProject } from '../utils/factories'

// Explicit whitelists — compile-time guarantee that ring updates cannot
// carry radial-lines-only fields and vice versa.
export interface RingArtworkPatch extends RingDecoration {
  radius?: number
  strokeWidth?: number
  color?: string
  opacity?: number
}

export interface RadialLinesArtworkPatch extends RadialPattern {
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
  updateLayer: (id: string, patch: Record<string, unknown>) => void
  groupLayers: (ids: string[]) => string | undefined
  addGroupChild: (groupId: string, layer: Layer) => void
  removeGroupChild: (groupId: string, childId: string) => void
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
  centerLayer: (id: string) => void
}

export type ProjectStore = ProjectState & ProjectActions

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: createDefaultProject(),

  updateLayer: (id, patch) =>
    set((state) => {
      const layers = mapLayer(state.project.layers, id, (layer) => {
        const result = LayerSchema.safeParse({ ...layer, ...patch, id: layer.id, type: layer.type })
        if (!result.success) return layer
        if (result.data.type === 'shape' && result.data.innerRadius > result.data.radius)
          return layer
        return result.data
      })
      return withinLayerBudget(layers) ? { project: { ...state.project, layers } } : state
    }),
  groupLayers: (ids) => {
    const current = get().project
    const selected = current.layers.filter((layer) => ids.includes(layer.id))
    if (!selected.length || selected.some((layer) => layer.locked)) return
    const x = selected.reduce((sum, layer) => sum + layer.transform.x, 0) / selected.length
    const y = selected.reduce((sum, layer) => sum + layer.transform.y, 0) / selected.length
    const group = createGroupLayer(
      selected.map((layer) => ({
        ...layer,
        transform: { ...layer.transform, x: layer.transform.x - x, y: layer.transform.y - y },
      }))
    )
    group.transform.x = x
    group.transform.y = y
    const last = current.layers.findLastIndex((layer) => ids.includes(layer.id))
    const layers = current.layers.flatMap((layer, index) =>
      index === last ? [group] : ids.includes(layer.id) ? [] : [layer]
    )
    if (!withinLayerBudget(layers)) return
    set({ project: { ...current, layers } })
    return group.id
  },
  addGroupChild: (groupId, layer) =>
    set((state) => {
      const layers = mapLayer(state.project.layers, groupId, (parent) =>
        parent.type === 'group' ? { ...parent, children: [...parent.children, layer] } : parent
      )
      return withinLayerBudget(layers) ? { project: { ...state.project, layers } } : state
    }),
  removeGroupChild: (groupId, childId) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: mapLayer(state.project.layers, groupId, (parent) =>
          parent.type === 'group'
            ? { ...parent, children: parent.children.filter((child) => child.id !== childId) }
            : parent
        ),
      },
    })),
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
      const layer = findLayer(state.project.layers, id)
      if (layer === undefined || layer.type !== 'ring' || layer.locked) {
        return state
      }
      return {
        project: {
          ...state.project,
          layers: mapLayer(state.project.layers, id, (l) => ({ ...l, ...patch })),
        },
      }
    }),

  updateRadialLinesLayer: (id, patch) =>
    set((state) => {
      const layer = findLayer(state.project.layers, id)
      if (layer === undefined || layer.type !== 'radial-lines' || layer.locked) return state
      // Enforce: innerRadius < outerRadius after the patch is applied
      const newInner = patch.innerRadius ?? layer.innerRadius
      const newOuter = patch.outerRadius ?? layer.outerRadius
      if (newInner >= newOuter) return state
      return {
        project: {
          ...state.project,
          layers: mapLayer(state.project.layers, id, (l) => ({ ...l, ...patch })),
        },
      }
    }),

  updateLayerTransform: (id, patch) =>
    set((state) => {
      const layer = findLayer(state.project.layers, id)
      if (layer === undefined || layer.locked) return state
      return {
        project: {
          ...state.project,
          layers: mapLayer(state.project.layers, id, (l) => ({
            ...l,
            transform: { ...l.transform, ...patch },
          })),
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
        ...cloneLayer(original),
        name: `Copy of ${original.name}`,
        transform: { ...original.transform },
      }
      const layers = [
        ...state.project.layers.slice(0, index + 1),
        duplicate,
        ...state.project.layers.slice(index + 1),
      ]
      return withinLayerBudget(layers) ? { project: { ...state.project, layers } } : state
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

  centerLayer: (id) =>
    set((state) => {
      const layer = findLayer(state.project.layers, id)
      if (!layer || layer.locked) return state
      return {
        project: {
          ...state.project,
          layers: state.project.layers.map((l) =>
            l.id === id ? { ...l, transform: { ...l.transform, x: 0, y: 0 } } : l
          ),
        },
      }
    }),
}))
