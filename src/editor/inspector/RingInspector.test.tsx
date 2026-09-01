import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import { createDefaultProject, createRingLayer } from '../../utils/factories'
import RingInspector from './RingInspector'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useProjectStore.setState({ project: createDefaultProject() })
  useHistoryStore.setState({ snapshots: [], pointer: -1, pendingEditSnapshot: null })
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

describe('RingInspector — history grouping', () => {
  it('one history entry per field blur, not per keystroke', async () => {
    const user = userEvent.setup()
    const layer = setupWithRing({ radius: 100 })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const input = screen.getByLabelText('Radius')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '200')
    // Still focused — no snapshot yet beyond initial
    expect(useHistoryStore.getState().pointer).toBe(0)

    await user.tab()
    // After blur, exactly one snapshot pushed
    expect(useHistoryStore.getState().pointer).toBe(1)
    expect(useHistoryStore.getState().snapshots).toHaveLength(2)

    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    if (updated?.type === 'ring') expect(updated.radius).toBe(200)
  })

  it('no history entry when field value is unchanged on blur', async () => {
    const user = userEvent.setup()
    setupWithRing({ radius: 100 })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const input = screen.getByLabelText('Radius')
    await user.click(input)
    // Do not change the value — just blur
    await user.tab()

    expect(useHistoryStore.getState().pointer).toBe(0)
    expect(useHistoryStore.getState().snapshots).toHaveLength(1)
  })

  it('multiple fields each produce one history entry', async () => {
    const user = userEvent.setup()
    setupWithRing({ radius: 100, strokeWidth: 4 })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const radiusInput = screen.getByLabelText('Radius')
    await user.clear(radiusInput)
    await user.type(radiusInput, '200')
    await user.tab()

    const thicknessInput = screen.getByLabelText('Thickness')
    await user.clear(thicknessInput)
    await user.type(thicknessInput, '8')
    await user.tab()

    expect(useHistoryStore.getState().pointer).toBe(2)
    expect(useHistoryStore.getState().snapshots).toHaveLength(3)
  })

  it('invalid input on blur does not push a history entry', async () => {
    const user = userEvent.setup()
    setupWithRing({ radius: 300 })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const input = screen.getByLabelText('Radius')
    await user.clear(input)
    // Empty input → NaN → commit resets draft, store unchanged
    await user.tab()

    expect(useHistoryStore.getState().pointer).toBe(0)
  })
})

// ─── Bug regression: ring must not disappear on first undo ───────────────────

describe('RingInspector — inspector history bug regression', () => {
  function getRadius(layerId: string) {
    const l = useProjectStore.getState().project.layers.find((x) => x.id === layerId)
    return l?.type === 'ring' ? l.radius : null
  }

  it('Test 1: one undo after multi-change edit restores ring at pre-edit radius, not empty project', async () => {
    const user = userEvent.setup()

    // Snapshot 0: empty project
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    // Add ring and push snapshot 1
    const layer = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    // Render inspector (as if ring is selected)
    render(<RingInspector layer={layer} />)

    expect(useHistoryStore.getState().snapshots).toHaveLength(2) // [empty, ring-100]
    expect(useHistoryStore.getState().pointer).toBe(1)

    // Inspector edit session: change radius several times, then blur
    const input = screen.getByLabelText('Radius')
    await user.click(input) // focus → beginInspectorEdit
    await user.clear(input)
    await user.type(input, '120')
    await user.clear(input)
    await user.type(input, '150')
    await user.clear(input)
    await user.type(input, '180')
    await user.tab() // blur → commitInspectorEdit → snapshot 2

    expect(useHistoryStore.getState().snapshots).toHaveLength(3) // [empty, ring-100, ring-180]
    expect(useHistoryStore.getState().pointer).toBe(2)
    expect(getRadius(layer.id)).toBe(180)

    // ONE undo — ring must still exist with radius 100
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().project.layers).toHaveLength(1)
    expect(getRadius(layer.id)).toBe(100)
    expect(useHistoryStore.getState().pointer).toBe(1)
  })

  it('Test 2: undo/redo alternates deterministically between 100 and 180', async () => {
    const user = userEvent.setup()
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const layer = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    render(<RingInspector layer={layer} />)

    const input = screen.getByLabelText('Radius')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '180')
    await user.tab()

    // pointer=2 (ring-100, ring-180)
    expect(useHistoryStore.getState().pointer).toBe(2)

    useHistoryStore.getState().undo()
    expect(getRadius(layer.id)).toBe(100)

    useHistoryStore.getState().redo()
    expect(getRadius(layer.id)).toBe(180)

    useHistoryStore.getState().undo()
    expect(getRadius(layer.id)).toBe(100)

    useHistoryStore.getState().redo()
    expect(getRadius(layer.id)).toBe(180)
  })

  it('Test 3: canRedo stays true after undo without new edit', async () => {
    const user = userEvent.setup()
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const layer = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    render(<RingInspector layer={layer} />)

    const input = screen.getByLabelText('Radius')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '180')
    await user.tab()

    useHistoryStore.getState().undo()

    // No new edit — redo branch must be intact
    const { selectCanRedo: canRedo } = await import('../../store/history')
    expect(canRedo(useHistoryStore.getState())).toBe(true)
    useHistoryStore.getState().redo()
    expect(getRadius(layer.id)).toBe(180)
  })

  it('Test 4: redo branch discarded only when a genuine new edit occurs after undo', async () => {
    const user = userEvent.setup()
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const layer = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    render(<RingInspector layer={layer} />)

    // Edit to 180 and commit
    const input = screen.getByLabelText('Radius')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '180')
    await user.tab()

    useHistoryStore.getState().undo() // back to 100

    // New edit to 140 — this discards the r180 redo branch
    await user.click(input)
    await user.clear(input)
    await user.type(input, '140')
    await user.tab()

    expect(getRadius(layer.id)).toBe(140)
    const { selectCanRedo: canRedo } = await import('../../store/history')
    expect(canRedo(useHistoryStore.getState())).toBe(false)
  })

  it('Test 5: focus then blur without typing produces no history entry', async () => {
    const user = userEvent.setup()
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const layer = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    render(<RingInspector layer={layer} />)

    const snapshotsBefore = useHistoryStore.getState().snapshots.length

    const input = screen.getByLabelText('Radius')
    await user.click(input) // focus
    await user.tab() // blur without typing

    expect(useHistoryStore.getState().snapshots).toHaveLength(snapshotsBefore)
  })

  it('Test 6: invalid draft on blur produces no NaN in store or history', async () => {
    const user = userEvent.setup()
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const layer = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    render(<RingInspector layer={layer} />)

    const snapshotsBefore = useHistoryStore.getState().snapshots.length

    const input = screen.getByLabelText('Radius')
    await user.click(input)
    await user.clear(input)
    // Leave empty (NaN) then blur
    await user.tab()

    // No new snapshot
    expect(useHistoryStore.getState().snapshots).toHaveLength(snapshotsBefore)
    // Store value remains valid
    expect(Number.isFinite(getRadius(layer.id))).toBe(true)
    expect(getRadius(layer.id)).toBe(100)
  })

  it('Test 7: transform X field follows same grouped-history contract', async () => {
    const user = userEvent.setup()
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(layer)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    render(<RingInspector layer={layer} />)

    const input = screen.getByLabelText('X')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '10')
    await user.clear(input)
    await user.type(input, '50')
    await user.clear(input)
    await user.type(input, '100')
    await user.tab()

    // Exactly one history entry for the transform edit
    const ptrAfterCommit = useHistoryStore.getState().pointer
    expect(ptrAfterCommit).toBe(2)
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(100)

    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
  })
})
