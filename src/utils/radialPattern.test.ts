import { describe, expect, it } from 'vitest'
import { computeRadialLines } from './geometry'
import { createDefaultProject, createRadialLinesLayer } from './factories'
import { parseProjectFileStrict } from '../schema/project'
import { buildExportSvgString } from './export'

describe('radial patterns', () => {
  it('includes both endpoints of a partial arc without duplicating full-circle endpoints', () => {
    const fan = computeRadialLines(createRadialLinesLayer({ count: 3, sweepAngle: 180 }))
    expect(fan[0].y2).toBe(-350)
    expect(fan[2].y2).toBe(350)
    expect(computeRadialLines(createRadialLinesLayer({ count: 1, sweepAngle: 120 }))[0].y2).toBe(
      -350
    )
    const circle = computeRadialLines(createRadialLinesLayer({ count: 4 }))
    expect(circle[3].x2).toBeCloseTo(-350)
  })
  it('tilts outer endpoints while preserving inner anchors', () => {
    const [line] = computeRadialLines(createRadialLinesLayer({ count: 1, twistAngle: 90 }))
    expect(line.x1).toBe(0)
    expect(line.y1).toBe(-200)
    expect(line.x2).toBeCloseTo(350)
    expect(line.y2).toBeCloseTo(0)
  })
  it('shortens minor marks from the inner end even with tilt', () => {
    const layer = createRadialLinesLayer({
      count: 6,
      twistAngle: 30,
      majorEvery: 3,
      minorLength: 0.4,
    })
    const lines = computeRadialLines(layer)
    const length = (i: number) => Math.hypot(lines[i].x2 - lines[i].x1, lines[i].y2 - lines[i].y1)
    expect(length(1) / length(0)).toBeCloseTo(0.4)
    expect(length(3)).toBeCloseTo(length(0))
    expect(Math.hypot(lines[1].x2, lines[1].y2)).toBeCloseTo(layer.outerRadius)
  })
  it('preserves controls through save/load and exports identical line endpoints and caps', () => {
    const layer = createRadialLinesLayer({
      sweepAngle: 120,
      twistAngle: -25,
      majorEvery: 2,
      minorLength: 0.3,
      lineCap: 'butt',
    })
    const project = { ...createDefaultProject(), layers: [layer] }
    const restored = parseProjectFileStrict(JSON.parse(JSON.stringify(project)))
    expect(restored.ok && restored.project).toEqual(project)
    const svg = buildExportSvgString(project, {
      widthPx: 512,
      heightPx: 512,
      backgroundColor: null,
      marginPercent: 0,
      selectedLayerId: null,
    })
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const elements = [...doc.querySelectorAll('line')]
    expect(elements).toHaveLength(layer.count)
    computeRadialLines(layer).forEach((line, i) => {
      for (const [key, value] of Object.entries(line))
        expect(Number(elements[i].getAttribute(key))).toBeCloseTo(value)
      expect(elements[i].getAttribute('stroke-linecap')).toBe('butt')
    })
  })
  it.each([{ sweepAngle: 0 }, { twistAngle: Infinity }, { majorEvery: 1.5 }, { minorLength: 0 }])(
    'rejects invalid settings %j',
    (patch) => {
      expect(
        parseProjectFileStrict({
          ...createDefaultProject(),
          layers: [createRadialLinesLayer(patch)],
        }).ok
      ).toBe(false)
    }
  )
})
