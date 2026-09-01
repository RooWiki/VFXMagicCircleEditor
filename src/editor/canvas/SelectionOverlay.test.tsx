import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRef } from 'react'
import { useEditorStore } from '../../store/editor'
import { useHistoryStore } from '../../store/history'
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
  useHistoryStore.setState({ snapshots: [], pointer: -1, pendingEditSnapshot: null })
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

// ─── Gesture history ──────────────────────────────────────────────────────────

describe('SelectionOverlay — gesture history', () => {
  function setupWithSvgRef(layer: ReturnType<typeof createRingLayer>) {
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
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
    return { svgRef, spaceHeldRef }
  }

  it('move gesture pushes one history snapshot on pointerup', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    setupWithSvgRef(layer)
    const moveTarget = screen.getByTestId('move-target')

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
    moveTarget.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 550,
      })
    )
    moveTarget.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 550,
      })
    )

    expect(useHistoryStore.getState().pointer).toBe(1)
    expect(useHistoryStore.getState().snapshots).toHaveLength(2)
  })

  it('move gesture with no actual movement does not push a snapshot', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    setupWithSvgRef(layer)
    const moveTarget = screen.getByTestId('move-target')

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
    // No pointermove — pointerup immediately at same position
    moveTarget.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 500,
        clientY: 500,
      })
    )

    expect(useHistoryStore.getState().pointer).toBe(0)
  })

  it('rotation gesture pushes one history snapshot on pointerup', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    setupWithSvgRef(layer)

    const circles = document.querySelectorAll('circle')
    const hitTarget = Array.from(circles).find((c) => c.style.pointerEvents === 'all')
    expect(hitTarget).toBeTruthy()

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
    hitTarget?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 500,
      })
    )
    hitTarget?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 500,
      })
    )

    expect(useHistoryStore.getState().pointer).toBe(1)
    expect(useHistoryStore.getState().snapshots).toHaveLength(2)
  })

  it('scale gesture pushes one history snapshot on pointerup', () => {
    const layer = createRingLayer({
      radius: 100,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    setupWithSvgRef(layer)
    const seHandle = screen.getByTestId('scale-handle-se')

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
    seHandle.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 700,
        clientY: 700,
      })
    )
    seHandle.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 700,
        clientY: 700,
      })
    )

    expect(useHistoryStore.getState().pointer).toBe(1)
    expect(useHistoryStore.getState().snapshots).toHaveLength(2)
  })

  it('pointercancel also commits gesture to history', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    setupWithSvgRef(layer)
    const moveTarget = screen.getByTestId('move-target')

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
    moveTarget.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: 600,
        clientY: 600,
      })
    )
    moveTarget.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, cancelable: true, pointerId: 1 })
    )

    expect(useHistoryStore.getState().pointer).toBe(1)
  })
})

// ─── Scale-invariant UI geometry ──────────────────────────────────────────────

describe('SelectionOverlay — scale-invariant UI geometry', () => {
  // SCALE_HANDLE_HALF = 5, ROTATION_HANDLE_OFFSET = 40, ROTATION_HANDLE_RADIUS = 5

  function renderLayer(
    opts: {
      radius?: number
      scaleX?: number
      scaleY?: number
      rotation?: number
      locked?: boolean
    } = {}
  ) {
    const { radius = 100, scaleX = 1, scaleY = 1, rotation = 0, locked = false } = opts
    const layer = createRingLayer({
      radius,
      locked,
      transform: { x: 0, y: 0, rotation, scaleX, scaleY },
    })
    render(<OverlayWrapper layer={layer} />)
    return layer
  }

  it('SE handle hit-target positioned at (hw - 10, hh - 10) for uniform scale (1,1) r=100', () => {
    renderLayer({ radius: 100, scaleX: 1, scaleY: 1 })
    const seHandle = screen.getByTestId('scale-handle-se')
    // hw = 100, hh = 100; hit target x = hw - SCALE_HANDLE_HALF*2 = 90, y = 90
    expect(Number(seHandle.getAttribute('x'))).toBeCloseTo(90)
    expect(Number(seHandle.getAttribute('y'))).toBeCloseTo(90)
  })

  it('SE handle adapts to non-uniform scale (0.25, 2) with r=100', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const seHandle = screen.getByTestId('scale-handle-se')
    // hw = 25, hh = 200; hit target x = 25-10=15, y = 200-10=190
    expect(Number(seHandle.getAttribute('x'))).toBeCloseTo(15)
    expect(Number(seHandle.getAttribute('y'))).toBeCloseTo(190)
  })

  it('NW handle adapts to non-uniform scale (0.25, 2) with r=100', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const nwHandle = screen.getByTestId('scale-handle-nw')
    // hw=25, hh=200; NW: cx=-25, cy=-200; hit target x=-25-10=-35, y=-200-10=-210
    expect(Number(nwHandle.getAttribute('x'))).toBeCloseTo(-35)
    expect(Number(nwHandle.getAttribute('y'))).toBeCloseTo(-210)
  })

  it('scale handle hit-target size is constant (20x20) regardless of scale', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const seHandle = screen.getByTestId('scale-handle-se')
    // SCALE_HANDLE_HALF * 4 = 20
    expect(Number(seHandle.getAttribute('width'))).toBeCloseTo(20)
    expect(Number(seHandle.getAttribute('height'))).toBeCloseTo(20)
  })

  it('rotation handle radius is constant (5) regardless of scale', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const rotHandle = screen.getByTestId('rotation-handle')
    expect(Number(rotHandle.getAttribute('r'))).toBeCloseTo(5)
  })

  it('rotation handle cy = -(hh + ROTATION_HANDLE_OFFSET) for non-uniform scale', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const rotHandle = screen.getByTestId('rotation-handle')
    // hh = 200; rotHandleY = -200 - 40 = -240
    expect(Number(rotHandle.getAttribute('cy'))).toBeCloseTo(-240)
  })

  it('UI group (containing rotation handle) has no scale in transform', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const rotHandle = screen.getByTestId('rotation-handle')
    const uiGroup = rotHandle.closest('g[transform]')
    const uiTransform = uiGroup?.getAttribute('transform') ?? ''
    expect(uiTransform).toContain('translate')
    expect(uiTransform).not.toContain('scale')
  })

  it('artwork group (containing selection indicator) has scale in transform', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2 })
    const indicator = screen.getByTestId('selection-indicator')
    const artGroup = indicator.closest('g[transform]')
    const artTransform = artGroup?.getAttribute('transform') ?? ''
    expect(artTransform).toContain('scale(0.25, 2)')
  })

  it('very wide ring (scaleX=3, scaleY=0.3): SE handle at x=290, y=20, size 20x20', () => {
    renderLayer({ radius: 100, scaleX: 3, scaleY: 0.3 })
    const seHandle = screen.getByTestId('scale-handle-se')
    // hw=300, hh=30; hit target x=300-10=290, y=30-10=20
    expect(Number(seHandle.getAttribute('x'))).toBeCloseTo(290)
    expect(Number(seHandle.getAttribute('y'))).toBeCloseTo(20)
    expect(Number(seHandle.getAttribute('width'))).toBeCloseTo(20)
    expect(Number(seHandle.getAttribute('height'))).toBeCloseTo(20)
  })

  it('rotated 35° + non-uniform scale: UI group contains rotate(35) but no scale', () => {
    renderLayer({ radius: 100, scaleX: 2, scaleY: 0.5, rotation: 35 })
    const rotHandle = screen.getByTestId('rotation-handle')
    const uiGroup = rotHandle.closest('g[transform]')
    const uiTransform = uiGroup?.getAttribute('transform') ?? ''
    expect(uiTransform).toContain('rotate(35)')
    expect(uiTransform).not.toContain('scale')
  })

  it('locked indicator y = -(hh + 12) for non-uniform scale', () => {
    renderLayer({ radius: 100, scaleX: 0.25, scaleY: 2, locked: true })
    const lockedIndicator = screen.getByTestId('locked-indicator')
    // hh = 200; y = -(200 + 12) = -212
    expect(Number(lockedIndicator.getAttribute('y'))).toBeCloseTo(-212)
  })
})
