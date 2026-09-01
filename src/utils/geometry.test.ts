import { describe, expect, it } from 'vitest'
import { createRadialLinesLayer } from './factories'
import { computeRadialLines } from './geometry'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const layer = (overrides: Parameters<typeof createRadialLinesLayer>[0] = {}) =>
  createRadialLinesLayer(overrides)

const NEAR = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol

// ─── Required ROADMAP tests ────────────────────────────────────────────────────

describe('computeRadialLines — required ROADMAP tests', () => {
  it('count=4, startAngle=0 produces 4 segments at 0/90/180/270 deg from 12 oclock', () => {
    const lines = computeRadialLines(
      layer({ count: 4, innerRadius: 100, outerRadius: 200, startAngle: 0 })
    )
    expect(lines).toHaveLength(4)

    // Line 0: 0° = 12 o'clock → x1=0, y1=-100, x2=0, y2=-200
    expect(NEAR(lines[0].x1, 0)).toBe(true)
    expect(NEAR(lines[0].y1, -100)).toBe(true)
    expect(NEAR(lines[0].x2, 0)).toBe(true)
    expect(NEAR(lines[0].y2, -200)).toBe(true)

    // Line 1: 90° = 3 o'clock → x1=100, y1=0, x2=200, y2=0
    expect(NEAR(lines[1].x1, 100)).toBe(true)
    expect(NEAR(lines[1].y1, 0, 1e-9)).toBe(true)
    expect(NEAR(lines[1].x2, 200)).toBe(true)
    expect(NEAR(lines[1].y2, 0, 1e-9)).toBe(true)

    // Line 2: 180° = 6 o'clock → x1=0, y1=100, x2=0, y2=200
    expect(NEAR(lines[2].x1, 0, 1e-9)).toBe(true)
    expect(NEAR(lines[2].y1, 100)).toBe(true)
    expect(NEAR(lines[2].x2, 0, 1e-9)).toBe(true)
    expect(NEAR(lines[2].y2, 200)).toBe(true)

    // Line 3: 270° = 9 o'clock → x1=-100, y1=0, x2=-200, y2=0
    expect(NEAR(lines[3].x1, -100)).toBe(true)
    expect(NEAR(lines[3].y1, 0, 1e-9)).toBe(true)
    expect(NEAR(lines[3].x2, -200)).toBe(true)
    expect(NEAR(lines[3].y2, 0, 1e-9)).toBe(true)
  })

  it('count=1 produces exactly one segment', () => {
    const lines = computeRadialLines(layer({ count: 1, innerRadius: 100, outerRadius: 200 }))
    expect(lines).toHaveLength(1)
  })

  it('count=12 produces exactly 12 segments', () => {
    const lines = computeRadialLines(layer({ count: 12, innerRadius: 100, outerRadius: 200 }))
    expect(lines).toHaveLength(12)
  })
})

// ─── Default geometry ──────────────────────────────────────────────────────────

describe('computeRadialLines — default layer', () => {
  it('default count=8 produces 8 segments', () => {
    expect(computeRadialLines(layer())).toHaveLength(8)
  })

  it('segments are evenly distributed (45° apart for count=8)', () => {
    const lines = computeRadialLines(layer({ count: 8, startAngle: 0 }))
    const angleStep = 360 / 8
    for (let i = 0; i < 8; i++) {
      const expectedAngleDeg = i * angleStep
      const expectedAngleRad = (expectedAngleDeg * Math.PI) / 180
      const r = layer().innerRadius
      expect(NEAR(lines[i].x1, Math.sin(expectedAngleRad) * r)).toBe(true)
      expect(NEAR(lines[i].y1, -Math.cos(expectedAngleRad) * r)).toBe(true)
    }
  })
})

// ─── startAngle offset ────────────────────────────────────────────────────────

describe('computeRadialLines — startAngle', () => {
  it('startAngle=90 rotates all lines by 90°', () => {
    const base = computeRadialLines(
      layer({ count: 4, innerRadius: 100, outerRadius: 200, startAngle: 0 })
    )
    const rotated = computeRadialLines(
      layer({ count: 4, innerRadius: 100, outerRadius: 200, startAngle: 90 })
    )
    // First line at 90° should match the second line of base set (at 90°)
    expect(NEAR(rotated[0].x1, base[1].x1)).toBe(true)
    expect(NEAR(rotated[0].y1, base[1].y1)).toBe(true)
  })

  it('startAngle=45 places first line at 45° (between 12 and 3)', () => {
    const lines = computeRadialLines(
      layer({ count: 8, innerRadius: 100, outerRadius: 200, startAngle: 45 })
    )
    const angleRad = (45 * Math.PI) / 180
    expect(NEAR(lines[0].x1, Math.sin(angleRad) * 100)).toBe(true)
    expect(NEAR(lines[0].y1, -Math.cos(angleRad) * 100)).toBe(true)
  })
})

// ─── Inner/outer radius ────────────────────────────────────────────────────────

describe('computeRadialLines — inner/outer radius', () => {
  it('first line starts at innerRadius and ends at outerRadius for 0° angle', () => {
    const lines = computeRadialLines(
      layer({ count: 1, innerRadius: 150, outerRadius: 400, startAngle: 0 })
    )
    expect(NEAR(lines[0].x1, 0)).toBe(true)
    expect(NEAR(lines[0].y1, -150)).toBe(true)
    expect(NEAR(lines[0].x2, 0)).toBe(true)
    expect(NEAR(lines[0].y2, -400)).toBe(true)
  })

  it('all segments start at innerRadius distance from origin', () => {
    const rl = layer({ count: 6, innerRadius: 120, outerRadius: 300 })
    const lines = computeRadialLines(rl)
    for (const seg of lines) {
      const dist = Math.sqrt(seg.x1 ** 2 + seg.y1 ** 2)
      expect(NEAR(dist, 120)).toBe(true)
    }
  })

  it('all segments end at outerRadius distance from origin', () => {
    const rl = layer({ count: 6, innerRadius: 120, outerRadius: 300 })
    const lines = computeRadialLines(rl)
    for (const seg of lines) {
      const dist = Math.sqrt(seg.x2 ** 2 + seg.y2 ** 2)
      expect(NEAR(dist, 300)).toBe(true)
    }
  })
})

// ─── Boundary / invalid cases ──────────────────────────────────────────────────

describe('computeRadialLines — boundary and invalid', () => {
  it('returns empty array when innerRadius >= outerRadius (equal)', () => {
    expect(computeRadialLines(layer({ innerRadius: 200, outerRadius: 200 }))).toHaveLength(0)
  })

  it('returns empty array when innerRadius > outerRadius', () => {
    expect(computeRadialLines(layer({ innerRadius: 300, outerRadius: 200 }))).toHaveLength(0)
  })

  it('returns empty array when count <= 0', () => {
    expect(computeRadialLines(layer({ count: 0 }))).toHaveLength(0)
  })

  it('minimum valid: count=1 produces 1 line', () => {
    expect(computeRadialLines(layer({ count: 1, innerRadius: 1, outerRadius: 2 }))).toHaveLength(1)
  })

  it('large count=360 produces 360 lines', () => {
    expect(
      computeRadialLines(layer({ count: 360, innerRadius: 100, outerRadius: 200 }))
    ).toHaveLength(360)
  })
})

// ─── Determinism ──────────────────────────────────────────────────────────────

describe('computeRadialLines — determinism', () => {
  it('same input always produces identical output', () => {
    const a = computeRadialLines(
      layer({ count: 8, innerRadius: 200, outerRadius: 350, startAngle: 15 })
    )
    const b = computeRadialLines(
      layer({ count: 8, innerRadius: 200, outerRadius: 350, startAngle: 15 })
    )
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
