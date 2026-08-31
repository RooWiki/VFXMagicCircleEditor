import { describe, expect, it } from 'vitest'
import { VIEWPORT_ZOOM_MAX, VIEWPORT_ZOOM_MIN, VIEWPORT_FIT_PADDING } from '../constants'
import {
  calcFitView,
  calcViewBox,
  clampZoom,
  formatZoomPercent,
  panByScreenDelta,
  screenToWorld,
  worldToScreen,
  zoomAroundPoint,
} from './viewport'

// ─── clampZoom ─────────────────────────────────────────────────────────────

describe('clampZoom', () => {
  it('returns the value unchanged when within bounds', () => {
    expect(clampZoom(1)).toBe(1)
    expect(clampZoom(0.5)).toBe(0.5)
    expect(clampZoom(2)).toBe(2)
  })

  it('clamps to VIEWPORT_ZOOM_MIN when below', () => {
    expect(clampZoom(0)).toBe(VIEWPORT_ZOOM_MIN)
    expect(clampZoom(-1)).toBe(VIEWPORT_ZOOM_MIN)
    expect(clampZoom(VIEWPORT_ZOOM_MIN - 0.001)).toBe(VIEWPORT_ZOOM_MIN)
  })

  it('clamps to VIEWPORT_ZOOM_MAX when above', () => {
    expect(clampZoom(9999)).toBe(VIEWPORT_ZOOM_MAX)
    expect(clampZoom(VIEWPORT_ZOOM_MAX + 0.001)).toBe(VIEWPORT_ZOOM_MAX)
  })

  it('returns VIEWPORT_ZOOM_MIN at the minimum boundary', () => {
    expect(clampZoom(VIEWPORT_ZOOM_MIN)).toBe(VIEWPORT_ZOOM_MIN)
  })

  it('returns VIEWPORT_ZOOM_MAX at the maximum boundary', () => {
    expect(clampZoom(VIEWPORT_ZOOM_MAX)).toBe(VIEWPORT_ZOOM_MAX)
  })
})

// ─── calcViewBox ───────────────────────────────────────────────────────────

describe('calcViewBox', () => {
  it('returns a safe default when viewport is zero-sized', () => {
    const vb = calcViewBox(0, 0, 1, 0, 0)
    expect(vb.x).toBe(-500)
    expect(vb.y).toBe(-500)
    expect(vb.width).toBe(1000)
    expect(vb.height).toBe(1000)
  })

  it('returns a safe default when zoom is zero', () => {
    const vb = calcViewBox(0, 0, 0, 800, 600)
    expect(vb.width).toBe(1000)
  })

  it('centers the viewBox on the viewport center at zoom=1', () => {
    const vb = calcViewBox(0, 0, 1, 800, 600)
    expect(vb.x).toBeCloseTo(-400)
    expect(vb.y).toBeCloseTo(-300)
    expect(vb.width).toBeCloseTo(800)
    expect(vb.height).toBeCloseTo(600)
  })

  it('halves logical size at zoom=2', () => {
    const vb = calcViewBox(0, 0, 2, 800, 600)
    expect(vb.width).toBeCloseTo(400)
    expect(vb.height).toBeCloseTo(300)
  })

  it('doubles logical size at zoom=0.5', () => {
    const vb = calcViewBox(0, 0, 0.5, 800, 600)
    expect(vb.width).toBeCloseTo(1600)
    expect(vb.height).toBeCloseTo(1200)
  })

  it('shifts the viewBox when the center is not at origin', () => {
    const vb = calcViewBox(100, 50, 1, 800, 600)
    expect(vb.x).toBeCloseTo(-300) // 100 - 400
    expect(vb.y).toBeCloseTo(-250) // 50  - 300
  })
})

// ─── screenToWorld ─────────────────────────────────────────────────────────

describe('screenToWorld', () => {
  it('maps the screen center to the logical center at any zoom', () => {
    expect(screenToWorld(400, 300, 0, 0, 1, 800, 600)).toStrictEqual({ x: 0, y: 0 })
    expect(screenToWorld(400, 300, 0, 0, 2, 800, 600)).toStrictEqual({ x: 0, y: 0 })
  })

  it('maps the top-left screen corner correctly at zoom=1', () => {
    const { x, y } = screenToWorld(0, 0, 0, 0, 1, 800, 600)
    expect(x).toBeCloseTo(-400)
    expect(y).toBeCloseTo(-300)
  })

  it('accounts for a non-zero logical center', () => {
    const { x, y } = screenToWorld(400, 300, 100, 50, 1, 800, 600)
    expect(x).toBeCloseTo(100)
    expect(y).toBeCloseTo(50)
  })

  it('returns (0, 0) when viewport is zero-sized', () => {
    expect(screenToWorld(0, 0, 0, 0, 1, 0, 0)).toStrictEqual({ x: 0, y: 0 })
  })
})

// ─── worldToScreen ─────────────────────────────────────────────────────────

describe('worldToScreen', () => {
  it('maps the world origin to screen center', () => {
    expect(worldToScreen(0, 0, 0, 0, 1, 800, 600)).toStrictEqual({ x: 400, y: 300 })
  })

  it('is the inverse of screenToWorld', () => {
    const sx = 320
    const sy = 180
    const { x: wx, y: wy } = screenToWorld(sx, sy, 0, 0, 1.5, 800, 600)
    const { x: backX, y: backY } = worldToScreen(wx, wy, 0, 0, 1.5, 800, 600)
    expect(backX).toBeCloseTo(sx)
    expect(backY).toBeCloseTo(sy)
  })

  it('round-trips correctly at various zoom levels', () => {
    for (const zoom of [0.1, 0.5, 1, 2, 5]) {
      const wx = 123
      const wy = -456
      const { x: sx, y: sy } = worldToScreen(wx, wy, 0, 0, zoom, 1000, 800)
      const { x: rx, y: ry } = screenToWorld(sx, sy, 0, 0, zoom, 1000, 800)
      expect(rx).toBeCloseTo(wx)
      expect(ry).toBeCloseTo(wy)
    }
  })

  it('returns (0, 0) when viewport is zero-sized', () => {
    expect(worldToScreen(0, 0, 0, 0, 1, 0, 0)).toStrictEqual({ x: 0, y: 0 })
  })
})

// ─── panByScreenDelta ──────────────────────────────────────────────────────

describe('panByScreenDelta', () => {
  it('moves center left when dragging right (positive deltaX)', () => {
    const { centerX } = panByScreenDelta(0, 0, 1, 100, 0)
    expect(centerX).toBeCloseTo(-100) // dragging right reveals left content → center moves left
  })

  it('moves center up when dragging down (positive deltaY)', () => {
    const { centerY } = panByScreenDelta(0, 0, 1, 0, 100)
    expect(centerY).toBeCloseTo(-100)
  })

  it('scales the logical delta by 1/zoom', () => {
    const { centerX: at1 } = panByScreenDelta(0, 0, 1, 100, 0)
    const { centerX: at2 } = panByScreenDelta(0, 0, 2, 100, 0)
    expect(at2).toBeCloseTo(at1 / 2)
  })

  it('is additive across two steps', () => {
    const step1 = panByScreenDelta(0, 0, 1, 50, 0)
    const step2 = panByScreenDelta(step1.centerX, step1.centerY, 1, 50, 0)
    const combined = panByScreenDelta(0, 0, 1, 100, 0)
    expect(step2.centerX).toBeCloseTo(combined.centerX)
  })
})

// ─── zoomAroundPoint ───────────────────────────────────────────────────────

describe('zoomAroundPoint', () => {
  it('keeps the same logical point under the screen cursor', () => {
    const sx = 200
    const sy = 150
    const vw = 800
    const vh = 600

    const worldBefore = screenToWorld(sx, sy, 0, 0, 1, vw, vh)

    const { zoom: newZoom, centerX, centerY } = zoomAroundPoint(1, 2, sx, sy, 0, 0, vw, vh)

    const worldAfter = screenToWorld(sx, sy, centerX, centerY, newZoom, vw, vh)

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5)
  })

  it('clamps to VIEWPORT_ZOOM_MIN when zooming out past the limit', () => {
    const { zoom } = zoomAroundPoint(VIEWPORT_ZOOM_MIN, 0.0001, 400, 300, 0, 0, 800, 600)
    expect(zoom).toBe(VIEWPORT_ZOOM_MIN)
  })

  it('clamps to VIEWPORT_ZOOM_MAX when zooming in past the limit', () => {
    const { zoom } = zoomAroundPoint(VIEWPORT_ZOOM_MAX, 999, 400, 300, 0, 0, 800, 600)
    expect(zoom).toBe(VIEWPORT_ZOOM_MAX)
  })

  it('returns unmodified center when clamped at min zoom', () => {
    // At minimum, cursor anchoring is a no-op because newZoom === currentZoom
    const result = zoomAroundPoint(VIEWPORT_ZOOM_MIN, 0.0001, 200, 150, 10, 20, 800, 600)
    expect(result.zoom).toBe(VIEWPORT_ZOOM_MIN)
    // Center may shift slightly but should not NaN
    expect(isFinite(result.centerX)).toBe(true)
    expect(isFinite(result.centerY)).toBe(true)
  })

  it('returns unmodified center when clamped at max zoom', () => {
    const result = zoomAroundPoint(VIEWPORT_ZOOM_MAX, 9999, 200, 150, 10, 20, 800, 600)
    expect(result.zoom).toBe(VIEWPORT_ZOOM_MAX)
    expect(isFinite(result.centerX)).toBe(true)
    expect(isFinite(result.centerY)).toBe(true)
  })

  it('returns the new zoom with unchanged center for zero-sized viewport', () => {
    const { zoom, centerX, centerY } = zoomAroundPoint(1, 2, 0, 0, 5, 10, 0, 0)
    expect(zoom).toBe(2)
    expect(centerX).toBe(5)
    expect(centerY).toBe(10)
  })
})

// ─── calcFitView ───────────────────────────────────────────────────────────

describe('calcFitView', () => {
  it('always returns center (0, 0)', () => {
    const { centerX, centerY } = calcFitView(1000, 1000, 800, 600)
    expect(centerX).toBe(0)
    expect(centerY).toBe(0)
  })

  it('fits a square canvas in a landscape viewport', () => {
    const { zoom } = calcFitView(1000, 1000, 800, 600, 0)
    expect(zoom).toBeCloseTo(0.6) // limited by height
  })

  it('fits a square canvas with padding', () => {
    const padding = 48
    const { zoom } = calcFitView(1000, 1000, 1000, 1000, padding)
    const expected = (1000 - padding * 2) / 1000
    expect(zoom).toBeCloseTo(expected)
  })

  it('fits a landscape canvas in a portrait viewport', () => {
    // canvas 2000×500, viewport 600×800, no padding
    const { zoom } = calcFitView(2000, 500, 600, 800, 0)
    const zoomX = 600 / 2000 // 0.3
    const zoomY = 800 / 500 // 1.6
    expect(zoom).toBeCloseTo(Math.min(zoomX, zoomY)) // 0.3
  })

  it('fits a non-square canvas correctly', () => {
    // canvas 2000×1000, viewport 800×600, padding 48
    const { zoom } = calcFitView(2000, 1000, 800, 600, 48)
    const zoomX = (800 - 96) / 2000 // 704/2000 = 0.352
    const zoomY = (600 - 96) / 1000 // 504/1000 = 0.504
    expect(zoom).toBeCloseTo(Math.min(zoomX, zoomY))
  })

  it('returns safe defaults for zero-sized viewport', () => {
    const { zoom, centerX, centerY } = calcFitView(1000, 1000, 0, 0)
    expect(zoom).toBe(1)
    expect(centerX).toBe(0)
    expect(centerY).toBe(0)
  })

  it('clamps zoom to VIEWPORT_ZOOM_MIN for an extremely small viewport', () => {
    const { zoom } = calcFitView(1000, 1000, 10, 10)
    expect(zoom).toBe(VIEWPORT_ZOOM_MIN)
  })

  it('uses VIEWPORT_FIT_PADDING as the default padding', () => {
    const { zoom: withDefault } = calcFitView(1000, 1000, 800, 600)
    const { zoom: withExplicit } = calcFitView(1000, 1000, 800, 600, VIEWPORT_FIT_PADDING)
    expect(withDefault).toBeCloseTo(withExplicit)
  })
})

// ─── formatZoomPercent ─────────────────────────────────────────────────────

describe('formatZoomPercent', () => {
  it('formats 1.0 as "100%"', () => {
    expect(formatZoomPercent(1)).toBe('100%')
  })

  it('formats 0.5 as "50%"', () => {
    expect(formatZoomPercent(0.5)).toBe('50%')
  })

  it('formats 2.0 as "200%"', () => {
    expect(formatZoomPercent(2)).toBe('200%')
  })

  it('rounds to the nearest integer percent', () => {
    expect(formatZoomPercent(0.333)).toBe('33%')
    expect(formatZoomPercent(0.666)).toBe('67%')
    // 1.5 → 150 exactly
    expect(formatZoomPercent(1.5)).toBe('150%')
  })
})
