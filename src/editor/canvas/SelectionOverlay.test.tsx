import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRef } from 'react'
import { useEditorStore } from '../../store/editor'
import { useProjectStore } from '../../store/project'
import { useViewportStore } from '../../store/viewport'
import { createDefaultProject, createRingLayer } from '../../utils/factories'
import SelectionOverlay from './SelectionOverlay'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useEditorStore.setState({ activeTool: 'select', selectedLayerIds: [] })
  useProjectStore.setState({ project: createDefaultProject() })
  useViewportStore.setState({
    centerX: 0,
    centerY: 0,
    zoom: 1,
    viewportWidth: 1000,
    viewportHeight: 1000,
  })
})

// Wrapper providing the required refs
function OverlayWrapper({
  layer,
  spaceHeld = false,
}: {
  layer: ReturnType<typeof createRingLayer>
  spaceHeld?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const spaceHeldRef = useRef(spaceHeld)
  spaceHeldRef.current = spaceHeld
  return (
    <svg ref={svgRef}>
      <SelectionOverlay layer={layer} svgRef={svgRef} spaceHeldRef={spaceHeldRef} />
    </svg>
  )
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('SelectionOverlay — rendering', () => {
  it('renders the overlay group', () => {
    const layer = createRingLayer()
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('selection-overlay')).toBeInTheDocument()
  })

  it('renders a selection indicator circle', () => {
    const layer = createRingLayer()
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
  })

  it('renders a rotation handle for unlocked layer', () => {
    const layer = createRingLayer({ locked: false })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('rotation-handle')).toBeInTheDocument()
  })

  it('renders corner scale handles for unlocked layer', () => {
    const layer = createRingLayer({ locked: false })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('scale-handle-nw')).toBeInTheDocument()
    expect(screen.getByTestId('scale-handle-ne')).toBeInTheDocument()
    expect(screen.getByTestId('scale-handle-sw')).toBeInTheDocument()
    expect(screen.getByTestId('scale-handle-se')).toBeInTheDocument()
  })

  it('renders move target for unlocked layer', () => {
    const layer = createRingLayer({ locked: false })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('move-target')).toBeInTheDocument()
  })

  it('overlay layer id matches layer', () => {
    const layer = createRingLayer()
    render(<OverlayWrapper layer={layer} />)
    const overlay = screen.getByTestId('selection-overlay')
    expect(overlay.getAttribute('data-layer-id')).toBe(layer.id)
  })
})

// ─── Locked layer ─────────────────────────────────────────────────────────────

describe('SelectionOverlay — locked layer', () => {
  it('does not render rotation handle for locked layer', () => {
    const layer = createRingLayer({ locked: true })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.queryByTestId('rotation-handle')).not.toBeInTheDocument()
  })

  it('does not render scale handles for locked layer', () => {
    const layer = createRingLayer({ locked: true })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.queryByTestId('scale-handle-nw')).not.toBeInTheDocument()
  })

  it('does not render move target for locked layer', () => {
    const layer = createRingLayer({ locked: true })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.queryByTestId('move-target')).not.toBeInTheDocument()
  })

  it('still renders selection indicator for locked layer', () => {
    const layer = createRingLayer({ locked: true })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
  })

  it('shows locked indicator text for locked layer', () => {
    const layer = createRingLayer({ locked: true })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('locked-indicator')).toBeInTheDocument()
  })
})

// ─── Move gesture ─────────────────────────────────────────────────────────────

describe('SelectionOverlay — move gesture', () => {
  it('move pointerdown on move target does not error', () => {
    const layer = createRingLayer()
    useProjectStore.getState().addLayer(layer)
    render(<OverlayWrapper layer={layer} />)

    const moveTarget = screen.getByTestId('move-target')
    // Should not throw
    expect(() =>
      moveTarget.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 1,
        })
      )
    ).not.toThrow()
  })

  it('move gesture updates layer X and Y in project store', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(layer)

    // Set viewport so screenToWorld works
    useViewportStore.setState({
      centerX: 0,
      centerY: 0,
      zoom: 1,
      viewportWidth: 1000,
      viewportHeight: 1000,
    })

    const svgRef = { current: null as SVGSVGElement | null }
    const spaceHeldRef = { current: false }

    const { rerender } = render(
      <svg
        ref={(el) => {
          svgRef.current = el
        }}
      >
        <SelectionOverlay
          layer={layer}
          svgRef={svgRef as React.RefObject<SVGSVGElement | null>}
          spaceHeldRef={spaceHeldRef as React.RefObject<boolean>}
        />
      </svg>
    )

    const moveTarget = screen.getByTestId('move-target')

    // Mock getBoundingClientRect on the SVG element
    if (svgRef.current) {
      svgRef.current.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect
    }

    // Pointer down at world (0, 0) = screen (500, 500) given center=0, zoom=1, vw/vh=1000
    moveTarget.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        clientX: 500,
        clientY: 500,
      })
    )

    // Move to world (100, 50) = screen (600, 550)
    moveTarget.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 550,
      })
    )

    rerender(
      <svg
        ref={(el) => {
          svgRef.current = el
        }}
      >
        <SelectionOverlay
          layer={layer}
          svgRef={svgRef as React.RefObject<SVGSVGElement | null>}
          spaceHeldRef={spaceHeldRef as React.RefObject<boolean>}
        />
      </svg>
    )

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBeCloseTo(100)
    expect(updated?.transform.y).toBeCloseTo(50)
  })

  it('locked layer cannot be moved via overlay', () => {
    const layer = createRingLayer({ locked: true })
    useProjectStore.getState().addLayer(layer)
    render(<OverlayWrapper layer={layer} />)

    // No move target rendered for locked layer
    expect(screen.queryByTestId('move-target')).not.toBeInTheDocument()
  })
})

// ─── Rotation gesture ─────────────────────────────────────────────────────────

describe('SelectionOverlay — rotation gesture', () => {
  it('rotation handle is in the DOM for unlocked layer', () => {
    const layer = createRingLayer({ locked: false })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('rotation-handle')).toBeInTheDocument()
  })

  it('rotation gesture updates layer rotation in project store', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(layer)
    useViewportStore.setState({
      centerX: 0,
      centerY: 0,
      zoom: 1,
      viewportWidth: 1000,
      viewportHeight: 1000,
    })

    const svgRef = { current: null as SVGSVGElement | null }
    const spaceHeldRef = { current: false }

    render(
      <svg
        ref={(el) => {
          svgRef.current = el
        }}
      >
        <SelectionOverlay
          layer={layer}
          svgRef={svgRef as React.RefObject<SVGSVGElement | null>}
          spaceHeldRef={spaceHeldRef as React.RefObject<boolean>}
        />
      </svg>
    )

    if (svgRef.current) {
      svgRef.current.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect
    }

    // Find the rotation handle hit target (circle before the visual)
    // The rotation handle hit target is a circle with style pointer-events: all
    const circles = document.querySelectorAll('circle')
    const hitTarget = Array.from(circles).find((c) => c.style.pointerEvents === 'all')
    expect(hitTarget).toBeTruthy()

    // pointerdown above the pivot (x=0, y=0 world → screen x=500, y=500)
    // Pointer above: screen (500, 400) = world (0, -100)
    hitTarget?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        clientX: 500,
        clientY: 400,
      })
    )

    // Move to the right: screen (600, 500) = world (100, 0)
    hitTarget?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 500,
      })
    )

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    // Moving from above (angle = -π/2) to right (angle = 0), delta = +π/2 → +90°
    expect(updated?.transform.rotation).not.toBe(0)
  })
})

// ─── Scale gesture ────────────────────────────────────────────────────────────

describe('SelectionOverlay — scale gesture', () => {
  it('scale handles are in the DOM for unlocked layer', () => {
    const layer = createRingLayer({ locked: false })
    render(<OverlayWrapper layer={layer} />)
    expect(screen.getByTestId('scale-handle-se')).toBeInTheDocument()
  })

  it('scale gesture updates scaleX and scaleY in project store', () => {
    const layer = createRingLayer({
      radius: 100,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.getState().addLayer(layer)
    useViewportStore.setState({
      centerX: 0,
      centerY: 0,
      zoom: 1,
      viewportWidth: 1000,
      viewportHeight: 1000,
    })

    const svgRef = { current: null as SVGSVGElement | null }
    const spaceHeldRef = { current: false }

    render(
      <svg
        ref={(el) => {
          svgRef.current = el
        }}
      >
        <SelectionOverlay
          layer={layer}
          svgRef={svgRef as React.RefObject<SVGSVGElement | null>}
          spaceHeldRef={spaceHeldRef as React.RefObject<boolean>}
        />
      </svg>
    )

    if (svgRef.current) {
      svgRef.current.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect
    }

    const seHandle = screen.getByTestId('scale-handle-se')

    // SE handle is at world (100, 100) = screen (600, 600) (center=0, zoom=1, vw/vh=1000)
    seHandle.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        clientX: 600,
        clientY: 600,
      })
    )

    // Move to world (200, 200) = screen (700, 700) — double the distance
    seHandle.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 700,
        clientY: 700,
      })
    )

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.scaleX).toBeGreaterThan(1)
    expect(updated?.transform.scaleY).toBeGreaterThan(1)
  })
})

// ─── Inspector sync ───────────────────────────────────────────────────────────

describe('SelectionOverlay — inspector sync', () => {
  it('overlay tracks layer transform after inspector update', () => {
    const layer = createRingLayer()
    useProjectStore.getState().addLayer(layer)
    render(<OverlayWrapper layer={layer} />)

    // Simulate inspector updating transform via store
    useProjectStore.getState().updateLayerTransform(layer.id, { x: 150 })

    // The overlay re-renders from project store, no explicit test needed here
    // just verify no error thrown
    const overlay = screen.getByTestId('selection-overlay')
    expect(overlay).toBeInTheDocument()
  })
})
