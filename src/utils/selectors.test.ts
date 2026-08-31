import { describe, expect, it } from 'vitest'
import type { Layer, RadialLinesLayer, RingLayer } from '../types/layer'
import { getLayerById, isRadialLinesLayer, isRingLayer } from './selectors'

const ringLayer: RingLayer = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  type: 'ring',
  name: 'Test Ring',
  visible: true,
  locked: false,
  opacity: 1,
  transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
  radius: 300,
  strokeWidth: 4,
  color: '#ffffff',
}

const radialLinesLayer: RadialLinesLayer = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  type: 'radial-lines',
  name: 'Test Radial Lines',
  visible: true,
  locked: false,
  opacity: 1,
  transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
  count: 8,
  innerRadius: 200,
  outerRadius: 350,
  startAngle: 0,
  strokeWidth: 2,
  color: '#ffffff',
}

const layers: Layer[] = [ringLayer, radialLinesLayer]

describe('isRingLayer', () => {
  it('returns true for a ring layer', () => {
    expect(isRingLayer(ringLayer)).toBe(true)
  })

  it('returns false for a radial-lines layer', () => {
    expect(isRingLayer(radialLinesLayer)).toBe(false)
  })

  it('narrows the type to RingLayer', () => {
    if (isRingLayer(ringLayer)) {
      expect(ringLayer.radius).toBeDefined()
    }
  })
})

describe('isRadialLinesLayer', () => {
  it('returns true for a radial-lines layer', () => {
    expect(isRadialLinesLayer(radialLinesLayer)).toBe(true)
  })

  it('returns false for a ring layer', () => {
    expect(isRadialLinesLayer(ringLayer)).toBe(false)
  })

  it('narrows the type to RadialLinesLayer', () => {
    if (isRadialLinesLayer(radialLinesLayer)) {
      expect(radialLinesLayer.count).toBeDefined()
    }
  })
})

describe('getLayerById', () => {
  it('returns the layer with the matching ID', () => {
    expect(getLayerById(layers, ringLayer.id)).toBe(ringLayer)
  })

  it('returns the radial-lines layer by ID', () => {
    expect(getLayerById(layers, radialLinesLayer.id)).toBe(radialLinesLayer)
  })

  it('returns undefined for a nonexistent ID', () => {
    expect(getLayerById(layers, 'does-not-exist')).toBeUndefined()
  })

  it('returns undefined for an empty layers array', () => {
    expect(getLayerById([], ringLayer.id)).toBeUndefined()
  })

  it('does not mutate the layers array', () => {
    const copy = [...layers]
    getLayerById(layers, ringLayer.id)
    expect(layers).toEqual(copy)
  })
})
