import { describe, expect, it } from 'vitest'
import { createDefaultProject, createRadialLinesLayer, createRingLayer } from './factories'

describe('createRingLayer', () => {
  it('produces a layer with type ring', () => {
    expect(createRingLayer().type).toBe('ring')
  })

  it('generates a valid UUID id', () => {
    const { id } = createRingLayer()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique IDs on consecutive calls', () => {
    expect(createRingLayer().id).not.toBe(createRingLayer().id)
  })

  it('applies default values when no overrides supplied', () => {
    const layer = createRingLayer()
    expect(layer.name).toBe('Ring')
    expect(layer.visible).toBe(true)
    expect(layer.locked).toBe(false)
    expect(layer.opacity).toBe(1)
    expect(layer.radius).toBe(300)
    expect(layer.strokeWidth).toBe(4)
    expect(layer.color).toBe('#ffffff')
    expect(layer.transform).toEqual({
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    })
  })

  it('applies scalar overrides correctly', () => {
    const layer = createRingLayer({ radius: 100, color: '#ff0000', opacity: 0.5 })
    expect(layer.radius).toBe(100)
    expect(layer.color).toBe('#ff0000')
    expect(layer.opacity).toBe(0.5)
  })

  it('applies transform override correctly', () => {
    const transform = { x: 10, y: 20, rotation: 45, scaleX: 2, scaleY: 2 }
    const layer = createRingLayer({ transform })
    expect(layer.transform).toEqual(transform)
  })

  it('does not share transform reference between two calls', () => {
    const a = createRingLayer()
    const b = createRingLayer()
    expect(a.transform).not.toBe(b.transform)
  })

  it('does not share transform with the overrides object', () => {
    const transform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }
    const layer = createRingLayer({ transform })
    expect(layer.transform).not.toBe(transform)
  })
})

describe('createRadialLinesLayer', () => {
  it('produces a layer with type radial-lines', () => {
    expect(createRadialLinesLayer().type).toBe('radial-lines')
  })

  it('generates a valid UUID id', () => {
    const { id } = createRadialLinesLayer()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique IDs on consecutive calls', () => {
    expect(createRadialLinesLayer().id).not.toBe(createRadialLinesLayer().id)
  })

  it('applies default values when no overrides supplied', () => {
    const layer = createRadialLinesLayer()
    expect(layer.name).toBe('Radial Lines')
    expect(layer.visible).toBe(true)
    expect(layer.locked).toBe(false)
    expect(layer.opacity).toBe(1)
    expect(layer.count).toBe(8)
    expect(layer.innerRadius).toBe(200)
    expect(layer.outerRadius).toBe(350)
    expect(layer.startAngle).toBe(0)
    expect(layer.strokeWidth).toBe(2)
    expect(layer.color).toBe('#ffffff')
  })

  it('applies overrides correctly', () => {
    const layer = createRadialLinesLayer({ count: 12, innerRadius: 100, outerRadius: 200 })
    expect(layer.count).toBe(12)
    expect(layer.innerRadius).toBe(100)
    expect(layer.outerRadius).toBe(200)
  })

  it('does not share transform reference between two calls', () => {
    const a = createRadialLinesLayer()
    const b = createRadialLinesLayer()
    expect(a.transform).not.toBe(b.transform)
  })

  it('ring and radial-lines factories produce independent transform objects', () => {
    const ring = createRingLayer()
    const radial = createRadialLinesLayer()
    expect(ring.transform).not.toBe(radial.transform)
  })
})

describe('createDefaultProject', () => {
  it('creates a valid project structure', () => {
    const project = createDefaultProject()
    expect(project.__magic_circle__).toBe(true)
    expect(project.version).toBe('1.0.0')
    expect(project.canvas.width).toBe(1000)
    expect(project.canvas.height).toBe(1000)
    expect(project.layers).toEqual([])
  })

  it('starts with an empty layers array', () => {
    expect(createDefaultProject().layers).toHaveLength(0)
  })

  it('sets title to Untitled', () => {
    expect(createDefaultProject().meta.title).toBe('Untitled')
  })

  it('sets created and modified to ISO 8601 datetime strings', () => {
    const { meta } = createDefaultProject()
    expect(() => new Date(meta.created)).not.toThrow()
    expect(() => new Date(meta.modified)).not.toThrow()
    expect(meta.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(meta.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('two calls produce independent meta objects', () => {
    const a = createDefaultProject()
    const b = createDefaultProject()
    expect(a.meta).not.toBe(b.meta)
  })

  it('two calls produce independent canvas objects', () => {
    const a = createDefaultProject()
    const b = createDefaultProject()
    expect(a.canvas).not.toBe(b.canvas)
  })

  it('two calls produce independent layers arrays', () => {
    const a = createDefaultProject()
    const b = createDefaultProject()
    expect(a.layers).not.toBe(b.layers)
  })
})
