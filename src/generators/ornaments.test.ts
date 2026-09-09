import { layerRadius } from '../utils/layerTree'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, fitGeneratedLayers, generateCircle } from './generator'
import { LayerSchema } from '../schema/project'

describe('ornamental generation', () => {
  it.each(['arcane', 'celestial', 'mechanical'] as const)(
    '%s is deterministic, centered and valid across seeds',
    (designStyle) => {
      for (let i = 0; i < 30; i++) {
        const params = { ...DEFAULT_PARAMS, designStyle, ringCount: 10, radialGroupCount: 8 }
        const layers = generateCircle(params, String(i))
        expect(layers).toEqual(generateCircle(params, String(i)))
        expect(layers.filter((layer) => layer.type === 'ring')).toHaveLength(10)
        expect(layers.filter((layer) => layer.type === 'radial-lines')).toHaveLength(8)
        expect(layers.some((layer) => layer.type === 'shape')).toBe(true)
        expect(layers.some((layer) => layer.type === 'group')).toBe(true)
        for (const layer of layers) {
          expect(LayerSchema.safeParse(layer).success).toBe(true)
          expect(layer.transform.x).toBe(0)
          expect(layer.transform.y).toBe(0)
          if (layer.type === 'radial-lines')
            expect(layer.innerRadius).toBeLessThan(layer.outerRadius)
        }
        const radii = layers.filter((l) => l.type === 'ring').map((l) => l.radius)
        expect(new Set(radii).size).toBe(10)
        expect(radii.at(-1)).toBeLessThanOrEqual(420.00001)
      }
    }
  )
  it('uses symmetry multiples within the requested line count range', () => {
    const layers = generateCircle(
      {
        ...DEFAULT_PARAMS,
        symmetry: 8,
        radialLineCountMin: 10,
        radialLineCountMax: 25,
        radialGroupCount: 8,
      },
      'symmetry'
    )
    for (const layer of layers)
      if (layer.type === 'radial-lines') {
        expect(layer.count % 8).toBe(0)
        expect(layer.count).toBeGreaterThanOrEqual(10)
        expect(layer.count).toBeLessThanOrEqual(25)
      }
  })
  it('honors exact counts even when no symmetry multiple fits', () => {
    const layers = generateCircle(
      { ...DEFAULT_PARAMS, radialLineCountMin: 7, radialLineCountMax: 7 },
      'counts'
    )
    expect(layers.find((l) => l.type === 'radial-lines')).toMatchObject({ count: 7 })
  })
  it('fits wide and small canvases without clipping or mutating the source', () => {
    const layers = generateCircle(DEFAULT_PARAMS, 'fit')
    const before = JSON.stringify(layers)
    const fitted = fitGeneratedLayers(layers, 200, 900)
    for (const layer of fitted) {
      const radius = layerRadius(layer)
      expect(
        (radius + ('strokeWidth' in layer ? layer.strokeWidth : 0)) * layer.transform.scaleX
      ).toBeLessThanOrEqual(88.00001)
    }
    expect(JSON.stringify(layers)).toBe(before)
  })
  it('adds inscriptions and emblems only when requested, with detail controlling richness', () => {
    const simple = generateCircle({ ...DEFAULT_PARAMS, complexity: 'low' }, 'detail')
    const rich = generateCircle({ ...DEFAULT_PARAMS, complexity: 'high' }, 'detail')
    expect(rich.length).toBeGreaterThan(simple.length)
    expect(rich.some((layer) => layer.type === 'circular-text')).toBe(true)
    const plain = generateCircle(
      { ...DEFAULT_PARAMS, inscriptions: false, emblems: false },
      'detail'
    )
    expect(plain.some((layer) => layer.type === 'circular-text' || layer.type === 'group')).toBe(
      false
    )
  })
  it('keeps the classic generator available', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, designStyle: 'classic' }, 'classic')
    expect(layers.every((layer) => !('style' in layer) && !('twistAngle' in layer))).toBe(true)
  })
})
