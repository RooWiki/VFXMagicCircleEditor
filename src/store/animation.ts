import { create } from 'zustand'
import type { LayerAnimationConfig } from '../types/animation'
import type { Transform } from '../types/layer'

// ─── Pure computation ─────────────────────────────────────────────────────────

export interface AnimatedTransform {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export function computeAnimatedTransform(
  base: Transform,
  config: LayerAnimationConfig,
  elapsedMs: number
): AnimatedTransform {
  const elapsedSeconds = elapsedMs / 1000
  const rotationOffset = config.rotationSpeed * elapsedSeconds
  const pulseScale =
    1 + Math.sin(2 * Math.PI * config.pulseSpeed * elapsedSeconds) * config.pulseAmplitude
  return {
    x: base.x,
    y: base.y,
    rotation: base.rotation + rotationOffset,
    scaleX: base.scaleX * pulseScale,
    scaleY: base.scaleY * pulseScale,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LayerAnimationConfig = {
  rotationSpeed: 0,
  pulseSpeed: 0,
  pulseAmplitude: 0,
}

interface AnimationState {
  isPlaying: boolean
  elapsedMs: number
  configs: Record<string, LayerAnimationConfig>
}

interface AnimationActions {
  play: () => void
  pause: () => void
  reset: () => void
  tick: (deltaMs: number) => void
  setLayerConfig: (layerId: string, patch: Partial<LayerAnimationConfig>) => void
  removeLayerConfig: (layerId: string) => void
  clearConfigs: () => void
}

export type AnimationStore = AnimationState & AnimationActions

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  isPlaying: false,
  elapsedMs: 0,
  configs: {},

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  reset: () => set({ isPlaying: false, elapsedMs: 0 }),

  tick: (deltaMs) => {
    if (!get().isPlaying) return
    set((state) => ({ elapsedMs: state.elapsedMs + deltaMs }))
  },

  setLayerConfig: (layerId, patch) =>
    set((state) => ({
      configs: {
        ...state.configs,
        [layerId]: { ...(state.configs[layerId] ?? DEFAULT_CONFIG), ...patch },
      },
    })),

  removeLayerConfig: (layerId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [layerId]: _removed, ...rest } = state.configs
      return { configs: rest }
    }),

  clearConfigs: () => set({ configs: {}, isPlaying: false, elapsedMs: 0 }),
}))
