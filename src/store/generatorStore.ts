import { create } from 'zustand'
import { DEFAULT_PARAMS, type Complexity, type GeneratorParams } from '../generators/generator'
import { createRandomSeed } from '../generators/prng'

export type LockKey =
  | 'seed'
  | 'ringCount'
  | 'ringSpacing'
  | 'ringThickness'
  | 'radialGroupCount'
  | 'radialLineCount'
  | 'colorPalette'
  | 'complexity'

const DEFAULT_LOCKS: Record<LockKey, boolean> = {
  seed: false,
  ringCount: false,
  ringSpacing: false,
  ringThickness: false,
  radialGroupCount: false,
  radialLineCount: false,
  colorPalette: false,
  complexity: false,
}

// Built-in palettes offered when Regenerate randomizes colors
export const PRESET_PALETTES: string[][] = [
  ['#ffffff', '#c084fc', '#818cf8'],
  ['#f97316', '#fbbf24', '#84cc16'],
  ['#06b6d4', '#3b82f6', '#8b5cf6'],
  ['#f43f5e', '#ec4899', '#a855f7'],
  ['#ffffff', '#94a3b8', '#475569'],
]

interface GeneratorState {
  isOpen: boolean
  seed: string
  params: GeneratorParams
  locks: Record<LockKey, boolean>
}

interface GeneratorActions {
  open: () => void
  close: () => void
  setSeed: (seed: string) => void
  setParams: (patch: Partial<GeneratorParams>) => void
  toggleLock: (key: LockKey) => void
  randomizeUnlocked: () => void
}

export const useGeneratorStore = create<GeneratorState & GeneratorActions>((set, get) => ({
  isOpen: false,
  seed: createRandomSeed(),
  params: { ...DEFAULT_PARAMS },
  locks: { ...DEFAULT_LOCKS },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setSeed: (seed) => set({ seed }),
  setParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
  toggleLock: (key) => set((s) => ({ locks: { ...s.locks, [key]: !s.locks[key] } })),

  randomizeUnlocked: () => {
    const { locks } = get()
    const updates: Partial<GeneratorState> = {}

    if (!locks.seed) {
      updates.seed = crypto.randomUUID()
    }

    const paramPatch: Partial<GeneratorParams> = {}

    if (!locks.ringCount) {
      paramPatch.ringCount = 1 + Math.floor(Math.random() * 7) // 1–7
    }
    if (!locks.ringSpacing) {
      const min = 20 + Math.floor(Math.random() * 40) // 20–59
      paramPatch.ringSpacingMin = min
      paramPatch.ringSpacingMax = min + 20 + Math.floor(Math.random() * 80) // min + 20–99
    }
    if (!locks.ringThickness) {
      const min = 1 + Math.floor(Math.random() * 5) // 1–5
      paramPatch.ringThicknessMin = min
      paramPatch.ringThicknessMax = min + 1 + Math.floor(Math.random() * 14) // min + 1–14
    }
    if (!locks.radialGroupCount) {
      paramPatch.radialGroupCount = Math.floor(Math.random() * 4) // 0–3
    }
    if (!locks.radialLineCount) {
      const min = 3 + Math.floor(Math.random() * 9) // 3–11
      paramPatch.radialLineCountMin = min
      paramPatch.radialLineCountMax = min + 3 + Math.floor(Math.random() * 12) // min + 3–14
    }
    if (!locks.colorPalette) {
      paramPatch.colorPalette = PRESET_PALETTES[Math.floor(Math.random() * PRESET_PALETTES.length)]
    }
    if (!locks.complexity) {
      const complexities: Complexity[] = ['low', 'medium', 'high']
      paramPatch.complexity = complexities[Math.floor(Math.random() * 3)]
    }

    set((s) => ({
      ...updates,
      params: { ...s.params, ...paramPatch },
    }))
  },
}))
