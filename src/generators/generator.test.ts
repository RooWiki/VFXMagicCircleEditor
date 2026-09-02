import { describe, expect, it } from 'vitest'
import { LayerSchema } from '../schema/project'
import { DEFAULT_PARAMS, generateCircle } from './generator'
import { hashString, mulberry32, prngUuid, seededRng } from './prng'

// ─── PRNG ─────────────────────────────────────────────────────────────────────

describe('hashString', () => {
  it('is deterministic for the same input', () => {
    expect(hashString('magic-circle')).toBe(hashString('magic-circle'))
  })

  it('produces different values for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'))
  })

  it('returns a non-negative uint32', () => {
    const h = hashString('test')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(0xffffffff)
    expect(Number.isInteger(h)).toBe(true)
  })

  it('handles empty string without error', () => {
    expect(() => hashString('')).not.toThrow()
    expect(hashString('')).toBe(0)
  })
})

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('same seed produces the same sequence', () => {
    const rng1 = mulberry32(123)
    const rng2 = mulberry32(123)
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('different seeds produce different sequences', () => {
    const rng1 = mulberry32(1)
    const rng2 = mulberry32(2)
    const seq1 = Array.from({ length: 10 }, () => rng1())
    const seq2 = Array.from({ length: 10 }, () => rng2())
    expect(seq1).not.toEqual(seq2)
  })
})

describe('seededRng', () => {
  it('produces values in [0, 1) for a string seed', () => {
    const rng = seededRng('hello')
    for (let i = 0; i < 50; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('same string seed → same sequence', () => {
    const rng1 = seededRng('seed-42')
    const rng2 = seededRng('seed-42')
    expect(Array.from({ length: 10 }, () => rng1())).toEqual(
      Array.from({ length: 10 }, () => rng2())
    )
  })
})

describe('prngUuid', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('produces a string matching the UUID v4 format', () => {
    const rng = seededRng('test')
    expect(prngUuid(rng)).toMatch(UUID_RE)
  })

  it('version nibble is always 4', () => {
    const rng = seededRng('version-test')
    for (let i = 0; i < 10; i++) {
      const uuid = prngUuid(rng)
      expect(uuid[14]).toBe('4')
    }
  })

  it('variant nibble is always 8, 9, a, or b', () => {
    const rng = seededRng('variant-test')
    for (let i = 0; i < 20; i++) {
      const uuid = prngUuid(rng)
      expect(['8', '9', 'a', 'b']).toContain(uuid[19])
    }
  })

  it('two consecutive calls produce different UUIDs', () => {
    const rng = seededRng('dup-test')
    expect(prngUuid(rng)).not.toBe(prngUuid(rng))
  })
})

// ─── Generator ────────────────────────────────────────────────────────────────

const SEED = 'test-seed-42'

describe('generateCircle — determinism (ROADMAP required)', () => {
  it('same seed + params produces identical Layer[] on two calls', () => {
    const a = generateCircle(DEFAULT_PARAMS, SEED)
    const b = generateCircle(DEFAULT_PARAMS, SEED)
    expect(a).toEqual(b)
  })

  it('different seeds produce different outputs', () => {
    const a = generateCircle(DEFAULT_PARAMS, 'seed-A')
    const b = generateCircle(DEFAULT_PARAMS, 'seed-B')
    expect(a).not.toEqual(b)
  })

  it('same seed + different params produce different outputs', () => {
    const a = generateCircle(DEFAULT_PARAMS, SEED)
    const b = generateCircle({ ...DEFAULT_PARAMS, ringCount: 5 }, SEED)
    expect(a).not.toEqual(b)
  })
})

describe('generateCircle — Zod schema validation (ROADMAP required)', () => {
  it('all generated layers pass LayerSchema.parse()', () => {
    const layers = generateCircle(DEFAULT_PARAMS, SEED)
    expect(layers.length).toBeGreaterThan(0)
    for (const layer of layers) {
      expect(() => LayerSchema.parse(layer)).not.toThrow()
    }
  })

  it('generated layers pass schema for 0 rings + 2 radial groups', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 0, radialGroupCount: 2 }, SEED)
    for (const layer of layers) {
      expect(() => LayerSchema.parse(layer)).not.toThrow()
    }
  })

  it('generated radial-lines layers always satisfy innerRadius < outerRadius', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 0, radialGroupCount: 5 }, SEED)
    for (const layer of layers) {
      if (layer.type === 'radial-lines') {
        expect(layer.innerRadius).toBeLessThan(layer.outerRadius)
      }
    }
  })
})

describe('generateCircle — layer counts', () => {
  it('ringCount param controls number of ring layers', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 4, radialGroupCount: 0 }, SEED)
    const rings = layers.filter((l) => l.type === 'ring')
    expect(rings).toHaveLength(4)
  })

  it('radialGroupCount controls number of radial-lines layers', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 0, radialGroupCount: 3 }, SEED)
    const radials = layers.filter((l) => l.type === 'radial-lines')
    expect(radials).toHaveLength(3)
  })

  it('ringCount=0 produces no ring layers', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 0 }, SEED)
    expect(layers.filter((l) => l.type === 'ring')).toHaveLength(0)
  })

  it('radialGroupCount=0 produces no radial-lines layers', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, radialGroupCount: 0 }, SEED)
    expect(layers.filter((l) => l.type === 'radial-lines')).toHaveLength(0)
  })

  it('both counts 0 returns empty array', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 0, radialGroupCount: 0 }, SEED)
    expect(layers).toHaveLength(0)
  })

  it('total layer count equals ringCount + radialGroupCount', () => {
    const params = { ...DEFAULT_PARAMS, ringCount: 3, radialGroupCount: 2 }
    const layers = generateCircle(params, SEED)
    expect(layers).toHaveLength(5)
  })
})

describe('generateCircle — layer properties', () => {
  it('all generated layer IDs are unique', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 5, radialGroupCount: 3 }, SEED)
    const ids = layers.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all generated layer IDs are valid UUIDs', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    const layers = generateCircle(DEFAULT_PARAMS, SEED)
    for (const layer of layers) {
      expect(layer.id).toMatch(UUID_RE)
    }
  })

  it('generated ring radii are positive and within canvas bounds', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 6, radialGroupCount: 0 }, SEED)
    for (const layer of layers) {
      if (layer.type === 'ring') {
        expect(layer.radius).toBeGreaterThan(0)
        expect(layer.radius).toBeLessThanOrEqual(440)
      }
    }
  })

  it('colorPalette colors appear in generated layers', () => {
    const palette = ['#ff0000', '#00ff00', '#0000ff']
    const layers = generateCircle({ ...DEFAULT_PARAMS, colorPalette: palette }, SEED)
    for (const layer of layers) {
      expect(palette).toContain(layer.color)
    }
  })

  it('single-color palette means all layers use that color', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, colorPalette: ['#aabbcc'] }, SEED)
    for (const layer of layers) {
      expect(layer.color).toBe('#aabbcc')
    }
  })

  it('empty palette falls back to white (#ffffff)', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, colorPalette: [] }, SEED)
    for (const layer of layers) {
      expect(layer.color).toBe('#ffffff')
    }
  })

  it('all generated layers are visible and unlocked', () => {
    const layers = generateCircle(DEFAULT_PARAMS, SEED)
    for (const layer of layers) {
      expect(layer.visible).toBe(true)
      expect(layer.locked).toBe(false)
    }
  })
})

describe('generateCircle — complexity', () => {
  it('low complexity sets opacity=1 for all layers', () => {
    const layers = generateCircle(
      { ...DEFAULT_PARAMS, complexity: 'low', ringCount: 5, radialGroupCount: 2 },
      SEED
    )
    for (const layer of layers) {
      expect(layer.opacity).toBe(1)
    }
  })

  it('low complexity sets transform position to 0,0 for all layers', () => {
    const layers = generateCircle(
      { ...DEFAULT_PARAMS, complexity: 'low', ringCount: 5, radialGroupCount: 0 },
      SEED
    )
    for (const layer of layers) {
      expect(layer.transform.x).toBe(0)
      expect(layer.transform.y).toBe(0)
    }
  })

  it('high complexity may produce opacity < 1', () => {
    const layers = generateCircle(
      { ...DEFAULT_PARAMS, complexity: 'high', ringCount: 10, radialGroupCount: 5 },
      SEED
    )
    const hasOpacity = layers.some((l) => l.opacity < 1)
    expect(hasOpacity).toBe(true)
  })

  it('same seed produces different output for low vs high complexity', () => {
    const low = generateCircle({ ...DEFAULT_PARAMS, complexity: 'low' }, SEED)
    const high = generateCircle({ ...DEFAULT_PARAMS, complexity: 'high' }, SEED)
    expect(low).not.toEqual(high)
  })
})

describe('generateCircle — layer naming', () => {
  it('ring layers are named "Ring 1", "Ring 2", etc.', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 3, radialGroupCount: 0 }, SEED)
    expect(layers[0].name).toBe('Ring 1')
    expect(layers[1].name).toBe('Ring 2')
    expect(layers[2].name).toBe('Ring 3')
  })

  it('radial-lines layers are named "Radial Lines 1", "Radial Lines 2", etc.', () => {
    const layers = generateCircle({ ...DEFAULT_PARAMS, ringCount: 0, radialGroupCount: 2 }, SEED)
    expect(layers[0].name).toBe('Radial Lines 1')
    expect(layers[1].name).toBe('Radial Lines 2')
  })
})

describe('generateCircle — default params', () => {
  it('DEFAULT_PARAMS generates a valid non-empty output', () => {
    const layers = generateCircle(DEFAULT_PARAMS, SEED)
    expect(layers.length).toBeGreaterThan(0)
    for (const layer of layers) {
      expect(() => LayerSchema.parse(layer)).not.toThrow()
    }
  })
})
