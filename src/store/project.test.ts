import { beforeEach, describe, expect, it } from 'vitest'
import type { RingArtworkPatch, RadialLinesArtworkPatch } from './project'
import { createDefaultProject, createRadialLinesLayer, createRingLayer } from '../utils/factories'
import { useProjectStore } from './project'

beforeEach(() => {
  useProjectStore.setState({ project: createDefaultProject() })
})

const getProject = () => useProjectStore.getState().project
const getLayers = () => useProjectStore.getState().project.layers

describe('default state', () => {
  it('starts with an empty layers array', () => {
    expect(getLayers()).toHaveLength(0)
  })

  it('starts with version 1.0.0', () => {
    expect(getProject().version).toBe('1.0.0')
  })

  it('starts with the sentinel set to true', () => {
    expect(getProject().__magic_circle__).toBe(true)
  })

  it('starts with default canvas dimensions', () => {
    expect(getProject().canvas).toEqual({ width: 1000, height: 1000 })
  })
})

describe('setProject', () => {
  it('replaces the entire project', () => {
    const ring = createRingLayer()
    const newProject = { ...createDefaultProject(), layers: [ring] }
    useProjectStore.getState().setProject(newProject)
    expect(getLayers()).toHaveLength(1)
    expect(getLayers()[0].id).toBe(ring.id)
  })
})

describe('resetProject', () => {
  it('clears all layers', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useProjectStore.getState().resetProject()
    expect(getLayers()).toHaveLength(0)
  })

  it('resets meta title to Untitled', () => {
    useProjectStore.getState().setProjectMeta({ title: 'My Project' })
    useProjectStore.getState().resetProject()
    expect(getProject().meta.title).toBe('Untitled')
  })
})

describe('setProjectMeta', () => {
  it('updates the title', () => {
    useProjectStore.getState().setProjectMeta({ title: 'New Title' })
    expect(getProject().meta.title).toBe('New Title')
  })

  it('does not overwrite unrelated meta fields', () => {
    const originalCreated = getProject().meta.created
    useProjectStore.getState().setProjectMeta({ title: 'X' })
    expect(getProject().meta.created).toBe(originalCreated)
  })
})

describe('setCanvasConfig', () => {
  it('updates canvas width', () => {
    useProjectStore.getState().setCanvasConfig({ width: 2000 })
    expect(getProject().canvas.width).toBe(2000)
  })

  it('does not overwrite unrelated canvas fields', () => {
    useProjectStore.getState().setCanvasConfig({ width: 2000 })
    expect(getProject().canvas.height).toBe(1000)
  })
})

describe('addLayer', () => {
  it('appends a layer to the array', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    expect(getLayers()).toHaveLength(1)
    expect(getLayers()[0].id).toBe(ring.id)
  })

  it('follows bottom-to-top ordering: first added is at index 0', () => {
    const a = createRingLayer({ name: 'A' })
    const b = createRingLayer({ name: 'B' })
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    expect(getLayers()[0].id).toBe(a.id)
    expect(getLayers()[1].id).toBe(b.id)
  })
})

describe('updateRingLayer', () => {
  it('patches only the specified fields', () => {
    const ring = createRingLayer({ radius: 200, color: '#000000' })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 400 })
    const updated = getLayers()[0] as { radius: number; color: string }
    expect(updated.radius).toBe(400)
    expect(updated.color).toBe('#000000')
  })

  it('patches opacity', () => {
    const ring = createRingLayer({ opacity: 1 })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateRingLayer(ring.id, { opacity: 0.5 })
    expect(getLayers()[0].opacity).toBe(0.5)
  })

  it('is a no-op for a nonexistent ID', () => {
    const before = [...getLayers()]
    useProjectStore.getState().updateRingLayer('nonexistent', { radius: 999 })
    expect(getLayers()).toEqual(before)
  })

  it('is a no-op when the layer is locked', () => {
    const ring = createRingLayer({ locked: true, radius: 200 })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 400 })
    expect((getLayers()[0] as { radius: number }).radius).toBe(200)
  })

  it('is a no-op when called on a radial-lines layer', () => {
    const rl = createRadialLinesLayer()
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRingLayer(rl.id, { radius: 999 })
    expect(getLayers()[0].type).toBe('radial-lines')
    expect((getLayers()[0] as { radius?: number }).radius).toBeUndefined()
  })

  it('preserves reference for unaffected layers', () => {
    const a = createRingLayer()
    const b = createRingLayer()
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    const bRef = getLayers()[1]
    useProjectStore.getState().updateRingLayer(a.id, { radius: 999 })
    expect(getLayers()[1]).toBe(bRef)
  })

  it('ring patch type cannot carry radial-lines-only fields at compile time', () => {
    const accept = (p: RingArtworkPatch) => p
    // @ts-expect-error 'count' does not exist in RingArtworkPatch
    accept({ count: 1 })
    // @ts-expect-error 'innerRadius' does not exist in RingArtworkPatch
    accept({ innerRadius: 100 })
    // @ts-expect-error 'outerRadius' does not exist in RingArtworkPatch
    accept({ outerRadius: 200 })
    // @ts-expect-error 'startAngle' does not exist in RingArtworkPatch
    accept({ startAngle: 45 })
    expect(accept({ radius: 300, strokeWidth: 4, color: '#fff', opacity: 1 })).toBeDefined()
  })
})

describe('updateRadialLinesLayer', () => {
  it('patches only the specified fields', () => {
    const rl = createRadialLinesLayer({ count: 4, color: '#000000' })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { count: 12 })
    const updated = getLayers()[0] as { count: number; color: string }
    expect(updated.count).toBe(12)
    expect(updated.color).toBe('#000000')
  })

  it('patches opacity', () => {
    const rl = createRadialLinesLayer({ opacity: 1 })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { opacity: 0.7 })
    expect(getLayers()[0].opacity).toBe(0.7)
  })

  it('is a no-op for a nonexistent ID', () => {
    const before = [...getLayers()]
    useProjectStore.getState().updateRadialLinesLayer('nonexistent', { count: 1 })
    expect(getLayers()).toEqual(before)
  })

  it('is a no-op when the layer is locked', () => {
    const rl = createRadialLinesLayer({ locked: true, count: 4 })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { count: 12 })
    expect((getLayers()[0] as { count: number }).count).toBe(4)
  })

  it('is a no-op when called on a ring layer', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateRadialLinesLayer(ring.id, { count: 99 })
    expect(getLayers()[0].type).toBe('ring')
    expect((getLayers()[0] as { count?: number }).count).toBeUndefined()
  })

  it('radial-lines patch type cannot carry ring-only fields at compile time', () => {
    const accept = (p: RadialLinesArtworkPatch) => p
    // @ts-expect-error 'radius' does not exist in RadialLinesArtworkPatch
    accept({ radius: 300 })
    expect(accept({ count: 8, innerRadius: 100, outerRadius: 200 })).toBeDefined()
  })

  it('rejects patch when resulting innerRadius equals outerRadius', () => {
    const rl = createRadialLinesLayer({ innerRadius: 100, outerRadius: 300 })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { innerRadius: 300 })
    expect((getLayers()[0] as { innerRadius: number }).innerRadius).toBe(100)
  })

  it('rejects patch when resulting innerRadius exceeds outerRadius', () => {
    const rl = createRadialLinesLayer({ innerRadius: 100, outerRadius: 300 })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { innerRadius: 400 })
    expect((getLayers()[0] as { innerRadius: number }).innerRadius).toBe(100)
  })

  it('rejects patch when resulting outerRadius falls below innerRadius', () => {
    const rl = createRadialLinesLayer({ innerRadius: 200, outerRadius: 400 })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { outerRadius: 100 })
    expect((getLayers()[0] as { outerRadius: number }).outerRadius).toBe(400)
  })

  it('accepts patch that widens the band (valid innerRadius < outerRadius)', () => {
    const rl = createRadialLinesLayer({ innerRadius: 100, outerRadius: 300 })
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateRadialLinesLayer(rl.id, { outerRadius: 500 })
    expect((getLayers()[0] as { outerRadius: number }).outerRadius).toBe(500)
  })
})

describe('updateLayerTransform', () => {
  it('merges a partial transform patch with the existing transform', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 50, y: 100 })
    const t = getLayers()[0].transform
    expect(t.x).toBe(50)
    expect(t.y).toBe(100)
    expect(t.rotation).toBe(0)
    expect(t.scaleX).toBe(1)
    expect(t.scaleY).toBe(1)
  })

  it('does not remove unspecified transform fields', () => {
    const ring = createRingLayer({
      transform: { x: 10, y: 20, rotation: 30, scaleX: 2, scaleY: 2 },
    })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateLayerTransform(ring.id, { rotation: 90 })
    const t = getLayers()[0].transform
    expect(t.x).toBe(10)
    expect(t.y).toBe(20)
    expect(t.rotation).toBe(90)
    expect(t.scaleX).toBe(2)
    expect(t.scaleY).toBe(2)
  })

  it('works on radial-lines layers as well', () => {
    const rl = createRadialLinesLayer()
    useProjectStore.getState().addLayer(rl)
    useProjectStore.getState().updateLayerTransform(rl.id, { x: 25 })
    expect(getLayers()[0].transform.x).toBe(25)
  })

  it('is a no-op for a nonexistent ID', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    const before = getLayers()[0].transform
    useProjectStore.getState().updateLayerTransform('nonexistent', { x: 999 })
    expect(getLayers()[0].transform).toBe(before)
  })

  it('is a no-op when the layer is locked', () => {
    const ring = createRingLayer({ locked: true })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 999 })
    expect(getLayers()[0].transform.x).toBe(0)
  })

  it('creates a new transform object (immutability)', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    const originalTransform = getLayers()[0].transform
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 10 })
    expect(getLayers()[0].transform).not.toBe(originalTransform)
  })
})

describe('renameLayer', () => {
  it('renames the specified layer', () => {
    const ring = createRingLayer({ name: 'Old Name' })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().renameLayer(ring.id, 'New Name')
    expect(getLayers()[0].name).toBe('New Name')
  })

  it('is a no-op for a nonexistent ID', () => {
    const ring = createRingLayer({ name: 'Original' })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().renameLayer('nonexistent', 'New Name')
    expect(getLayers()[0].name).toBe('Original')
  })

  it('is allowed even when the layer is locked', () => {
    const ring = createRingLayer({ locked: true, name: 'Old Name' })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().renameLayer(ring.id, 'Renamed While Locked')
    expect(getLayers()[0].name).toBe('Renamed While Locked')
  })

  it('does not affect other layers', () => {
    const a = createRingLayer({ name: 'A' })
    const b = createRingLayer({ name: 'B' })
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    useProjectStore.getState().renameLayer(a.id, 'Renamed A')
    expect(getLayers()[1].name).toBe('B')
  })
})

describe('removeLayer', () => {
  it('removes the correct layer', () => {
    const a = createRingLayer()
    const b = createRingLayer()
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    useProjectStore.getState().removeLayer(a.id)
    expect(getLayers()).toHaveLength(1)
    expect(getLayers()[0].id).toBe(b.id)
  })

  it('is a no-op for a nonexistent ID', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().removeLayer('nonexistent')
    expect(getLayers()).toHaveLength(1)
  })

  it('results in an empty array when the only layer is removed', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().removeLayer(ring.id)
    expect(getLayers()).toHaveLength(0)
  })
})

describe('duplicateLayer', () => {
  it('inserts the duplicate immediately above the original', () => {
    const ring = createRingLayer({ name: 'Original' })
    const after = createRingLayer({ name: 'After' })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().addLayer(after)
    useProjectStore.getState().duplicateLayer(ring.id)
    expect(getLayers()).toHaveLength(3)
    expect(getLayers()[0].id).toBe(ring.id)
    expect(getLayers()[1].name).toBe('Copy of Original')
    expect(getLayers()[2].id).toBe(after.id)
  })

  it('creates a new unique ID', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().duplicateLayer(ring.id)
    const ids = getLayers().map((l) => l.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('prefixes the name with Copy of', () => {
    const ring = createRingLayer({ name: 'My Ring' })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().duplicateLayer(ring.id)
    expect(getLayers()[1].name).toBe('Copy of My Ring')
  })

  it('does not share transform reference with the original', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().duplicateLayer(ring.id)
    expect(getLayers()[0].transform).not.toBe(getLayers()[1].transform)
  })

  it('is a no-op for a nonexistent ID', () => {
    useProjectStore.getState().duplicateLayer('nonexistent')
    expect(getLayers()).toHaveLength(0)
  })
})

describe('reorderLayers', () => {
  const setup = () => {
    const a = createRingLayer({ name: 'A' })
    const b = createRingLayer({ name: 'B' })
    const c = createRingLayer({ name: 'C' })
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    useProjectStore.getState().addLayer(c)
    return { a, b, c }
  }

  it('moves a layer from index 0 to index 2', () => {
    const { a, b, c } = setup()
    useProjectStore.getState().reorderLayers(0, 2)
    expect(getLayers().map((l) => l.id)).toEqual([b.id, c.id, a.id])
  })

  it('moves a layer from index 2 to index 0', () => {
    const { a, b, c } = setup()
    useProjectStore.getState().reorderLayers(2, 0)
    expect(getLayers().map((l) => l.id)).toEqual([c.id, a.id, b.id])
  })

  it('is a no-op when from and to are the same index', () => {
    const { a, b, c } = setup()
    const before = getLayers().map((l) => l.id)
    useProjectStore.getState().reorderLayers(1, 1)
    expect(getLayers().map((l) => l.id)).toEqual(before)
    expect(getLayers()[0].id).toBe(a.id)
    expect(getLayers()[1].id).toBe(b.id)
    expect(getLayers()[2].id).toBe(c.id)
  })

  it('is a no-op for a negative fromIndex', () => {
    setup()
    const before = getLayers().map((l) => l.id)
    useProjectStore.getState().reorderLayers(-1, 0)
    expect(getLayers().map((l) => l.id)).toEqual(before)
  })

  it('is a no-op for an out-of-bounds toIndex', () => {
    setup()
    const before = getLayers().map((l) => l.id)
    useProjectStore.getState().reorderLayers(0, 99)
    expect(getLayers().map((l) => l.id)).toEqual(before)
  })
})

describe('toggleLayerVisibility', () => {
  it('toggles visible from true to false', () => {
    const ring = createRingLayer({ visible: true })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerVisibility(ring.id)
    expect(getLayers()[0].visible).toBe(false)
  })

  it('toggles visible from false to true', () => {
    const ring = createRingLayer({ visible: false })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerVisibility(ring.id)
    expect(getLayers()[0].visible).toBe(true)
  })

  it('is allowed even when the layer is locked', () => {
    const ring = createRingLayer({ locked: true, visible: true })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerVisibility(ring.id)
    expect(getLayers()[0].visible).toBe(false)
  })
})

describe('toggleLayerLock', () => {
  it('toggles locked from false to true', () => {
    const ring = createRingLayer({ locked: false })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerLock(ring.id)
    expect(getLayers()[0].locked).toBe(true)
  })

  it('toggles locked from true to false (unlock)', () => {
    const ring = createRingLayer({ locked: true })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerLock(ring.id)
    expect(getLayers()[0].locked).toBe(false)
  })

  it('unlock allows subsequent updateRingLayer to apply', () => {
    const ring = createRingLayer({ locked: true, radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerLock(ring.id)
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 999 })
    expect((getLayers()[0] as { radius: number }).radius).toBe(999)
  })

  it('unlock allows subsequent updateLayerTransform to apply', () => {
    const ring = createRingLayer({ locked: true })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().toggleLayerLock(ring.id)
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 42 })
    expect(getLayers()[0].transform.x).toBe(42)
  })
})

describe('centerLayer', () => {
  it('sets transform.x and transform.y to 0', () => {
    const ring = createRingLayer({
      transform: { x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().centerLayer(ring.id)
    const t = getLayers()[0].transform
    expect(t.x).toBe(0)
    expect(t.y).toBe(0)
  })

  it('preserves other transform fields', () => {
    const ring = createRingLayer({
      transform: { x: 50, y: 50, rotation: 45, scaleX: 2, scaleY: 3 },
    })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().centerLayer(ring.id)
    const t = getLayers()[0].transform
    expect(t.rotation).toBe(45)
    expect(t.scaleX).toBe(2)
    expect(t.scaleY).toBe(3)
  })

  it('is a no-op when the layer is locked', () => {
    const ring = createRingLayer({
      locked: true,
      transform: { x: 99, y: 99, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().centerLayer(ring.id)
    const t = getLayers()[0].transform
    expect(t.x).toBe(99)
    expect(t.y).toBe(99)
  })

  it('unlocking allows centering', () => {
    const ring = createRingLayer({
      locked: true,
      transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(ring)
    useProjectStore.getState().centerLayer(ring.id)
    expect(getLayers()[0].transform.x).toBe(50)
    useProjectStore.getState().toggleLayerLock(ring.id)
    useProjectStore.getState().centerLayer(ring.id)
    expect(getLayers()[0].transform.x).toBe(0)
    expect(getLayers()[0].transform.y).toBe(0)
  })

  it('is a no-op for a nonexistent ID', () => {
    const ring = createRingLayer({ transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(ring)
    const before = getLayers()[0].transform
    useProjectStore.getState().centerLayer('nonexistent')
    expect(getLayers()[0].transform).toBe(before)
  })

  it('does not affect other layers', () => {
    const a = createRingLayer({ transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 } })
    const b = createRingLayer({ transform: { x: 200, y: 300, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    useProjectStore.getState().centerLayer(a.id)
    expect(getLayers()[1].transform.x).toBe(200)
    expect(getLayers()[1].transform.y).toBe(300)
  })
})

describe('immutability', () => {
  it('addLayer does not mutate the previous layers array', () => {
    const before = getLayers()
    useProjectStore.getState().addLayer(createRingLayer())
    expect(before).toHaveLength(0)
  })

  it('removeLayer does not mutate the previous project object', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    const prevProject = getProject()
    useProjectStore.getState().removeLayer(ring.id)
    expect(prevProject.layers).toHaveLength(1)
  })

  it('updateRingLayer does not mutate the original layer object', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    const originalLayer = getLayers()[0]
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 999 })
    expect((originalLayer as { radius: number }).radius).toBe(100)
  })
})
