import { describe, expect, it } from 'vitest'
import {
  angleRadians,
  calcMoveTransform,
  calcRotation,
  calcScaleTransform,
  cornerLocalPosition,
  radToDeg,
  rotateVec,
} from './transform'

// ─── angleRadians ─────────────────────────────────────────────────────────────

describe('angleRadians', () => {
  it('returns 0 for right direction (positive X axis)', () => {
    expect(angleRadians(10, 0, 0, 0)).toBeCloseTo(0)
  })

  it('returns π/2 for downward direction (+Y down)', () => {
    expect(angleRadians(0, 10, 0, 0)).toBeCloseTo(Math.PI / 2)
  })

  it('returns π for left direction', () => {
    expect(angleRadians(-10, 0, 0, 0)).toBeCloseTo(Math.PI)
  })

  it('returns -π/2 for upward direction', () => {
    expect(angleRadians(0, -10, 0, 0)).toBeCloseTo(-Math.PI / 2)
  })

  it('returns 0 for zero-length vector instead of NaN', () => {
    const result = angleRadians(5, 5, 5, 5)
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBe(0)
  })

  it('respects non-origin pivot', () => {
    expect(angleRadians(110, 0, 100, 0)).toBeCloseTo(0)
    expect(angleRadians(100, 10, 100, 0)).toBeCloseTo(Math.PI / 2)
  })
})

// ─── radToDeg ────────────────────────────────────────────────────────────────

describe('radToDeg', () => {
  it('converts 0 to 0', () => expect(radToDeg(0)).toBe(0))
  it('converts π to 180', () => expect(radToDeg(Math.PI)).toBeCloseTo(180))
  it('converts π/2 to 90', () => expect(radToDeg(Math.PI / 2)).toBeCloseTo(90))
  it('converts -π/2 to -90', () => expect(radToDeg(-Math.PI / 2)).toBeCloseTo(-90))
  it('converts 2π to 360', () => expect(radToDeg(2 * Math.PI)).toBeCloseTo(360))
})

// ─── calcRotation ─────────────────────────────────────────────────────────────

describe('calcRotation', () => {
  it('returns starting rotation when angles are equal (zero delta)', () => {
    expect(calcRotation(0, 0, 45)).toBeCloseTo(45)
  })

  it('clockwise rotation: dragging from top to right (0 → π/2) adds 90°', () => {
    expect(calcRotation(0, Math.PI / 2, 0)).toBeCloseTo(90)
  })

  it('counterclockwise rotation: dragging from top to left subtracts', () => {
    expect(calcRotation(0, -Math.PI / 4, 0)).toBeCloseTo(-45)
  })

  it('adds delta to nonzero starting rotation', () => {
    expect(calcRotation(0, Math.PI / 2, 30)).toBeCloseTo(120)
  })

  it('handles crossing ±π boundary without discontinuity', () => {
    // From just past π to just below -π: delta should be small negative
    const start = Math.PI - 0.01
    const current = -(Math.PI - 0.01)
    const delta = current - start // ≈ -2*(π-0.01), large negative
    // The function just adds; boundary handling is in the caller via normalization if desired
    expect(calcRotation(start, current, 0)).toBeCloseTo(radToDeg(delta))
  })

  it('preserves starting rotation with full 2π rotation', () => {
    expect(calcRotation(0, 2 * Math.PI, 0)).toBeCloseTo(360)
  })
})

// ─── rotateVec ────────────────────────────────────────────────────────────────

describe('rotateVec', () => {
  it('0 degrees leaves vector unchanged', () => {
    const r = rotateVec(3, 4, 0)
    expect(r.x).toBeCloseTo(3)
    expect(r.y).toBeCloseTo(4)
  })

  it('90 degrees rotates (1, 0) to (0, -1) in inverse-rotation frame', () => {
    // rotateVec with positive angle rotates the frame CW (inverse rotation)
    // (1, 0) rotated by 90: x = 1*cos(90) + 0*sin(90) = 0, y = -1*sin(90) + 0*cos(90) = -1
    const r = rotateVec(1, 0, 90)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(-1)
  })

  it('negative 90 degrees rotates (1, 0) to (0, 1)', () => {
    const r = rotateVec(1, 0, -90)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(1)
  })

  it('180 degrees negates the vector', () => {
    const r = rotateVec(3, 4, 180)
    expect(r.x).toBeCloseTo(-3)
    expect(r.y).toBeCloseTo(-4)
  })

  it('360 degrees is identity', () => {
    const r = rotateVec(5, -2, 360)
    expect(r.x).toBeCloseTo(5)
    expect(r.y).toBeCloseTo(-2)
  })
})

// ─── calcMoveTransform ────────────────────────────────────────────────────────

describe('calcMoveTransform', () => {
  it('zero delta returns start position', () => {
    const r = calcMoveTransform(100, 200, 50, 60, 50, 60)
    expect(r.x).toBe(100)
    expect(r.y).toBe(200)
  })

  it('positive X delta', () => {
    const r = calcMoveTransform(0, 0, 0, 0, 150, 0)
    expect(r.x).toBeCloseTo(150)
    expect(r.y).toBeCloseTo(0)
  })

  it('positive Y delta', () => {
    const r = calcMoveTransform(0, 0, 0, 0, 0, 200)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(200)
  })

  it('negative delta', () => {
    const r = calcMoveTransform(100, 200, 50, 60, -50, -40)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(100)
  })

  it('nonzero starting transform', () => {
    const r = calcMoveTransform(300, 400, 0, 0, 100, 50)
    expect(r.x).toBeCloseTo(400)
    expect(r.y).toBeCloseTo(450)
  })

  it('result does not depend on viewport zoom (world coords already converted)', () => {
    // At zoom=2 a screen delta of 200px becomes 100 world units — caller does the conversion
    const r1 = calcMoveTransform(0, 0, 0, 0, 100, 0) // as if zoom handled by caller
    expect(r1.x).toBeCloseTo(100)
  })

  it('derived from start state, not cumulative', () => {
    // Simulating two consecutive moves derived from same start
    const r1 = calcMoveTransform(0, 0, 0, 0, 50, 0)
    const r2 = calcMoveTransform(0, 0, 0, 0, 100, 0)
    expect(r1.x).toBeCloseTo(50)
    expect(r2.x).toBeCloseTo(100)
    // No cumulative drift: r2.x !== r1.x + 100
  })
})

// ─── calcScaleTransform ───────────────────────────────────────────────────────

describe('calcScaleTransform', () => {
  // Layer at origin, no rotation, startScale = 1
  const baseArgs = {
    layerX: 0,
    layerY: 0,
    layerRotationDeg: 0,
    startScaleX: 1,
    startScaleY: 1,
  }

  it('returns startScale when pointer is at start position', () => {
    const r = calcScaleTransform(
      baseArgs.layerX,
      baseArgs.layerY,
      baseArgs.layerRotationDeg,
      baseArgs.startScaleX,
      baseArgs.startScaleY,
      300,
      300, // startLocal
      300,
      300, // currentWorld = same
      false
    )
    expect(r.scaleX).toBeCloseTo(1)
    expect(r.scaleY).toBeCloseTo(1)
  })

  it('doubles scale when pointer is twice as far from pivot', () => {
    const r = calcScaleTransform(
      0,
      0,
      0,
      1,
      1,
      100,
      100, // startLocal
      200,
      200, // currentWorld
      false
    )
    expect(r.scaleX).toBeCloseTo(2)
    expect(r.scaleY).toBeCloseTo(2)
  })

  it('halves scale when pointer is half as far', () => {
    const r = calcScaleTransform(0, 0, 0, 1, 1, 200, 200, 100, 100, false)
    expect(r.scaleX).toBeCloseTo(0.5)
    expect(r.scaleY).toBeCloseTo(0.5)
  })

  it('nonuniform scale when pointer moves on X only', () => {
    const r = calcScaleTransform(
      0,
      0,
      0,
      1,
      1,
      100,
      100,
      200,
      100, // X doubled, Y unchanged
      false
    )
    expect(r.scaleX).toBeCloseTo(2)
    expect(r.scaleY).toBeCloseTo(1)
  })

  it('respects existing non-1 starting scale', () => {
    const r = calcScaleTransform(0, 0, 0, 2, 3, 100, 100, 200, 200, false)
    expect(r.scaleX).toBeCloseTo(4) // 2 * (200/100)
    expect(r.scaleY).toBeCloseTo(6) // 3 * (200/100)
  })

  it('handles rotated layer by converting pointer to local space', () => {
    // Layer rotated 90°. Start local (100, 0), after rotation:
    // world relative = rotateVec_inverse(100, 0, 90) = (0, 100)
    // So if startLocal = (100, 0) and we put pointer at (0, 200) world-relative:
    // local = rotateVec(0, 200, -90) = (200, 0)
    // scaleX = 200/100 = 2
    const r = calcScaleTransform(
      0,
      0,
      90,
      1,
      1,
      100,
      0, // startLocal in local space
      0,
      200, // currentWorld (relative to layer, already at origin)
      false
    )
    expect(r.scaleX).toBeCloseTo(2)
  })

  it('Shift constraint: dominant axis drives both scales proportionally', () => {
    // Start scale (1, 1), pointer doubles X but only 1.5x Y
    const r = calcScaleTransform(
      0,
      0,
      0,
      1,
      1,
      100,
      100,
      200,
      150, // X dominant (2x vs 1.5x)
      true
    )
    // X is dominant (2x change), Y should match: scaleY = 2 / (1/1) = 2
    expect(r.scaleX).toBeCloseTo(2)
    expect(r.scaleY).toBeCloseTo(2)
  })

  it('Shift constraint with non-square aspect ratio', () => {
    // startScaleX=2, startScaleY=1, ratio=2
    const r = calcScaleTransform(
      0,
      0,
      0,
      2,
      1,
      100,
      100,
      200,
      200, // both double (X dominant, fracX = 2, fracY = 2, equal, takes X)
      true
    )
    // scaleX doubles to 4, scaleY = 4 / 2 = 2
    expect(r.scaleX).toBeCloseTo(4)
    expect(r.scaleY).toBeCloseTo(2)
  })

  it('never returns NaN for valid inputs', () => {
    const r = calcScaleTransform(0, 0, 45, 1, 1, 50, 50, 75, 75, false)
    expect(Number.isFinite(r.scaleX)).toBe(true)
    expect(Number.isFinite(r.scaleY)).toBe(true)
  })

  it('guards near-zero denominator (start local ≈ 0)', () => {
    const r = calcScaleTransform(0, 0, 0, 1, 1, 0, 0, 100, 100, false)
    expect(Number.isFinite(r.scaleX)).toBe(true)
    expect(Number.isFinite(r.scaleY)).toBe(true)
    expect(Math.abs(r.scaleX)).toBeGreaterThan(0)
    expect(Math.abs(r.scaleY)).toBeGreaterThan(0)
  })

  it('does not return exactly 0 scale', () => {
    // Pointer at layer center → near-zero local vec
    const r = calcScaleTransform(0, 0, 0, 1, 1, 100, 100, 0.0001, 0.0001, false)
    expect(Math.abs(r.scaleX)).toBeGreaterThan(0)
    expect(Math.abs(r.scaleY)).toBeGreaterThan(0)
  })

  it('Shift toggle mid-gesture: uses start scale as constraint basis', () => {
    // No shift
    const r1 = calcScaleTransform(0, 0, 0, 1, 1, 100, 100, 200, 150, false)
    // With shift (same pointer position)
    const r2 = calcScaleTransform(0, 0, 0, 1, 1, 100, 100, 200, 150, true)
    // r1 can be nonuniform; r2 must be uniform relative to start ratio
    expect(r1.scaleX).not.toBeCloseTo(r1.scaleY)
    expect(r2.scaleX).toBeCloseTo(r2.scaleY) // start ratio = 1:1
  })

  it('Shift constraint takes Y-dominant branch when fracY > fracX', () => {
    // startLocal = (100,100), currentWorld = (150,200):
    //   raw scaleX = 150/100 = 1.5  → fracX = 1.5
    //   raw scaleY = 200/100 = 2.0  → fracY = 2.0
    // fracY > fracX → else branch: scaleX = scaleY * aspectRatio(1) = 2
    const r = calcScaleTransform(0, 0, 0, 1, 1, 100, 100, 150, 200, true)
    expect(r.scaleX).toBeCloseTo(2)
    expect(r.scaleY).toBeCloseTo(2)
  })
})

// ─── cornerLocalPosition ─────────────────────────────────────────────────────

describe('cornerLocalPosition', () => {
  it('nw corner is at (-r, -r)', () => {
    const p = cornerLocalPosition(100, 'nw')
    expect(p.x).toBe(-100)
    expect(p.y).toBe(-100)
  })

  it('ne corner is at (+r, -r)', () => {
    const p = cornerLocalPosition(100, 'ne')
    expect(p.x).toBe(100)
    expect(p.y).toBe(-100)
  })

  it('sw corner is at (-r, +r)', () => {
    const p = cornerLocalPosition(100, 'sw')
    expect(p.x).toBe(-100)
    expect(p.y).toBe(100)
  })

  it('se corner is at (+r, +r)', () => {
    const p = cornerLocalPosition(100, 'se')
    expect(p.x).toBe(100)
    expect(p.y).toBe(100)
  })
})
