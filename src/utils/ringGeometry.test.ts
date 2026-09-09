import { describe, expect, it } from 'vitest'
import { computeRingShapes } from './ringGeometry'
import { createDefaultProject, createRingLayer } from './factories'
import { parseProjectFileStrict } from '../schema/project'
import { buildExportSvgString } from './export'

describe('decorated rings', () => {
  it('keeps legacy rings unchanged', () => {
    expect(computeRingShapes(createRingLayer({ radius: 100 }))).toEqual([
      { kind: 'circle', radius: 100, width: 4 },
    ])
  })
  it('fits concentric rings inside even a small radius', () => {
    const shapes = computeRingShapes(
      createRingLayer({ radius: 5, style: 'concentric', ringCount: 20, spacing: 100 })
    )
    expect(shapes).toHaveLength(20)
    expect(shapes.every((s) => s.kind === 'circle' && s.radius > 0 && s.radius <= 5)).toBe(true)
  })
  it('creates a band with the requested number of separators', () => {
    const shapes = computeRingShapes(createRingLayer({ style: 'divided', divisions: 12 }))
    expect(shapes).toHaveLength(3)
    const path = shapes[2]
    expect(path.kind === 'path' && path.d.match(/M /g)?.length).toBe(12)
  })
  it('draws partial arcs and closes full circles without a seam', () => {
    const arc = computeRingShapes(createRingLayer({ style: 'arc', sweepAngle: 270 }))[0]
    expect(arc.kind === 'path' && arc.d).toContain('A 300 300 0 1 1')
    expect(computeRingShapes(createRingLayer({ style: 'arc', sweepAngle: 360 }))[0].kind).toBe(
      'circle'
    )
  })
  it.each(['simple', 'concentric', 'divided', 'arc'] as const)(
    'preserves %s through project serialization and export',
    (style) => {
      const project = createDefaultProject()
      project.layers = [
        createRingLayer({
          style,
          divisions: 24,
          ringCount: 4,
          spacing: 10,
          bandWidth: 15,
          dividerWidth: 1,
          startAngle: 30,
          sweepAngle: 180,
        }),
      ]
      const result = parseProjectFileStrict(JSON.parse(JSON.stringify(project)))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.project).toEqual(project)
      const svg = buildExportSvgString(result.project, {
        widthPx: 512,
        heightPx: 512,
        backgroundColor: null,
        marginPercent: 0,
        selectedLayerId: null,
      })
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      expect(doc.querySelector('parsererror')).toBeNull()
      expect(doc.querySelectorAll('circle, path')).toHaveLength(
        computeRingShapes(project.layers[0] as ReturnType<typeof createRingLayer>).length
      )
      expect(svg).not.toContain('transparent')
    }
  )
  it('rejects invalid decoration counts', () => {
    const project = createDefaultProject()
    project.layers = [createRingLayer({ style: 'divided', divisions: 1.5 })]
    expect(parseProjectFileStrict(project).ok).toBe(false)
  })
})
