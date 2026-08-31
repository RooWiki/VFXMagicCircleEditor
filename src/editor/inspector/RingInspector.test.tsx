import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../../store/project'
import { createDefaultProject, createRingLayer } from '../../utils/factories'
import RingInspector from './RingInspector'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useProjectStore.setState({ project: createDefaultProject() })
})

function setupWithRing(overrides: Parameters<typeof createRingLayer>[0] = {}) {
  const layer = createRingLayer(overrides)
  useProjectStore.getState().addLayer(layer)
  render(<RingInspector layer={layer} />)
  return layer
}

describe('RingInspector — renders controls', () => {
  it('renders the Radius field', () => {
    setupWithRing()
    expect(screen.getByLabelText('Radius')).toBeInTheDocument()
  })

  it('renders the Thickness field', () => {
    setupWithRing()
    expect(screen.getByLabelText('Thickness')).toBeInTheDocument()
  })

  it('renders the Color field', () => {
    setupWithRing()
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
  })

  it('renders the Opacity field', () => {
    setupWithRing()
    expect(screen.getByLabelText('Opacity')).toBeInTheDocument()
  })

  it('renders the X and Y fields', () => {
    setupWithRing()
    expect(screen.getByLabelText('X')).toBeInTheDocument()
    expect(screen.getByLabelText('Y')).toBeInTheDocument()
  })

  it('renders the Rotation field', () => {
    setupWithRing()
    expect(screen.getByLabelText('Rotation')).toBeInTheDocument()
  })

  it('renders Scale X and Scale Y fields', () => {
    setupWithRing()
    expect(screen.getByLabelText('Scale X')).toBeInTheDocument()
    expect(screen.getByLabelText('Scale Y')).toBeInTheDocument()
  })

  it('displays the layer name and type', () => {
    setupWithRing({ name: 'My Ring' })
    expect(screen.getByText('My Ring')).toBeInTheDocument()
    // "Ring" appears as the section heading in the inspector
    expect(screen.getAllByText('Ring').length).toBeGreaterThanOrEqual(1)
  })
})

describe('RingInspector — initial values', () => {
  it('shows the default radius value', () => {
    setupWithRing({ radius: 250 })
    expect(screen.getByLabelText('Radius')).toHaveValue(250)
  })

  it('shows the default strokeWidth value', () => {
    setupWithRing({ strokeWidth: 6 })
    expect(screen.getByLabelText('Thickness')).toHaveValue(6)
  })

  it('shows the default color value', () => {
    setupWithRing({ color: '#ff0000' })
    expect(screen.getByLabelText('Color')).toHaveValue('#ff0000')
  })

  it('shows the opacity as percentage (0-100)', () => {
    setupWithRing({ opacity: 0.75 })
    // Range input value is always a string in the DOM
    expect(screen.getByLabelText('Opacity')).toHaveValue('75')
  })
})

describe('RingInspector — store updates', () => {
  it('updates radius in the project store when input changes', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing({ radius: 300 })

    const input = screen.getByLabelText('Radius')
    await user.clear(input)
    await user.type(input, '400')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated).toBeDefined()
    if (updated?.type === 'ring') {
      expect(updated.radius).toBe(400)
    }
  })

  it('updates strokeWidth in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing({ strokeWidth: 4 })

    const input = screen.getByLabelText('Thickness')
    await user.clear(input)
    await user.type(input, '8')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'ring') {
      expect(updated.strokeWidth).toBe(8)
    }
  })

  it('updates opacity via the range slider', async () => {
    setupWithRing({ opacity: 1 })

    const slider = screen.getByLabelText('Opacity')
    // fireEvent for range inputs (userEvent doesn't support range dragging well)
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(slider, { target: { value: '50' } })

    // After the change, the ring in the store should have 50% opacity
    const layers = useProjectStore.getState().project.layers
    const ring = layers.find((l) => l.type === 'ring')
    if (ring?.type === 'ring') {
      expect(ring.opacity).toBeCloseTo(0.5)
    }
  })

  it('updates transform X in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing()

    const input = screen.getByLabelText('X')
    await user.clear(input)
    await user.type(input, '100')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBe(100)
  })

  it('updates transform Y in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing()

    const input = screen.getByLabelText('Y')
    await user.clear(input)
    await user.type(input, '-50')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.y).toBe(-50)
  })

  it('updates rotation in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing()

    const input = screen.getByLabelText('Rotation')
    await user.clear(input)
    await user.type(input, '45')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.rotation).toBe(45)
  })

  it('updates scaleX in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing()

    const input = screen.getByLabelText('Scale X')
    await user.clear(input)
    await user.type(input, '2')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.scaleX).toBe(2)
  })

  it('updating one ring does not affect another ring', async () => {
    const user = userEvent.setup()
    const layer1 = createRingLayer({ radius: 300, name: 'Ring 1' })
    const layer2 = createRingLayer({ radius: 200, name: 'Ring 2' })
    useProjectStore.getState().addLayer(layer1)
    useProjectStore.getState().addLayer(layer2)

    render(<RingInspector layer={layer1} />)

    const input = screen.getByLabelText('Radius')
    await user.clear(input)
    await user.type(input, '150')
    await user.tab()

    const state = useProjectStore.getState().project.layers
    const r1 = state.find((l) => l.id === layer1.id)
    const r2 = state.find((l) => l.id === layer2.id)

    if (r1?.type === 'ring') expect(r1.radius).toBe(150)
    if (r2?.type === 'ring') expect(r2.radius).toBe(200) // unchanged
  })
})

describe('RingInspector — invalid input safety', () => {
  it('does not apply NaN radius to the store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing({ radius: 300 })

    const input = screen.getByLabelText('Radius')
    await user.clear(input)
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'ring') {
      expect(Number.isFinite(updated.radius)).toBe(true)
    }
  })

  it('does not apply negative radius to the store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing({ radius: 300 })

    const input = screen.getByLabelText('Radius')
    await user.clear(input)
    await user.type(input, '-100')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'ring') {
      expect(updated.radius).toBeGreaterThan(0)
    }
  })
})
