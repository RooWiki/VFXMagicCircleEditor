import type { Layer, RadialLinesLayer, RingLayer } from '../types/layer'
import { prngUuid, seededRng } from './prng'

export type Complexity = 'low' | 'medium' | 'high'

export interface GeneratorParams {
  ringCount: number
  ringSpacingMin: number
  ringSpacingMax: number
  ringThicknessMin: number
  ringThicknessMax: number
  radialGroupCount: number
  radialLineCountMin: number
  radialLineCountMax: number
  colorPalette: string[]
  complexity: Complexity
}

export const DEFAULT_PARAMS: GeneratorParams = {
  ringCount: 3,
  ringSpacingMin: 40,
  ringSpacingMax: 80,
  ringThicknessMin: 2,
  ringThicknessMax: 8,
  radialGroupCount: 1,
  radialLineCountMin: 6,
  radialLineCountMax: 12,
  colorPalette: ['#ffffff', '#c084fc', '#818cf8'],
  complexity: 'medium',
}

// Always consumes exactly one rng() call — keeps sequence length stable
function rngRange(rng: () => number, min: number, max: number): number {
  const r = rng()
  return min < max ? min + r * (max - min) : min
}

function rngInt(rng: () => number, min: number, max: number): number {
  const r = rng()
  return min < max ? Math.floor(min + r * (max - min + 1)) : min
}

function rngPick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function generateCircle(params: GeneratorParams, seed: string): Layer[] {
  const rng = seededRng(seed)
  const layers: Layer[] = []

  const palette = params.colorPalette.length > 0 ? params.colorPalette : ['#ffffff']

  const opacityVariance =
    params.complexity === 'high' ? 0.4 : params.complexity === 'medium' ? 0.2 : 0
  const positionJitter = params.complexity === 'high' ? 30 : params.complexity === 'medium' ? 10 : 0

  const thicknessMin = params.ringThicknessMin
  const thicknessMax = Math.max(params.ringThicknessMin, params.ringThicknessMax)
  const spacingMin = params.ringSpacingMin
  const spacingMax = Math.max(params.ringSpacingMin, params.ringSpacingMax)
  const lineCountMin = params.radialLineCountMin
  const lineCountMax = Math.max(params.radialLineCountMin, params.radialLineCountMax)

  // First ring radius: 80–120 logical units (1 rng call)
  let currentRadius = 80 + rng() * 40

  for (let i = 0; i < params.ringCount; i++) {
    const strokeWidth = Math.max(1, rngRange(rng, thicknessMin, thicknessMax))
    const color = rngPick(rng, palette)
    const opacity = opacityVariance > 0 ? Math.max(0.4, 1 - rng() * opacityVariance) : 1
    const jitterX = positionJitter > 0 ? (rng() - 0.5) * positionJitter * 2 : 0
    const jitterY = positionJitter > 0 ? (rng() - 0.5) * positionJitter * 2 : 0

    const ring: RingLayer = {
      id: prngUuid(rng),
      type: 'ring',
      name: `Ring ${i + 1}`,
      visible: true,
      locked: false,
      opacity,
      radius: Math.min(Math.max(currentRadius, 10), 440),
      strokeWidth,
      color,
      transform: { x: jitterX, y: jitterY, rotation: 0, scaleX: 1, scaleY: 1 },
    }
    layers.push(ring)

    currentRadius += rngRange(rng, spacingMin, spacingMax)
  }

  for (let i = 0; i < params.radialGroupCount; i++) {
    const count = Math.max(1, rngInt(rng, lineCountMin, lineCountMax))
    const innerRadius = rngRange(rng, 40, 200)
    const span = rngRange(rng, 60, 200)
    const outerRadius = innerRadius + span
    const color = rngPick(rng, palette)
    const strokeWidth = Math.max(1, rngRange(rng, thicknessMin, thicknessMax))
    const startAngle = rng() * 360
    const opacity = opacityVariance > 0 ? Math.max(0.4, 1 - rng() * opacityVariance) : 1

    const radial: RadialLinesLayer = {
      id: prngUuid(rng),
      type: 'radial-lines',
      name: `Radial Lines ${i + 1}`,
      visible: true,
      locked: false,
      opacity,
      count,
      innerRadius,
      outerRadius,
      startAngle,
      strokeWidth,
      color,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    }
    layers.push(radial)
  }

  return layers
}
