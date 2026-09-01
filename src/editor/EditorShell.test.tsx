import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../store/editor'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import { useViewportStore } from '../store/viewport'
import { createDefaultProject, createRingLayer } from '../utils/factories'
import EditorShell from './EditorShell'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useProjectStore.setState({ project: createDefaultProject() })
  useViewportStore.setState({
    centerX: 0,
    centerY: 0,
    zoom: 1,
    viewportWidth: 0,
    viewportHeight: 0,
  })
  useEditorStore.setState({
    selectedLayerIds: [],
    activeTool: 'select',
    gridVisible: false,
    guidesVisible: false,
    previewBackground: 'dark',
  })
  useHistoryStore.setState({ snapshots: [], pointer: -1, pendingEditSnapshot: null })
})

describe('layout regions', () => {
  it('renders the editor shell container', () => {
    render(<EditorShell />)
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument()
  })

  it('renders the application toolbar', () => {
    render(<EditorShell />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders the tool navigation', () => {
    render(<EditorShell />)
    expect(screen.getByRole('navigation', { name: 'Tools' })).toBeInTheDocument()
  })

  it('renders the canvas workspace', () => {
    render(<EditorShell />)
    expect(screen.getByRole('main', { name: 'Canvas workspace' })).toBeInTheDocument()
  })

  it('renders the layers and properties sidebar', () => {
    render(<EditorShell />)
    expect(screen.getByRole('complementary', { name: 'Layers and Properties' })).toBeInTheDocument()
  })

  it('renders the status bar', () => {
    render(<EditorShell />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})

describe('top bar', () => {
  it('displays the product name', () => {
    render(<EditorShell />)
    expect(screen.getByText('Magic Circle Editor')).toBeInTheDocument()
  })

  it('displays the current project name', () => {
    render(<EditorShell />)
    expect(screen.getByLabelText('Current project')).toHaveTextContent('Untitled')
  })

  it('renders all top-bar action buttons', () => {
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('all top-bar actions are disabled', () => {
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'New' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })
})

describe('tool rail', () => {
  it('renders all tool buttons', () => {
    render(<EditorShell />)
    expect(screen.getByRole('navigation', { name: 'Tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Ring' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Radial Lines' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit View' })).toBeInTheDocument()
  })

  it('Select, Add Ring, Pan and Fit View are enabled in Phase 5', () => {
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Select' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Ring' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pan' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Fit View' })).not.toBeDisabled()
  })

  it('Radial Lines tool remains disabled in Phase 5', () => {
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Add Radial Lines' })).toBeDisabled()
  })
})

describe('right sidebar tabs', () => {
  it('renders Layers and Properties tabs', () => {
    render(<EditorShell />)
    expect(screen.getByRole('tab', { name: 'Layers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Properties' })).toBeInTheDocument()
  })

  it('Layers tab is selected initially', () => {
    render(<EditorShell />)
    expect(screen.getByRole('tab', { name: 'Layers' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Properties' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('Layers panel is visible initially', () => {
    render(<EditorShell />)
    expect(screen.getByTestId('panel-layers')).toBeVisible()
  })

  it('Properties panel is not visible initially', () => {
    render(<EditorShell />)
    expect(screen.getByTestId('panel-properties')).not.toBeVisible()
  })

  it('clicking Properties tab shows the Properties panel', async () => {
    const user = userEvent.setup()
    render(<EditorShell />)
    await user.click(screen.getByRole('tab', { name: 'Properties' }))
    expect(screen.getByTestId('panel-properties')).toBeVisible()
    expect(screen.getByTestId('panel-layers')).not.toBeVisible()
  })

  it('clicking Properties then Layers restores the Layers panel', async () => {
    const user = userEvent.setup()
    render(<EditorShell />)
    await user.click(screen.getByRole('tab', { name: 'Properties' }))
    await user.click(screen.getByRole('tab', { name: 'Layers' }))
    expect(screen.getByTestId('panel-layers')).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Layers' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('layers panel', () => {
  it('shows the empty state when there are no layers', () => {
    render(<EditorShell />)
    expect(screen.getByText('No layers yet. Add a Ring or Radial Lines.')).toBeInTheDocument()
  })
})

describe('layers panel — lock control', () => {
  it('renders a lock button for each layer', () => {
    const layer = createRingLayer({ name: 'Ring' })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Lock Ring' })).toBeInTheDocument()
  })

  it('lock button label is "Lock {name}" when layer is unlocked', () => {
    const layer = createRingLayer({ name: 'Ring', locked: false })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Lock Ring' })).toBeInTheDocument()
  })

  it('lock button label is "Unlock {name}" when layer is locked', () => {
    const layer = createRingLayer({ name: 'Ring', locked: true })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Unlock Ring' })).toBeInTheDocument()
  })

  it('clicking lock button sets layer.locked = true', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring', locked: false })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Lock Ring' }))
    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.locked).toBe(true)
  })

  it('clicking lock button again unlocks the layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring', locked: true })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Unlock Ring' }))
    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.locked).toBe(false)
  })

  it('locking one ring does not lock another', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'Ring A', locked: false })
    const layerB = createRingLayer({ name: 'Ring B', locked: false })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layerA, layerB] },
    })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Lock Ring A' }))
    const stateA = useProjectStore.getState().project.layers.find((l) => l.id === layerA.id)
    const stateB = useProjectStore.getState().project.layers.find((l) => l.id === layerB.id)
    expect(stateA?.locked).toBe(true)
    expect(stateB?.locked).toBe(false)
  })

  it('visibility toggle still works alongside lock control', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring', visible: true, locked: false })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Hide Ring' }))
    const updated = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
    expect(updated?.visible).toBe(false)
    expect(updated?.locked).toBe(false)
  })

  it('clicking lock button does not change selection', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring', locked: false })
    useProjectStore.setState({
      project: { ...createDefaultProject(), layers: [layer] },
    })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Lock Ring' }))
    expect(useEditorStore.getState().selectedLayerIds).toEqual([])
  })
})

describe('properties panel', () => {
  it('shows the empty state message after switching to Properties', async () => {
    const user = userEvent.setup()
    render(<EditorShell />)
    await user.click(screen.getByRole('tab', { name: 'Properties' }))
    expect(screen.getByText('Select a layer to edit its properties.')).toBeVisible()
  })
})

describe('status bar', () => {
  it('displays the canvas dimensions', () => {
    render(<EditorShell />)
    expect(screen.getByRole('contentinfo')).toHaveTextContent('1000')
  })

  it('displays the zoom level as a percentage', () => {
    render(<EditorShell />)
    // Initial zoom=1 → "100%" (zoom updates via ResizeObserver which is absent in jsdom)
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%')
  })

  it('displays the layer count', () => {
    render(<EditorShell />)
    expect(screen.getByLabelText('Layer count')).toHaveTextContent('0 layers')
  })
})

describe('layers panel — action bar', () => {
  it('Duplicate button is disabled when no layer is selected', () => {
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Duplicate selected layer' })).toBeDisabled()
  })

  it('Delete button is disabled when no layer is selected', () => {
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Delete selected layer' })).toBeDisabled()
  })

  it('Center button is disabled when no layer is selected', () => {
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Center selected layer on canvas' })).toBeDisabled()
  })

  it('Duplicate, Delete, Center buttons are enabled when a layer is selected', () => {
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Duplicate selected layer' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete selected layer' })).not.toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Center selected layer on canvas' })
    ).not.toBeDisabled()
  })

  it('clicking Delete removes the selected layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Delete selected layer' }))
    expect(useProjectStore.getState().project.layers).toHaveLength(0)
  })

  it('clicking Delete clears selection', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Delete selected layer' }))
    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('clicking Duplicate adds a layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Duplicate selected layer' }))
    expect(useProjectStore.getState().project.layers).toHaveLength(2)
  })

  it('clicking Duplicate selects the new layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Duplicate selected layer' }))
    const layers = useProjectStore.getState().project.layers
    const newId = layers.find((l) => l.id !== layer.id)?.id
    expect(useEditorStore.getState().selectedLayerIds).toContain(newId)
  })

  it('clicking Center sets transform.x and transform.y to 0', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({
      transform: { x: 150, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Center selected layer on canvas' }))
    const t = useProjectStore.getState().project.layers[0].transform
    expect(t.x).toBe(0)
    expect(t.y).toBe(0)
  })

  it('clicking Center preserves rotation and scale', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({
      transform: { x: 100, y: 100, rotation: 45, scaleX: 2, scaleY: 3 },
    })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.click(screen.getByRole('button', { name: 'Center selected layer on canvas' }))
    const t = useProjectStore.getState().project.layers[0].transform
    expect(t.rotation).toBe(45)
    expect(t.scaleX).toBe(2)
    expect(t.scaleY).toBe(3)
  })
})

describe('layers panel — Center and lock interaction', () => {
  it('Center button is disabled when selected layer is locked', () => {
    const layer = createRingLayer({ locked: true })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Center selected layer on canvas' })).toBeDisabled()
  })

  it('Center button is enabled when selected layer is unlocked', () => {
    const layer = createRingLayer({ locked: false })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    expect(
      screen.getByRole('button', { name: 'Center selected layer on canvas' })
    ).not.toBeDisabled()
  })

  it('unlocking a layer re-enables the Center button', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Ring', locked: true })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    expect(screen.getByRole('button', { name: 'Center selected layer on canvas' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Unlock Ring' }))
    expect(
      screen.getByRole('button', { name: 'Center selected layer on canvas' })
    ).not.toBeDisabled()
  })

  it('locked layer transform is not changed by centerLayer store action', () => {
    const layer = createRingLayer({
      locked: true,
      transform: { x: 77, y: 88, rotation: 30, scaleX: 2, scaleY: 2 },
    })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useProjectStore.getState().centerLayer(layer.id)
    const t = useProjectStore.getState().project.layers[0].transform
    expect(t.x).toBe(77)
    expect(t.y).toBe(88)
    expect(t.rotation).toBe(30)
    expect(t.scaleX).toBe(2)
    expect(t.scaleY).toBe(2)
  })
})

describe('layers panel — inline rename', () => {
  it('double-clicking a layer name shows a rename input', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'My Ring' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer My Ring' }))
    expect(screen.getByTestId('layer-rename-input')).toBeInTheDocument()
  })

  it('rename input is pre-filled with the current name', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'My Ring' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer My Ring' }))
    const input = screen.getByTestId('layer-rename-input') as HTMLInputElement
    expect(input.value).toBe('My Ring')
  })

  it('pressing Enter commits the new name', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Old Name' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer Old Name' }))
    const input = screen.getByTestId('layer-rename-input')
    await user.clear(input)
    await user.type(input, 'New Name')
    await user.keyboard('{Enter}')
    expect(useProjectStore.getState().project.layers[0].name).toBe('New Name')
  })

  it('pressing Escape cancels without renaming', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Original' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer Original' }))
    const input = screen.getByTestId('layer-rename-input')
    await user.clear(input)
    await user.type(input, 'Discarded')
    await user.keyboard('{Escape}')
    expect(useProjectStore.getState().project.layers[0].name).toBe('Original')
  })

  it('empty name on Enter does not rename', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'Keep This' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer Keep This' }))
    const input = screen.getByTestId('layer-rename-input')
    await user.clear(input)
    await user.keyboard('{Enter}')
    expect(useProjectStore.getState().project.layers[0].name).toBe('Keep This')
  })
})

describe('EditorShell — Delete key handler', () => {
  it('pressing Delete with a selected layer removes it', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.keyboard('{Delete}')
    expect(useProjectStore.getState().project.layers).toHaveLength(0)
  })

  it('pressing Delete with no selection is a no-op', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.keyboard('{Delete}')
    expect(useProjectStore.getState().project.layers).toHaveLength(1)
  })

  it('pressing Delete clears selection', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.keyboard('{Delete}')
    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('pressing Delete while renaming does not delete the layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ name: 'My Ring' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer My Ring' }))
    await user.keyboard('{Delete}')
    expect(useProjectStore.getState().project.layers).toHaveLength(1)
  })
})

describe('store read-only access', () => {
  it('reads the project title without mutating the store', () => {
    const before = useProjectStore.getState().project.meta.title
    render(<EditorShell />)
    const after = useProjectStore.getState().project.meta.title
    expect(after).toBe(before)
  })

  it('reads canvas dimensions without mutating the store', () => {
    const before = useProjectStore.getState().project.canvas
    render(<EditorShell />)
    const after = useProjectStore.getState().project.canvas
    expect(after).toStrictEqual(before)
  })
})

// ─── Phase 8: keyboard shortcuts ─────────────────────────────────────────────

describe('EditorShell — Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (undo/redo)', () => {
  it('Ctrl+Z undoes the last action', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
    await user.keyboard('{Control>}z{/Control}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
  })

  it('Ctrl+Shift+Z redoes after undo', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Control>}z{/Control}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })

  it('Ctrl+Y redoes after undo', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}y{/Control}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })

  it('Ctrl+Z is no-op when nothing to undo', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{Control>}z{/Control}')
    expect(useProjectStore.getState().project.layers).toHaveLength(1)
  })

  it('Ctrl+Z is ignored when editable element is focused', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({
      name: 'My Ring',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    // Focus rename input (editable element)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer My Ring' }))
    await user.keyboard('{Control>}z{/Control}')
    // Project undo should NOT fire — x still 1
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })
})

describe('EditorShell — Ctrl+D (duplicate)', () => {
  it('Ctrl+D duplicates the selected layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{Control>}d{/Control}')
    expect(useProjectStore.getState().project.layers).toHaveLength(2)
  })

  it('Ctrl+D selects the new duplicate', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{Control>}d{/Control}')
    const layers = useProjectStore.getState().project.layers
    const newId = layers.find((l) => l.id !== layer.id)?.id
    expect(useEditorStore.getState().selectedLayerIds).toContain(newId)
  })

  it('Ctrl+D pushes a history snapshot', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{Control>}d{/Control}')
    const { snapshots, pointer } = useHistoryStore.getState()
    expect(pointer).toBe(1)
    expect(snapshots).toHaveLength(2)
  })

  it('Ctrl+D with no selection is a no-op', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.keyboard('{Control>}d{/Control}')
    expect(useProjectStore.getState().project.layers).toHaveLength(1)
  })
})

describe('EditorShell — Backspace (delete)', () => {
  it('Backspace removes the selected layer', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.keyboard('{Backspace}')
    expect(useProjectStore.getState().project.layers).toHaveLength(0)
  })

  it('Backspace clears selection after delete', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.keyboard('{Backspace}')
    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('Backspace with no selection is a no-op', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.keyboard('{Backspace}')
    expect(useProjectStore.getState().project.layers).toHaveLength(1)
  })
})

describe('EditorShell — Arrow nudge', () => {
  it('ArrowRight nudges x by +1', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })

  it('ArrowLeft nudges x by -1', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowLeft}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(-1)
  })

  it('ArrowDown nudges y by +1', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowDown}')
    expect(useProjectStore.getState().project.layers[0].transform.y).toBe(1)
  })

  it('ArrowUp nudges y by -1', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowUp}')
    expect(useProjectStore.getState().project.layers[0].transform.y).toBe(-1)
  })

  it('Shift+ArrowRight nudges x by +10', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(10)
  })

  it('Shift+ArrowUp nudges y by -10', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(useProjectStore.getState().project.layers[0].transform.y).toBe(-10)
  })

  it('Arrow nudge pushes a history snapshot', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    expect(useHistoryStore.getState().pointer).toBe(1)
  })

  it('Arrow keys ignored when rename input is focused', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({
      name: 'My Ring',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer My Ring' }))
    await user.keyboard('{ArrowRight}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
  })

  it('locked layer cannot be nudged via arrow keys', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({
      locked: true,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
  })

  it('Arrow with no selection is a safe no-op', async () => {
    const user = userEvent.setup()
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.keyboard('{ArrowRight}')
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
  })
})

describe('EditorShell — Tab layer cycling', () => {
  it('Tab with no selection selects the first layer', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'A' })
    const layerB = createRingLayer({ name: 'B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.keyboard('{Tab}')
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerA.id)
  })

  it('Tab advances to the next layer', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'A' })
    const layerB = createRingLayer({ name: 'B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [layerA.id] })
    render(<EditorShell />)
    await user.keyboard('{Tab}')
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerB.id)
  })

  it('Tab wraps from last layer to first', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'A' })
    const layerB = createRingLayer({ name: 'B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [layerB.id] })
    render(<EditorShell />)
    await user.keyboard('{Tab}')
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerA.id)
  })

  it('Shift+Tab with no selection selects the last layer', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'A' })
    const layerB = createRingLayer({ name: 'B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [] })
    render(<EditorShell />)
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerB.id)
  })

  it('Shift+Tab moves to the previous layer', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'A' })
    const layerB = createRingLayer({ name: 'B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [layerB.id] })
    render(<EditorShell />)
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerA.id)
  })

  it('Shift+Tab wraps from first layer to last', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'A' })
    const layerB = createRingLayer({ name: 'B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [layerA.id] })
    render(<EditorShell />)
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerB.id)
  })

  it('Tab with no layers is a safe no-op', async () => {
    const user = userEvent.setup()
    useProjectStore.setState({ project: createDefaultProject() })
    render(<EditorShell />)
    await expect(user.keyboard('{Tab}')).resolves.toBeUndefined()
  })

  it('Tab does not cycle layers when rename input is focused', async () => {
    const user = userEvent.setup()
    const layerA = createRingLayer({ name: 'Ring A' })
    const layerB = createRingLayer({ name: 'Ring B' })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layerA, layerB] } })
    useEditorStore.setState({ selectedLayerIds: [layerA.id] })
    render(<EditorShell />)
    await user.dblClick(screen.getByRole('button', { name: 'Select layer Ring A' }))
    await user.keyboard('{Tab}')
    // Tab in rename input moves focus to next input, not layer cycling
    expect(useEditorStore.getState().selectedLayerIds).toContain(layerA.id)
  })
})

describe('EditorShell — keyboard shortcut key-case regression', () => {
  // These tests dispatch realistic KeyboardEvents that match what a real browser
  // sends: Shift held → key is uppercase. userEvent.keyboard does not reliably
  // produce uppercase keys with Shift, so we dispatch manually.

  it('Ctrl+Shift+Z with key="Z" (uppercase, real browser) triggers redo', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)

    // Create a history entry via arrow nudge
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)

    // Undo
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)

    // Redo via Ctrl+Shift+Z with uppercase 'Z' — the real browser value
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })

  it('Ctrl+Z with key="z" (no shift) still triggers undo', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)
  })

  it('Ctrl+Y with key="y" triggers redo', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    )
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    )
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })

  it('Ctrl+D with key="d" (lowercase) duplicates', () => {
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers).toHaveLength(2)
  })

  it('Ctrl+D with key="D" (Caps Lock / uppercase) also duplicates', () => {
    const layer = createRingLayer()
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers).toHaveLength(2)
  })

  it('Meta+Shift+Z (Mac) with key="Z" triggers redo', () => {
    const layer = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.setState({ project: { ...createDefaultProject(), layers: [layer] } })
    useEditorStore.setState({ selectedLayerIds: [layer.id] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    render(<EditorShell />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    )
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(0)

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Z',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
    expect(useProjectStore.getState().project.layers[0].transform.x).toBe(1)
  })
})

describe('EditorShell — Ctrl+0 Fit View', () => {
  it('Ctrl+0 does not throw', async () => {
    const user = userEvent.setup()
    render(<EditorShell />)
    await expect(user.keyboard('{Control>}0{/Control}')).resolves.toBeUndefined()
  })

  it('Ctrl+0 triggers fitView on the viewport store', async () => {
    const user = userEvent.setup()
    useViewportStore.setState({
      centerX: 0,
      centerY: 0,
      zoom: 0.1,
      viewportWidth: 1000,
      viewportHeight: 800,
    })
    render(<EditorShell />)
    await user.keyboard('{Control>}0{/Control}')
    const { zoom } = useViewportStore.getState()
    expect(zoom).toBeGreaterThan(0.1)
  })
})
