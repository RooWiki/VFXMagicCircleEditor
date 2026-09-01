import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import { createDefaultProject, createRadialLinesLayer } from '../../utils/factories'
import RadialLinesInspector from './RadialLinesInspector'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useProjectStore.setState({ project: createDefaultProject() })
  useHistoryStore.setState({ snapshots: [], pointer: -1, pendingEditSnapshot: null })
})

function setupWithRL(overrides: Parameters<typeof createRadialLinesLayer>[0] = {}) {
  const layer = createRadialLinesLayer(overrides)
  useProjectStore.getState().addLayer(layer)
  render(<RadialLinesInspector layer={layer} />)
  return layer
}

describe('RadialLinesInspector — renders controls', () => {
  it('renders the Count field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Count')).toBeInTheDocument()
  })

  it('renders the Inner Radius field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Inner Radius')).toBeInTheDocument()
  })

  it('renders the Outer Radius field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Outer Radius')).toBeInTheDocument()
  })

  it('renders the Start Angle field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Start Angle')).toBeInTheDocument()
  })

  it('renders the Thickness field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Thickness')).toBeInTheDocument()
  })

  it('renders the Color field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
  })

  it('renders the Opacity field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Opacity')).toBeInTheDocument()
  })

  it('renders the X and Y fields', () => {
    setupWithRL()
    expect(screen.getByLabelText('X')).toBeInTheDocument()
    expect(screen.getByLabelText('Y')).toBeInTheDocument()
  })

  it('renders the Rotation field', () => {
    setupWithRL()
    expect(screen.getByLabelText('Rotation')).toBeInTheDocument()
  })

  it('renders Scale X and Scale Y fields', () => {
    setupWithRL()
    expect(screen.getByLabelText('Scale X')).toBeInTheDocument()
    expect(screen.getByLabelText('Scale Y')).toBeInTheDocument()
  })

  it('displays the layer name and type label', () => {
    setupWithRL({ name: 'My Radial Lines' })
    expect(screen.getByText('My Radial Lines')).toBeInTheDocument()
    expect(screen.getAllByText('Radial Lines').length).toBeGreaterThanOrEqual(1)
  })

  it('has data-testid="radial-lines-inspector"', () => {
    setupWithRL()
    expect(screen.getByTestId('radial-lines-inspector')).toBeInTheDocument()
  })
})

describe('RadialLinesInspector — initial values', () => {
  it('shows the default count value', () => {
    setupWithRL({ count: 12 })
    expect(screen.getByLabelText('Count')).toHaveValue(12)
  })

  it('shows the default inner radius value', () => {
    setupWithRL({ innerRadius: 150 })
    expect(screen.getByLabelText('Inner Radius')).toHaveValue(150)
  })

  it('shows the default outer radius value', () => {
    setupWithRL({ outerRadius: 400 })
    expect(screen.getByLabelText('Outer Radius')).toHaveValue(400)
  })

  it('shows the default start angle value', () => {
    setupWithRL({ startAngle: 45 })
    expect(screen.getByLabelText('Start Angle')).toHaveValue(45)
  })

  it('shows the default stroke width value', () => {
    setupWithRL({ strokeWidth: 3 })
    expect(screen.getByLabelText('Thickness')).toHaveValue(3)
  })

  it('shows the default color value', () => {
    setupWithRL({ color: '#ff00ff' })
    expect(screen.getByLabelText('Color')).toHaveValue('#ff00ff')
  })

  it('shows opacity as percentage (0-100)', () => {
    setupWithRL({ opacity: 0.6 })
    expect(screen.getByLabelText('Opacity')).toHaveValue('60')
  })
})

describe('RadialLinesInspector — store updates', () => {
  it('updates count in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL({ count: 8 })

    const input = screen.getByLabelText('Count')
    await user.clear(input)
    await user.type(input, '16')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'radial-lines') {
      expect(updated.count).toBe(16)
    }
  })

  it('updates innerRadius in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL({ innerRadius: 100, outerRadius: 300 })

    const input = screen.getByLabelText('Inner Radius')
    await user.clear(input)
    await user.type(input, '150')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'radial-lines') {
      expect(updated.innerRadius).toBe(150)
    }
  })

  it('updates outerRadius in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL({ innerRadius: 100, outerRadius: 300 })

    const input = screen.getByLabelText('Outer Radius')
    await user.clear(input)
    await user.type(input, '500')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'radial-lines') {
      expect(updated.outerRadius).toBe(500)
    }
  })

  it('updates startAngle in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL({ startAngle: 0 })

    const input = screen.getByLabelText('Start Angle')
    await user.clear(input)
    await user.type(input, '90')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'radial-lines') {
      expect(updated.startAngle).toBe(90)
    }
  })

  it('updates strokeWidth in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL({ strokeWidth: 2 })

    const input = screen.getByLabelText('Thickness')
    await user.clear(input)
    await user.type(input, '5')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'radial-lines') {
      expect(updated.strokeWidth).toBe(5)
    }
  })

  it('updates opacity via the range slider', async () => {
    setupWithRL({ opacity: 1 })

    const slider = screen.getByLabelText('Opacity')
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(slider, { target: { value: '40' } })

    const layers = useProjectStore.getState().project.layers
    const rl = layers.find((l) => l.type === 'radial-lines')
    if (rl?.type === 'radial-lines') {
      expect(rl.opacity).toBeCloseTo(0.4)
    }
  })

  it('updates transform X in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL()

    const input = screen.getByLabelText('X')
    await user.clear(input)
    await user.type(input, '75')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.x).toBe(75)
  })

  it('updates transform rotation in the project store', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL()

    const input = screen.getByLabelText('Rotation')
    await user.clear(input)
    await user.type(input, '30')
    await user.tab()

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.transform.rotation).toBe(30)
  })
})

describe('RadialLinesInspector — history grouping', () => {
  it('one history entry per field blur, not per keystroke', async () => {
    const user = userEvent.setup()
    const layer = setupWithRL({ count: 8 })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const input = screen.getByLabelText('Count')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '16')
    expect(useHistoryStore.getState().pointer).toBe(0) // still in edit

    await user.tab()
    expect(useHistoryStore.getState().pointer).toBe(1)
    expect(useHistoryStore.getState().snapshots).toHaveLength(2)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'radial-lines') expect(updated.count).toBe(16)
  })

  it('no history entry when field value is unchanged on blur', async () => {
    const user = userEvent.setup()
    setupWithRL({ count: 8 })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const input = screen.getByLabelText('Count')
    await user.click(input)
    await user.tab()

    expect(useHistoryStore.getState().pointer).toBe(0)
    expect(useHistoryStore.getState().snapshots).toHaveLength(1)
  })
})
