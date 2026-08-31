import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRingLayer } from '../../utils/factories'
import RingLayerRenderer from './RingLayerRenderer'

afterEach(() => {
  cleanup()
})

function renderRing(overrides: Parameters<typeof createRingLayer>[0] = {}) {
  const layer = createRingLayer(overrides)
  render(
    <svg>
      <RingLayerRenderer layer={layer} />
    </svg>
  )
  return layer
}

describe('RingLayerRenderer — basic rendering', () => {
  it('renders a circle element', () => {
    renderRing()
    const circle = document.querySelector('circle')
    expect(circle).not.toBeNull()
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
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.getAttribute('opacity')).toBe('0.5')
  })

  it('full opacity (1) is applied correctly', () => {
    const layer = createRingLayer({ opacity: 1 })
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.getAttribute('opacity')).toBe('1')
  })
})

describe('RingLayerRenderer — transform', () => {
  it('applies translate, rotate, scale in the correct order', () => {
    const layer = createRingLayer({
      transform: { x: 100, y: 50, rotation: 45, scaleX: 2, scaleY: 0.5 },
    })
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    const t = g.getAttribute('transform') ?? ''
    // Order: translate, rotate, scale
    expect(t).toContain('translate(100, 50)')
    expect(t).toContain('rotate(45)')
    expect(t).toContain('scale(2, 0.5)')
    // Correct relative ordering
    expect(t.indexOf('translate')).toBeLessThan(t.indexOf('rotate'))
    expect(t.indexOf('rotate')).toBeLessThan(t.indexOf('scale'))
  })

  it('renders at origin by default', () => {
    const layer = createRingLayer()
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
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
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    expect(document.querySelector('circle')).toBeNull()
    expect(screen.queryByTestId(`ring-layer-${layer.id}`)).not.toBeInTheDocument()
  })

  it('renders the circle when layer is visible', () => {
    const layer = createRingLayer({ visible: true })
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    expect(document.querySelector('circle')).not.toBeNull()
  })
})

describe('RingLayerRenderer — pointer events', () => {
  it('has pointer-events none (no canvas interaction until Phase 6)', () => {
    const layer = createRingLayer()
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.style.pointerEvents).toBe('none')
  })
})

describe('RingLayerRenderer — data attributes', () => {
  it('sets data-layer-id on the group', () => {
    const layer = createRingLayer()
    render(
      <svg>
        <RingLayerRenderer layer={layer} />
      </svg>
    )
    const g = screen.getByTestId(`ring-layer-${layer.id}`)
    expect(g.getAttribute('data-layer-id')).toBe(layer.id)
  })
})
