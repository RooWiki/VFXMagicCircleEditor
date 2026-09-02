import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRef } from 'react'
import { useEditorStore } from '../../store/editor'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import { useViewportStore } from '../../store/viewport'
import { createDefaultProject, createRadialLinesLayer } from '../../utils/factories'
import RadialLinesLayerRenderer from './RadialLinesLayerRenderer'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useEditorStore.setState({ activeTool: 'select', selectedLayerIds: [] })
  useProjectStore.setState({ project: createDefaultProject() })
  useHistoryStore.setState({ snapshots: [], pointer: -1, pendingEditSnapshot: null })
  // Provide a real viewport so screenToWorld produces non-zero world positions.
  useViewportStore.setState({
    zoom: 1,
    centerX: 0,
    centerY: 0,
    viewportWidth: 800,
    viewportHeight: 600,
  })
})

function RadialLinesRendererWrapper({
  layer,
  spaceHeld = false,
}: {
  layer: ReturnType<typeof createRadialLinesLayer>
  spaceHeld?: boolean
}) {
  const spaceRef = useRef(spaceHeld)
  spaceRef.current = spaceHeld
  const svgRef = useRef<SVGSVGElement | null>(null)
  return (
    <svg ref={svgRef}>
      <RadialLinesLayerRenderer layer={layer} spaceHeldRef={spaceRef} svgRef={svgRef} />
    </svg>
  )
}

function renderRL(overrides: Parameters<typeof createRadialLinesLayer>[0] = {}, spaceHeld = false) {
  const layer = createRadialLinesLayer(overrides)
  render(<RadialLinesRendererWrapper layer={layer} spaceHeld={spaceHeld} />)
  return layer
}

// Helpers to dispatch pointer events on the group element
function pointerDown(el: Element, opts: PointerEventInit = {}) {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, ...opts })
  )
}
function pointerMove(el: Element, opts: PointerEventInit = {}) {
  el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, ...opts }))
}
function pointerUp(el: Element, opts: PointerEventInit = {}) {
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, ...opts }))
}

describe('RadialLinesLayerRenderer — basic rendering', () => {
  it('renders at least count visible line elements', () => {
    renderRL({ count: 4 })
    const lines = document.querySelectorAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(4)
  })

  it('renders exactly 2×count line elements (visible + hit targets)', () => {
    renderRL({ count: 6, innerRadius: 100, outerRadius: 200 })
    const lines = document.querySelectorAll('line')
    // 6 visible lines + 6 transparent hit-target lines
    expect(lines.length).toBe(12)
  })

  it('renders with the correct stroke color on visible lines', () => {
    renderRL({ color: '#ff0000', count: 1 })
    const line = document.querySelector('line')
    expect(line?.getAttribute('stroke')).toBe('#ff0000')
  })

  it('renders with the correct stroke width on visible lines', () => {
    renderRL({ strokeWidth: 5, count: 1 })
    const line = document.querySelector('line')
    expect(line?.getAttribute('stroke-width')).toBe('5')
  })
})

describe('RadialLinesLayerRenderer — hit-target geometry', () => {
  it('transparent hit-target lines have pointerEvents=visibleStroke', () => {
    const layer = createRadialLinesLayer({ count: 4 })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const lines = document.querySelectorAll('line')
    // Second half of lines are the hit targets
    const hitLines = Array.from(lines).slice(4)
    hitLines.forEach((l) => {
      expect(l.style.pointerEvents).toBe('visibleStroke')
    })
  })

  it('hit-target lines share the same x1/y1/x2/y2 as their visible counterparts', () => {
    const layer = createRadialLinesLayer({ count: 3 })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const lines = Array.from(document.querySelectorAll('line'))
    for (let i = 0; i < 3; i++) {
      const visible = lines[i]
      const hit = lines[i + 3]
      expect(hit?.getAttribute('x1')).toBe(visible?.getAttribute('x1'))
      expect(hit?.getAttribute('y1')).toBe(visible?.getAttribute('y1'))
      expect(hit?.getAttribute('x2')).toBe(visible?.getAttribute('x2'))
      expect(hit?.getAttribute('y2')).toBe(visible?.getAttribute('y2'))
    }
  })

  it('hit-target lines have stroke=transparent', () => {
    renderRL({ count: 2 })
    const lines = Array.from(document.querySelectorAll('line'))
    const hitLines = lines.slice(2)
    hitLines.forEach((l) => expect(l.getAttribute('stroke')).toBe('transparent'))
  })

  it('hit-target strokeWidth is at least 12 (forgiving click target)', () => {
    renderRL({ strokeWidth: 2, count: 1 })
    const lines = document.querySelectorAll('line')
    const hitLine = lines[1]
    expect(parseFloat(hitLine?.getAttribute('stroke-width') ?? '0')).toBeGreaterThanOrEqual(12)
  })

  it('hit-target strokeWidth equals layer strokeWidth when larger than 12', () => {
    renderRL({ strokeWidth: 20, count: 1 })
    const lines = document.querySelectorAll('line')
    const hitLine = lines[1]
    expect(parseFloat(hitLine?.getAttribute('stroke-width') ?? '0')).toBe(20)
  })

  it('does NOT render a transparent circle that captures the center region', () => {
    renderRL({ count: 8, innerRadius: 100, outerRadius: 300 })
    const circles = document.querySelectorAll('circle')
    // No circles should be present — hit area is per-line, not a disk
    expect(circles.length).toBe(0)
  })
})

describe('RadialLinesLayerRenderer — opacity', () => {
  it('applies opacity on the wrapping group', () => {
    const layer = createRadialLinesLayer({ opacity: 0.4 })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    expect(g.getAttribute('opacity')).toBe('0.4')
  })
})

describe('RadialLinesLayerRenderer — transform', () => {
  it('applies translate, rotate, scale in the correct order', () => {
    const layer = createRadialLinesLayer({
      transform: { x: 50, y: 25, rotation: 30, scaleX: 2, scaleY: 1.5 },
    })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    const t = g.getAttribute('transform') ?? ''
    expect(t).toContain('translate(50, 25)')
    expect(t).toContain('rotate(30)')
    expect(t).toContain('scale(2, 1.5)')
    expect(t.indexOf('translate')).toBeLessThan(t.indexOf('rotate'))
    expect(t.indexOf('rotate')).toBeLessThan(t.indexOf('scale'))
  })
})

describe('RadialLinesLayerRenderer — visibility', () => {
  it('renders nothing when layer is hidden', () => {
    const layer = createRadialLinesLayer({ visible: false })
    render(<RadialLinesRendererWrapper layer={layer} />)
    expect(screen.queryByTestId(`radial-lines-layer-${layer.id}`)).not.toBeInTheDocument()
  })

  it('renders the group when layer is visible', () => {
    const layer = createRadialLinesLayer({ visible: true })
    render(<RadialLinesRendererWrapper layer={layer} />)
    expect(screen.getByTestId(`radial-lines-layer-${layer.id}`)).toBeInTheDocument()
  })
})

describe('RadialLinesLayerRenderer — pointer events (selection)', () => {
  it('unlocked visible layer has pointer events enabled on the group', () => {
    const layer = createRadialLinesLayer({ locked: false })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    expect(g.style.pointerEvents).not.toBe('none')
  })

  it('locked layer has pointer-events none', () => {
    const layer = createRadialLinesLayer({ locked: true })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    expect(g.style.pointerEvents).toBe('none')
  })

  it('clicking unlocked layer selects it in editor store', () => {
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))

    expect(useEditorStore.getState().selectedLayerIds).toContain(layer.id)
  })

  it('clicking locked layer does not select it', () => {
    const layer = createRadialLinesLayer({ locked: true })
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))

    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('right-click does not select the layer', () => {
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 2 }))

    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('clicking with hand tool active does not select', () => {
    useEditorStore.setState({ activeTool: 'hand' })
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))

    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })
})

describe('RadialLinesLayerRenderer — data attributes', () => {
  it('sets data-layer-id on the group', () => {
    const layer = createRadialLinesLayer()
    render(<RadialLinesRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    expect(g.getAttribute('data-layer-id')).toBe(layer.id)
  })
})

describe('RadialLinesLayerRenderer — artwork move gesture', () => {
  it('drag on the artwork group moves the layer (transform changes)', () => {
    const layer = createRadialLinesLayer({
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).not.toBe(0)
    expect(updated?.transform.y).not.toBe(0)
  })

  it('drag pushes exactly one history snapshot', () => {
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    const pointerBefore = useHistoryStore.getState().pointer
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    expect(useHistoryStore.getState().pointer).toBe(pointerBefore + 1)
  })

  it('undo after artwork drag restores original position', () => {
    const layer = createRadialLinesLayer({
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    useHistoryStore.getState().undo()

    const restored = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(restored?.transform.x).toBe(0)
    expect(restored?.transform.y).toBe(0)
  })

  it('redo after undo restores dragged position', () => {
    const layer = createRadialLinesLayer({
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    const movedX =
      useProjectStore.getState().project.layers.find((l) => l.id === layer.id)?.transform.x ?? 0

    useHistoryStore.getState().undo()
    useHistoryStore.getState().redo()

    const redone = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(redone?.transform.x).toBe(movedX)
  })

  it('zero-distance drag creates no history entry', () => {
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    const pointerBefore = useHistoryStore.getState().pointer

    // pointerdown and pointerup at the same client position — no pointermove
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerUp(g, { clientX: 100, clientY: 100 })

    expect(useHistoryStore.getState().pointer).toBe(pointerBefore)
  })

  it('locked layer does not start a move gesture', () => {
    const layer = createRadialLinesLayer({ locked: true })
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    // locked layer has pointerEvents: none, so we dispatch directly
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBe(0)
    expect(updated?.transform.y).toBe(0)
  })

  it('right-click does not start a move gesture', () => {
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { button: 2, clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBe(0)
    expect(updated?.transform.y).toBe(0)
  })

  it('hand tool drag does not move the layer', () => {
    useEditorStore.setState({ activeTool: 'hand' })
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBe(0)
    expect(updated?.transform.y).toBe(0)
  })

  it('space-pan guard: space-held prevents move gesture from starting', () => {
    const layer = createRadialLinesLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RadialLinesRendererWrapper layer={layer} spaceHeld={true} />)

    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    pointerDown(g, { clientX: 100, clientY: 100 })
    pointerMove(g, { clientX: 200, clientY: 200 })
    pointerUp(g)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBe(0)
    expect(updated?.transform.y).toBe(0)
  })

  it('empty gap between lines does not add a background fill to the group', () => {
    // The <g> element must have no fill — only line children carry hit areas.
    // This ensures empty regions between lines pass pointer events through.
    const layer = createRadialLinesLayer({ count: 4 })
    render(<RadialLinesRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`radial-lines-layer-${layer.id}`)
    // <g> elements have no fill attribute in SVG (fills come from children)
    expect(g.tagName.toLowerCase()).toBe('g')
    // No <rect> or filled <circle> children that would create a large hit area
    const filledChildren = Array.from(g.children).filter(
      (el) =>
        el.tagName !== 'line' &&
        el.getAttribute('fill') !== 'none' &&
        el.getAttribute('fill') !== 'transparent'
    )
    expect(filledChildren).toHaveLength(0)
  })
})

describe('RadialLinesLayerRenderer — memoization', () => {
  it('is wrapped in React.memo (export has a .type property)', () => {
    expect(typeof (RadialLinesLayerRenderer as unknown as { type: unknown }).type).toBe('function')
  })
})
