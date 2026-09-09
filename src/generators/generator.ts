import { addMagicComposition } from './composition'
import { layerRadius } from '../utils/layerTree'
import type { Layer, RadialLinesLayer, RingLayer } from '../types/layer'
import { prngUuid, seededRng } from './prng'

export type DesignStyle = 'classic' | 'arcane' | 'celestial' | 'mechanical'

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
  designStyle?: DesignStyle
  symmetry?: number
  inscriptions?: boolean
  emblems?: boolean
  complexity: Complexity
}

export const DEFAULT_PARAMS: GeneratorParams = {
  designStyle: 'arcane',
  symmetry: 8,
  inscriptions: true,
  emblems: true,
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

  if (params.designStyle && params.designStyle !== 'classic') {
    decorateComposition(layers, params, seed)
    addMagicComposition(layers, params, seed)
  }
  return layers
}

/** A second seeded stream decorates the composition without destabilizing its base geometry. */
function decorateComposition(layers: Layer[], params: GeneratorParams, seed: string): void {
  const rng = seededRng(`${seed}:ornament`)
  const symmetry = Math.max(3, Math.min(24, Math.round(params.symmetry ?? 8)))
  const detail = params.complexity === 'high' ? 3 : params.complexity === 'medium' ? 2 : 1
  const rings = layers.filter((layer): layer is RingLayer => layer.type === 'ring')
  // Re-space the original requested gaps proportionally, avoiding stacked rings at the old radius cap.
  let radius = 90
  const radii = rings.map(() => {
    const value = radius
    radius += rngRange(rng, Math.max(5, params.ringSpacingMin), Math.max(5, params.ringSpacingMax))
    return value
  })
  const fit = Math.min(1, 420 / (radii.at(-1) ?? 420))
  rings.forEach((ring, i) => {
    ring.radius = radii[i] * fit
    ring.transform.x = 0
    ring.transform.y = 0
    const gap = i === 0 ? ring.radius : ring.radius - rings[i - 1].radius
    ring.strokeWidth = Math.min(ring.strokeWidth, gap * 0.15)
    ring.style =
      params.designStyle === 'mechanical'
        ? i % 2 === 0
          ? 'divided'
          : 'concentric'
        : params.designStyle === 'celestial'
          ? i % 2 === 0
            ? 'arc'
            : 'concentric'
          : i % 3 === 0
            ? 'concentric'
            : i % 3 === 1
              ? 'divided'
              : 'simple'
    ring.ringCount = detail + 1
    ring.spacing = Math.min(8, gap / (detail + 3))
    ring.bandWidth = Math.min(22, gap * 0.4)
    ring.divisions = symmetry * (detail + 2)
    ring.dividerWidth = Math.max(0.5, ring.strokeWidth * 0.6)
    ring.startAngle = rngInt(rng, 0, symmetry - 1) * (360 / symmetry)
    ring.sweepAngle = 240 + rngInt(rng, 0, 2) * 30
  })
  const radials = layers.filter((layer): layer is RadialLinesLayer => layer.type === 'radial-lines')
  radials.forEach((radial, i) => {
    const outer = rings.length ? rings[i % rings.length].radius : 220 + i * 25
    const band = i % Math.max(1, rings.length)
    radial.outerRadius = outer
    radial.innerRadius = rings.length && band > 0 ? rings[band - 1].radius : outer * 0.45
    const min = Math.max(1, Math.round(params.radialLineCountMin))
    const max = Math.max(min, Math.round(params.radialLineCountMax))
    const multiples = Array.from(
      { length: Math.max(0, Math.floor(max / symmetry) - Math.ceil(min / symmetry) + 1) },
      (_, n) => (Math.ceil(min / symmetry) + n) * symmetry
    )
    radial.count = multiples.length ? rngPick(rng, multiples) : rngInt(rng, min, max)
    radial.startAngle = i % 2 === 0 ? 0 : 180 / symmetry
    radial.strokeWidth = Math.min(radial.strokeWidth, (outer - radial.innerRadius) * 0.12)
    radial.lineCap = params.designStyle === 'mechanical' ? 'butt' : 'round'
    radial.twistAngle =
      params.designStyle === 'arcane' ? ((i % 2 === 0 ? 1 : -1) * 360) / symmetry : 0
    radial.majorEvery = params.designStyle === 'mechanical' ? 4 : 1
    radial.minorLength = 0.4
    radial.sweepAngle = params.designStyle === 'celestial' ? 240 : 360
  })
}

/** Fit artwork to the current canvas, with a margin, without changing its proportions. */
export function fitGeneratedLayers<T extends Layer>(
  layers: T[],
  width: number,
  height: number
): T[] {
  const extent = Math.max(
    1,
    ...layers.map((layer) => {
      const radius = layerRadius(layer)
      return (
        Math.hypot(layer.transform.x, layer.transform.y) +
        radius +
        ('strokeWidth' in layer ? layer.strokeWidth : 0)
      )
    })
  )
  const scale = (Math.min(width, height) * 0.44) / extent
  return layers.map((layer) => ({
    ...layer,
    transform: {
      ...layer.transform,
      x: layer.transform.x * scale,
      y: layer.transform.y * scale,
      scaleX: scale,
      scaleY: scale,
    },
  }))
}
