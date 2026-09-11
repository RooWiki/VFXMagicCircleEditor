import { describe, expect, it } from 'vitest'
import { createDefaultProject, createRingLayer } from './factories'
import { buildLayerContent } from './artwork'
import { parseProjectFileStrict, LayerSchema } from '../schema/project'

describe('line texture persistence', () => {
  it.each([
    'grain',
    'worn',
    'fibers',
    'hatching',
    'crosshatch',
    'dots',
    'scales',
    'cracks',
  ] as const)('preserves %s and its settings', (lineTexture) => {
    const layer = {
      ...createRingLayer(),
      lineTexture,
      textureAmount: 82,
      textureScale: 12,
      textureSeed: 42,
    }
    const project = { ...createDefaultProject(), layers: [layer] }
    const parsed = parseProjectFileStrict(JSON.parse(JSON.stringify(project)))
    expect(parsed.ok && parsed.project.layers[0]).toEqual(layer)
    expect(buildLayerContent(layer, 'test')).toContain('test-texture')
  })
  it('keeps old projects and zero-strength artwork unchanged', () => {
    const ring = createRingLayer()
    const original = buildLayerContent(ring, 'test')
    expect(buildLayerContent({ ...ring, lineTexture: 'solid' }, 'test')).toBe(original)
    expect(buildLayerContent({ ...ring, lineTexture: 'worn', textureAmount: 0 }, 'test')).toBe(
      original
    )
  })
  it.each([
    { textureScale: 0 },
    { textureAmount: 101 },
    { textureSeed: 0.5 },
    { lineTexture: 'unknown' },
  ])('rejects invalid texture settings %j', (patch) => {
    expect(LayerSchema.safeParse({ ...createRingLayer(), ...patch }).success).toBe(false)
  })
})
