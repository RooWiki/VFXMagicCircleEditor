import { describe, expect, it } from 'vitest'
import { thornPath, thornHeight } from './thornGeometry'
import { createRingLayer, createRadialLinesLayer, createDefaultProject } from './factories'
import { artworkRadius } from './layerTree'
import { parseProjectFileStrict } from '../schema/project'

const ring = { ...createRingLayer(), lineTexture: 'thorns' as const, textureSeed: 42 }
describe('thorn strokes', () => {
  it('is deterministic, varies with seed and preserves saved settings', () => {
    expect(thornPath(ring)).toBe(thornPath({ ...ring }))
    expect(thornPath(ring)).not.toBe(thornPath({ ...ring, textureSeed: 99 }))
    const project = { ...createDefaultProject(), layers: [ring] }
    const loaded = parseProjectFileStrict(JSON.parse(JSON.stringify(project)))
    expect(loaded.ok && loaded.project.layers[0]).toEqual(ring)
  })
  it('reserves export bounds for spikes and disables them at zero strength', () => {
    expect(artworkRadius(ring)).toBe(
      artworkRadius({ ...ring, lineTexture: 'solid' }) + thornHeight(ring)
    )
    expect(thornPath({ ...ring, textureAmount: 0 })).toBe('')
    expect(thornPath({ ...ring, lineTexture: 'solid' })).toBe('')
  })
  it.each(['simple', 'concentric', 'divided', 'arc'] as const)(
    'supports %s rings with finite coordinates',
    (style) => {
      const path = thornPath({ ...ring, style, sweepAngle: 90 })
      expect(path).toContain('M ')
      expect(path).not.toMatch(/NaN|Infinity/)
    }
  )
  it('bounds geometry cost on dense tilted radial strokes', () => {
    const layer = {
      ...createRadialLinesLayer(),
      lineTexture: 'thorns' as const,
      count: 360,
      twistAngle: 45,
      textureScale: 1,
    }
    const path = thornPath(layer)
    expect(path.match(/M /g)!.length).toBeLessThanOrEqual(1800)
    expect(path).not.toMatch(/NaN|Infinity/)
  })
})
