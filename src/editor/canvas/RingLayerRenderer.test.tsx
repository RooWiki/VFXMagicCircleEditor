import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRef } from 'react'
import { useEditorStore } from '../../store/editor'
import { useProjectStore } from '../../store/project'
import { createDefaultProject, createRingLayer } from '../../utils/factories'
import RingLayerRenderer from './RingLayerRenderer'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useEditorStore.setState({ activeTool: 'select', selectedLayerIds: [] })
  useProjectStore.setState({ project: createDefaultProject() })
})

// A wrapper component that provides the required spaceHeldRef
function RingRendererWrapper({
  layer,
  spaceHeld = false,
}: {
  layer: ReturnType<typeof createRingLayer>
  spaceHeld?: boolean
}) {
  const ref = useRef(spaceHeld)
  ref.current = spaceHeld
  return (
    <svg>
      <RingLayerRenderer layer={layer} spaceHeldRef={ref} />
    </svg>
  )
}

function renderRing(overrides: Parameters<typeof createRingLayer>[0] = {}, spaceHeld = false) {
  const layer = createRingLayer(overrides)
  render(<RingRendererWrapper layer={layer} spaceHeld={spaceHeld} />)
  return layer
}

describe('RingLayerRenderer — basic rendering', () => {
  it('renders a circle element', () => {
    renderRing()
    // First circle is the visible one
    const circles = document.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders with the correct radius', () => {
    renderRing({ radius: 200 })
    const circle = document.querySelector('circle')
    expect(circle?.getAttribute('r')).toBe('200')
  })

  it('renders with the correct stroke width', () => {
    renderRing({ strokeWidth: 8 })
    const circle = document.querySelector('circle')
    expect(circle?.getAttribute('stroke-width')).toBe('8')
  })

  it('renders with the correct stroke color', () => {
    renderRing({ color: '#ff0000' })
    const circle = document.querySelector('circle')
    expect(circle?.getAttribute('stroke')).toBe('#ff0000')
  })

  it('renders with fill="none"', () => {
    renderRing()
    const circle = document.querySelector('circle')
    expect(circle?.getAttribute('fill')).toBe('none')
  })

  it('renders circle at cx=0 cy=0 (local origin)', () => {
    renderRing()
    const circle = document.querySelector('circle')
    expect(circle?.getAttribute('cx')).toBe('0')
    expect(circle?.getAttribute('cy')).toBe('0')
  })
})

describe('RingLayerRenderer — opacity', () => {
  it('applies opacity on the wrapping group', () => {
    const layer = createRingLayer({ opacity: 0.5 })
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.getAttribute('opacity')).toBe('0.5')
  })

  it('full opacity (1) is applied correctly', () => {
    const layer = createRingLayer({ opacity: 1 })
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.getAttribute('opacity')).toBe('1')
  })
})

describe('RingLayerRenderer — transform', () => {
  it('applies translate, rotate, scale in the correct order', () => {
    const layer = createRingLayer({
      transform: { x: 100, y: 50, rotation: 45, scaleX: 2, scaleY: 0.5 },
    })
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    const t = g.getAttribute('transform') ?? ''
    expect(t).toContain('translate(100, 50)')
    expect(t).toContain('rotate(45)')
    expect(t).toContain('scale(2, 0.5)')
    expect(t.indexOf('translate')).toBeLessThan(t.indexOf('rotate'))
    expect(t.indexOf('rotate')).toBeLessThan(t.indexOf('scale'))
  })

  it('renders at origin by default', () => {
    const layer = createRingLayer()
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    const t = g.getAttribute('transform') ?? ''
    expect(t).toContain('translate(0, 0)')
    expect(t).toContain('rotate(0)')
    expect(t).toContain('scale(1, 1)')
  })
})

describe('RingLayerRenderer — visibility', () => {
  it('renders nothing when layer is hidden', () => {
    const layer = createRingLayer({ visible: false })
    render(<RingRendererWrapper layer={layer} />)
    expect(document.querySelector('circle')).toBeNull()
    expect(screen.queryByTestId(`ring-layer-${layer.id}`)).not.toBeInTheDocument()
  })

  it('renders the circle when layer is visible', () => {
    const layer = createRingLayer({ visible: true })
    render(<RingRendererWrapper layer={layer} />)
    expect(document.querySelector('circle')).not.toBeNull()
  })
})

describe('RingLayerRenderer — pointer events (Phase 6)', () => {
  it('unlocked layer has pointer events enabled on the group', () => {
    const layer = createRingLayer({ locked: false })
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.style.pointerEvents).not.toBe('none')
  })

  it('locked layer has pointer-events none', () => {
    const layer = createRingLayer({ locked: true })
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.style.pointerEvents).toBe('none')
  })

  it('clicking unlocked ring selects it in editor store', () => {
    const layer = createRingLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RingRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))

    expect(useEditorStore.getState().selectedLayerIds).toContain(layer.id)
  })

  it('clicking locked ring does not select it from canvas', () => {
    const layer = createRingLayer({ locked: true })
    useProjectStore.getState().addLayer(layer)
    render(<RingRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))

    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('right-click does not select the ring', () => {
    const layer = createRingLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RingRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 2 }))

    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('clicking with hand tool active does not select', () => {
    useEditorStore.setState({ activeTool: 'hand' })
    const layer = createRingLayer()
    useProjectStore.getState().addLayer(layer)
    render(<RingRendererWrapper layer={layer} />)

    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))

    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('hidden ring cannot be interacted with (renders nothing)', () => {
    const layer = createRingLayer({ visible: false })
    render(<RingRendererWrapper layer={layer} />)
    expect(screen.queryByTestId(`ring-layer-${layer.id}`)).not.toBeInTheDocument()
  })
})

describe('RingLayerRenderer — data attributes', () => {
  it('sets data-layer-id on the group', () => {
    const layer = createRingLayer()
    render(<RingRendererWrapper layer={layer} />)
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.getAttribute('data-layer-id')).toBe(layer.id)
  })
})
