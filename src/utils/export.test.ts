import { describe, expect, it } from 'vitest'
import { createDefaultProject, createRadialLinesLayer, createRingLayer } from './factories'
import { buildExportSvgString, validateResolution } from './export'
import type { ExportOptions } from './export'
import type { ProjectFile } from '../types/project'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_OPTIONS: ExportOptions = {
  widthPx: 1024,
  heightPx: 1024,
  backgroundColor: null,
  marginPercent: 0,
  selectedLayerId: null,
}

function makeProject(layers = {}): ProjectFile {
  const base = createDefaultProject()
  return { ...base, ...layers }
}

// Parses the SVG string using browser DOMParser so we can query structure.
function parseSvg(svg: string): Document {
  return new DOMParser().parseFromString(svg, 'image/svg+xml')
}

// Returns children of the root <g> (artwork group) as an array.
function artworkGroupChildren(svg: string): Element[] {
  const doc = parseSvg(svg)
  const g = doc.querySelector('svg > g')
  return g ? Array.from(g.children) : []
}

// ─── validateResolution ───────────────────────────────────────────────────────

describe('validateResolution', () => {
  it('accepts 512', () => expect(validateResolution(512)).toBeNull())
  it('accepts 1024', () => expect(validateResolution(1024)).toBeNull())
  it('accepts 4096', () => expect(validateResolution(4096)).toBeNull())
  it('accepts 1 (minimum)', () => expect(validateResolution(1)).toBeNull())

  it('rejects 0', () => expect(validateResolution(0)).not.toBeNull())
  it('rejects negative', () => expect(validateResolution(-1)).not.toBeNull())
  it('rejects 4097 (above cap)', () => expect(validateResolution(4097)).not.toBeNull())
  it('rejects NaN', () => expect(validateResolution(NaN)).not.toBeNull())
  it('rejects decimal 1.5', () => expect(validateResolution(1.5)).not.toBeNull())
  it('rejects string "512"', () => expect(validateResolution('512')).not.toBeNull())
  it('rejects undefined', () => expect(validateResolution(undefined)).not.toBeNull())
})

// ─── ROADMAP required test 1: Ring layer → <circle> with correct attributes ───

describe('buildExportSvgString — Ring layer', () => {
  it('produces an SVG containing <circle>', () => {
    const ring = createRingLayer({ radius: 300, strokeWidth: 4, color: '#ffffff' })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('<circle')
  })

  it('circle has the correct radius', () => {
    const ring = createRingLayer({ radius: 250 })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('r="250"')
  })

  it('circle has the correct stroke color', () => {
    const ring = createRingLayer({ color: '#ff4488' })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('stroke="#ff4488"')
  })

  it('circle has the correct stroke-width', () => {
    const ring = createRingLayer({ strokeWidth: 8 })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('stroke-width="8"')
  })

  it('circle has fill=none', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('fill="none"')
  })

  it('does NOT contain editor-only attributes', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).not.toContain('data-testid')
    expect(svg).not.toContain('data-layer-id')
    expect(svg).not.toContain('pointerEvents')
    expect(svg).not.toContain('visibleStroke')
  })

  it('does NOT contain transparent hit-area circles', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    // Hit-area circles use "transparent" stroke — export must not have any
    expect(svg).not.toContain('"transparent"')
  })

  it('has correct SVG xmlns', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('has width and height matching options', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, widthPx: 2048, heightPx: 2048 })
    expect(svg).toContain('width="2048"')
    expect(svg).toContain('height="2048"')
  })
})

// ─── ROADMAP required test 2: Hidden layer excluded ───────────────────────────

describe('buildExportSvgString — hidden layer', () => {
  it('excludes hidden ring layers', () => {
    const ring = createRingLayer({ visible: false })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).not.toContain('<circle')
  })

  it('renders visible layers and skips hidden ones', () => {
    const visible = createRingLayer({ visible: true, radius: 400 })
    const hidden = createRingLayer({ visible: false, radius: 100 })
    const project = { ...makeProject(), layers: [visible, hidden] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('r="400"')
    expect(svg).not.toContain('r="100"')
  })
})

// ─── ROADMAP required test 3: Background color → <rect> is first in root <g> ──

describe('buildExportSvgString — background', () => {
  it('with background color, first child of artwork group is <rect>', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, backgroundColor: '#000000' })
    const children = artworkGroupChildren(svg)
    expect(children.length).toBeGreaterThan(0)
    expect(children[0].tagName.toLowerCase()).toBe('rect')
  })

  it('background rect has the correct fill color', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, backgroundColor: '#1a2b3c' })
    expect(svg).toContain('fill="#1a2b3c"')
  })

  it('transparent background produces NO <rect> in artwork group', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, backgroundColor: null })
    const children = artworkGroupChildren(svg)
    const hasRect = children.some((c) => c.tagName.toLowerCase() === 'rect')
    expect(hasRect).toBe(false)
  })

  it('background rect covers the full viewBox', () => {
    const project = { ...makeProject(), layers: [] }
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, backgroundColor: '#ff0000' })
    // Default viewBox for 1000x1000 canvas with no margin: -500 -500 1000 1000
    expect(svg).toContain('x="-500"')
    expect(svg).toContain('y="-500"')
    expect(svg).toContain('width="1000"')
    expect(svg).toContain('height="1000"')
  })
})

// ─── Radial Lines export ──────────────────────────────────────────────────────

describe('buildExportSvgString — Radial Lines layer', () => {
  it('produces <line> elements for a radial-lines layer', () => {
    const rl = createRadialLinesLayer({ count: 4 })
    const project = { ...makeProject(), layers: [rl] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    const doc = parseSvg(svg)
    const lines = doc.querySelectorAll('line')
    expect(lines.length).toBe(4)
  })

  it('line count matches layer count', () => {
    const rl = createRadialLinesLayer({ count: 12 })
    const project = { ...makeProject(), layers: [rl] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    const doc = parseSvg(svg)
    expect(doc.querySelectorAll('line').length).toBe(12)
  })

  it('lines have correct stroke color', () => {
    const rl = createRadialLinesLayer({ color: '#aabbcc' })
    const project = { ...makeProject(), layers: [rl] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('stroke="#aabbcc"')
  })

  it('lines have stroke-linecap=round', () => {
    const rl = createRadialLinesLayer()
    const project = { ...makeProject(), layers: [rl] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('stroke-linecap="round"')
  })

  it('does NOT contain transparent hit-area lines', () => {
    const rl = createRadialLinesLayer()
    const project = { ...makeProject(), layers: [rl] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).not.toContain('"transparent"')
  })

  it('hidden radial-lines layer produces no lines', () => {
    const rl = createRadialLinesLayer({ visible: false })
    const project = { ...makeProject(), layers: [rl] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).not.toContain('<line')
  })
})

// ─── Transform and opacity ────────────────────────────────────────────────────

describe('buildExportSvgString — transform and opacity', () => {
  it('applies layer transform to the wrapping <g>', () => {
    const ring = createRingLayer({
      transform: { x: 50, y: -20, rotation: 45, scaleX: 2, scaleY: 2 },
    })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('translate(50, -20) rotate(45) scale(2, 2)')
  })

  it('applies layer opacity to the wrapping <g>', () => {
    const ring = createRingLayer({ opacity: 0.5 })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('opacity="0.5"')
  })
})

// ─── Layer stacking order ─────────────────────────────────────────────────────

describe('buildExportSvgString — layer order', () => {
  it('renders layers in array order (bottom to top)', () => {
    const bottom = createRingLayer({ radius: 400, color: '#ff0000' })
    const top = createRingLayer({ radius: 200, color: '#0000ff' })
    const project = { ...makeProject(), layers: [bottom, top] }
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    // The bottom layer's color should appear before the top layer's color
    const idxBottom = svg.indexOf('#ff0000')
    const idxTop = svg.indexOf('#0000ff')
    expect(idxBottom).toBeLessThan(idxTop)
  })
})

// ─── Selected-layer-only export ───────────────────────────────────────────────

describe('buildExportSvgString — selected layer only', () => {
  it('exports only the selected layer', () => {
    const ringA = createRingLayer({ radius: 400, color: '#ff0000' })
    const ringB = createRingLayer({ radius: 200, color: '#0000ff' })
    const project = { ...makeProject(), layers: [ringA, ringB] }
    const svg = buildExportSvgString(project, {
      ...BASE_OPTIONS,
      selectedLayerId: ringA.id,
    })
    expect(svg).toContain('#ff0000')
    expect(svg).not.toContain('#0000ff')
  })

  it('selected hidden layer is not exported', () => {
    const ring = createRingLayer({ visible: false, radius: 300 })
    const project = { ...makeProject(), layers: [ring] }
    const svg = buildExportSvgString(project, {
      ...BASE_OPTIONS,
      selectedLayerId: ring.id,
    })
    expect(svg).not.toContain('<circle')
  })

  it('null selectedLayerId exports all visible layers', () => {
    const ringA = createRingLayer({ radius: 400, color: '#ff0000' })
    const ringB = createRingLayer({ radius: 200, color: '#0000ff' })
    const project = { ...makeProject(), layers: [ringA, ringB] }
    const svg = buildExportSvgString(project, {
      ...BASE_OPTIONS,
      selectedLayerId: null,
    })
    expect(svg).toContain('#ff0000')
    expect(svg).toContain('#0000ff')
  })
})

// ─── Margin ───────────────────────────────────────────────────────────────────

describe('buildExportSvgString — margin', () => {
  it('zero margin produces viewBox -500 -500 1000 1000 for 1000x1000 canvas', () => {
    const project = makeProject()
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, marginPercent: 0 })
    expect(svg).toContain('viewBox="-500 -500 1000 1000"')
  })

  it('10% margin expands viewBox symmetrically', () => {
    const project = makeProject()
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, marginPercent: 10 })
    // 10% of 1000 = 100 units margin on each side
    // vx = -(500 + 100) = -600, vy = -600, vw = 1000 + 200 = 1200, vh = 1200
    expect(svg).toContain('viewBox="-600 -600 1200 1200"')
  })

  it('50% margin produces correct viewBox', () => {
    const project = makeProject()
    const svg = buildExportSvgString(project, { ...BASE_OPTIONS, marginPercent: 50 })
    // 50% of 1000 = 500 units margin on each side
    // vx = -1000, vw = 2000
    expect(svg).toContain('viewBox="-1000 -1000 2000 2000"')
  })
})

// ─── Immutability — does not mutate project input ─────────────────────────────

describe('buildExportSvgString — immutability', () => {
  it('does not mutate the project object', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const layersBefore = project.layers
    const ringRadiusBefore = project.layers[0].radius as number

    buildExportSvgString(project, { ...BASE_OPTIONS, backgroundColor: '#000000' })

    expect(project.layers).toBe(layersBefore)
    expect(project.layers[0].radius).toBe(ringRadiusBefore)
  })

  it('does not mutate the options object', () => {
    const ring = createRingLayer()
    const project = { ...makeProject(), layers: [ring] }
    const opts: ExportOptions = { ...BASE_OPTIONS, marginPercent: 10 }
    const marginBefore = opts.marginPercent

    buildExportSvgString(project, opts)

    expect(opts.marginPercent).toBe(marginBefore)
  })
})

// ─── Empty project ────────────────────────────────────────────────────────────

describe('buildExportSvgString — empty project', () => {
  it('produces valid SVG even with no layers', () => {
    const project = makeProject()
    const svg = buildExportSvgString(project, BASE_OPTIONS)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })
})
