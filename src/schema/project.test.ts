import { describe, expect, it } from 'vitest'
import { parseProjectFile, ProjectFileSchema, LayerSchema } from './project'

// ─── Fixture: minimal valid project ──────────────────────────────────────────

const VALID_PROJECT = {
  __magic_circle__: true,
  version: '1.0.0',
  meta: {
    title: 'Example Magic Circle',
    created: '2026-08-31T00:00:00.000Z',
    modified: '2026-08-31T00:00:00.000Z',
  },
  canvas: { width: 1000, height: 1000 },
  layers: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      type: 'ring',
      name: 'Outer Ring',
      visible: true,
      locked: false,
      opacity: 1.0,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      radius: 400,
      strokeWidth: 4,
      color: '#ffffff',
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      type: 'radial-lines',
      name: 'Rune Lines',
      visible: true,
      locked: false,
      opacity: 0.85,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      count: 12,
      innerRadius: 300,
      outerRadius: 390,
      startAngle: 0,
      strokeWidth: 2,
      color: '#88aaff',
    },
  ],
}

// ─── ProjectFileSchema — direct Zod tests ─────────────────────────────────────

describe('ProjectFileSchema', () => {
  it('parses the complete PROJECT_FORMAT.md example', () => {
    const result = ProjectFileSchema.safeParse(VALID_PROJECT)
    expect(result.success).toBe(true)
  })

  it('rejects when __magic_circle__ is missing', () => {
    const { version, meta, canvas, layers } = VALID_PROJECT
    const result = ProjectFileSchema.safeParse({ version, meta, canvas, layers })
    expect(result.success).toBe(false)
  })

  it('rejects when __magic_circle__ is false', () => {
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, __magic_circle__: false })
    expect(result.success).toBe(false)
  })

  it('rejects when version is missing', () => {
    const { __magic_circle__, meta, canvas, layers } = VALID_PROJECT
    const result = ProjectFileSchema.safeParse({ __magic_circle__, meta, canvas, layers })
    expect(result.success).toBe(false)
  })

  it('rejects malformed version strings', () => {
    for (const bad of ['1', '1.0', 'v1.0.0', 'abc']) {
      expect(ProjectFileSchema.safeParse({ ...VALID_PROJECT, version: bad }).success).toBe(false)
    }
  })

  it('rejects NaN in a numeric field', () => {
    const layer = { ...VALID_PROJECT.layers[0], radius: NaN }
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, layers: [layer] })
    expect(result.success).toBe(false)
  })

  it('rejects Infinity in a numeric field', () => {
    const layer = { ...VALID_PROJECT.layers[0], radius: Infinity }
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, layers: [layer] })
    expect(result.success).toBe(false)
  })

  it('rejects opacity out of range', () => {
    const layer = { ...VALID_PROJECT.layers[0], opacity: 1.5 }
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, layers: [layer] })
    expect(result.success).toBe(false)
  })

  it('rejects empty layer name', () => {
    const layer = { ...VALID_PROJECT.layers[0], name: '' }
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, layers: [layer] })
    expect(result.success).toBe(false)
  })

  it('rejects count < 1 on a radial-lines layer', () => {
    const layer = { ...VALID_PROJECT.layers[1], count: 0 }
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, layers: [layer] })
    expect(result.success).toBe(false)
  })

  it('accepts an empty layers array', () => {
    const result = ProjectFileSchema.safeParse({ ...VALID_PROJECT, layers: [] })
    expect(result.success).toBe(true)
  })
})

// ─── LayerSchema ──────────────────────────────────────────────────────────────

describe('LayerSchema', () => {
  it('accepts a valid ring layer', () => {
    expect(LayerSchema.safeParse(VALID_PROJECT.layers[0]).success).toBe(true)
  })

  it('accepts a valid radial-lines layer', () => {
    expect(LayerSchema.safeParse(VALID_PROJECT.layers[1]).success).toBe(true)
  })

  it('rejects an unknown layer type', () => {
    expect(LayerSchema.safeParse({ ...VALID_PROJECT.layers[0], type: 'polygon' }).success).toBe(
      false
    )
  })
})

// ─── parseProjectFile — import pipeline tests ─────────────────────────────────

describe('parseProjectFile', () => {
  it('returns ok:true for a complete valid project', () => {
    const result = parseProjectFile(structuredClone(VALID_PROJECT))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.project.__magic_circle__).toBe(true)
      expect(result.project.layers).toHaveLength(2)
      expect(result.warnings).toHaveLength(0)
    }
  })

  it('returns ok:false when __magic_circle__ is missing', () => {
    const { version, meta, canvas, layers } = VALID_PROJECT
    const result = parseProjectFile({ version, meta, canvas, layers })
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when __magic_circle__ is not true', () => {
    const result = parseProjectFile({ ...VALID_PROJECT, __magic_circle__: 'yes' })
    expect(result.ok).toBe(false)
  })

  it('returns ok:false for a non-object input', () => {
    expect(parseProjectFile('not an object').ok).toBe(false)
    expect(parseProjectFile(null).ok).toBe(false)
    expect(parseProjectFile(42).ok).toBe(false)
  })

  it('returns ok:false when version is a different major', () => {
    const result = parseProjectFile({ ...VALID_PROJECT, version: '2.0.0' })
    expect(result.ok).toBe(false)
  })

  it('returns ok:true with a warning for a newer minor version', () => {
    const result = parseProjectFile(
      structuredClone({ ...VALID_PROJECT, version: '1.99.0', layers: [] })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warnings.some((w) => w.includes('newer version'))).toBe(true)
    }
  })

  it('returns ok:false when innerRadius >= outerRadius', () => {
    const badLayer = { ...VALID_PROJECT.layers[1], innerRadius: 390, outerRadius: 300 }
    const result = parseProjectFile({ ...VALID_PROJECT, layers: [badLayer] })
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when innerRadius === outerRadius', () => {
    const badLayer = { ...VALID_PROJECT.layers[1], innerRadius: 300, outerRadius: 300 }
    const result = parseProjectFile({ ...VALID_PROJECT, layers: [badLayer] })
    expect(result.ok).toBe(false)
  })

  it('returns ok:true when innerRadius < outerRadius', () => {
    const goodLayer = { ...VALID_PROJECT.layers[1], innerRadius: 100, outerRadius: 200 }
    const result = parseProjectFile({ ...VALID_PROJECT, layers: [goodLayer] })
    expect(result.ok).toBe(true)
  })

  it('filters unknown layer types and adds a warning', () => {
    const unknownLayer = {
      ...VALID_PROJECT.layers[0],
      id: 'aaaaaaaa-0000-4000-a000-000000000001',
      type: 'polygon',
    }
    const project = { ...VALID_PROJECT, layers: [...VALID_PROJECT.layers, unknownLayer] }
    const result = parseProjectFile(project)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.project.layers).toHaveLength(2)
      expect(result.warnings.some((w) => w.includes('polygon'))).toBe(true)
    }
  })

  it('returns ok:false for duplicate layer IDs', () => {
    const dup = { ...VALID_PROJECT.layers[0] }
    const result = parseProjectFile({ ...VALID_PROJECT, layers: [VALID_PROJECT.layers[0], dup] })
    expect(result.ok).toBe(false)
  })

  it('serialization round-trip: serialized valid project re-parses as ok:true', () => {
    const firstResult = parseProjectFile(structuredClone(VALID_PROJECT))
    expect(firstResult.ok).toBe(true)
    if (!firstResult.ok) return
    const serialized = JSON.stringify(firstResult.project)
    const secondResult = parseProjectFile(JSON.parse(serialized))
    expect(secondResult.ok).toBe(true)
  })
})
