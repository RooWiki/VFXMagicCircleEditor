import { beforeEach, describe, expect, it } from 'vitest'
import { VIEWPORT_ZOOM_MAX, VIEWPORT_ZOOM_MIN } from '../constants'
import { screenToWorld } from '../utils/viewport'
import { useViewportStore } from './viewport'
import { useProjectStore } from './project'

const get = () => useViewportStore.getState()

beforeEach(() => {
  useViewportStore.setState({
    centerX: 0,
    centerY: 0,
    zoom: 1,
    viewportWidth: 800,
    viewportHeight: 600,
  })
})

// ─── default state ─────────────────────────────────────────────────────────

describe('default state', () => {
  it('starts with zoom=1', () => {
    expect(get().zoom).toBe(1)
  })

  it('starts with center at origin', () => {
    expect(get().centerX).toBe(0)
    expect(get().centerY).toBe(0)
  })

  it('does not contain project fields', () => {
    const state = get() as unknown as Record<string, unknown>
    expect(state.layers).toBeUndefined()
    expect(state.canvas).toBeUndefined()
    expect(state.__magic_circle__).toBeUndefined()
  })
})

// ─── setCenter ─────────────────────────────────────────────────────────────

describe('setCenter', () => {
  it('updates centerX and centerY', () => {
    get().setCenter(100, -200)
    expect(get().centerX).toBe(100)
    expect(get().centerY).toBe(-200)
  })

  it('accepts zero', () => {
    get().setCenter(999, 999)
    get().setCenter(0, 0)
    expect(get().centerX).toBe(0)
    expect(get().centerY).toBe(0)
  })
})

// ─── setZoom ───────────────────────────────────────────────────────────────

describe('setZoom', () => {
  it('updates zoom', () => {
    get().setZoom(2)
    expect(get().zoom).toBe(2)
  })

  it('clamps to VIEWPORT_ZOOM_MIN', () => {
    get().setZoom(0)
    expect(get().zoom).toBe(VIEWPORT_ZOOM_MIN)
  })

  it('clamps to VIEWPORT_ZOOM_MAX', () => {
    get().setZoom(9999)
    expect(get().zoom).toBe(VIEWPORT_ZOOM_MAX)
  })
})

// ─── pan ───────────────────────────────────────────────────────────────────

describe('pan', () => {
  it('moves center in the opposite direction of drag (dragging right decreases centerX)', () => {
    get().pan(100, 0)
    expect(get().centerX).toBeCloseTo(-100)
  })

  it('scales the center shift by 1/zoom', () => {
    useViewportStore.setState({ zoom: 2 })
    get().pan(100, 0)
    expect(get().centerX).toBeCloseTo(-50)
  })

  it('panning Y moves the center upward when dragging down', () => {
    get().pan(0, 80)
    expect(get().centerY).toBeCloseTo(-80)
  })

  it('accumulates correctly over multiple calls', () => {
    get().pan(50, 0)
    get().pan(50, 0)
    expect(get().centerX).toBeCloseTo(-100)
  })
})

// ─── zoomAtPoint ───────────────────────────────────────────────────────────

describe('zoomAtPoint', () => {
  it('updates zoom', () => {
    get().zoomAtPoint(2, 400, 300)
    expect(get().zoom).toBeCloseTo(2)
  })

  it('clamps zoom to min', () => {
    get().zoomAtPoint(0.0001, 400, 300)
    expect(get().zoom).toBe(VIEWPORT_ZOOM_MIN)
  })

  it('clamps zoom to max', () => {
    get().zoomAtPoint(9999, 400, 300)
    expect(get().zoom).toBe(VIEWPORT_ZOOM_MAX)
  })

  it('keeps the world point under the cursor approximately stable', () => {
    const sx = 200
    const sy = 150
    const { centerX: cx0, centerY: cy0, zoom: z0, viewportWidth: vw, viewportHeight: vh } = get()
    const worldBefore = screenToWorld(sx, sy, cx0, cy0, z0, vw, vh)

    get().zoomAtPoint(2, sx, sy)

    const { centerX, centerY, zoom, viewportWidth, viewportHeight } = get()
    const worldAfter = screenToWorld(sx, sy, centerX, centerY, zoom, viewportWidth, viewportHeight)

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 4)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 4)
  })
})

// ─── fitView ───────────────────────────────────────────────────────────────

describe('fitView', () => {
  it('sets center to (0, 0)', () => {
    get().setCenter(999, 999)
    get().fitView(1000, 1000)
    expect(get().centerX).toBe(0)
    expect(get().centerY).toBe(0)
  })

  it('produces a zoom > 0', () => {
    get().fitView(1000, 1000)
    expect(get().zoom).toBeGreaterThan(0)
  })

  it('produces a zoom within bounds', () => {
    get().fitView(1000, 1000)
    expect(get().zoom).toBeGreaterThanOrEqual(VIEWPORT_ZOOM_MIN)
    expect(get().zoom).toBeLessThanOrEqual(VIEWPORT_ZOOM_MAX)
  })

  it('uses the stored viewportWidth/viewportHeight', () => {
    useViewportStore.setState({ viewportWidth: 1000, viewportHeight: 1000 })
    get().fitView(1000, 1000)
    // Fit zoom for 1000×1000 canvas in 1000×1000 viewport with padding 48 = (1000-96)/1000
    expect(get().zoom).toBeCloseTo((1000 - 96) / 1000)
  })
})

// ─── reset ─────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('returns zoom to 1 and center to (0,0)', () => {
    get().setCenter(100, 200)
    get().setZoom(3)
    get().reset()
    expect(get().zoom).toBe(1)
    expect(get().centerX).toBe(0)
    expect(get().centerY).toBe(0)
  })
})

// ─── project state isolation ───────────────────────────────────────────────

describe('project state isolation', () => {
  it('viewport actions do not mutate the project store', () => {
    const before = useProjectStore.getState().project
    get().setCenter(100, 200)
    get().setZoom(2)
    get().pan(50, 50)
    get().fitView(1000, 1000)
    get().reset()
    expect(useProjectStore.getState().project).toBe(before)
  })
})
