import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_HISTORY_DEPTH } from '../constants'
import { createDefaultProject, createRingLayer } from '../utils/factories'
import { useEditorStore } from './editor'
import { useHistoryStore, selectCanUndo, selectCanRedo } from './history'
import { useProjectStore } from './project'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getHistory = () => useHistoryStore.getState()
const getProject = () => useProjectStore.getState().project
const getLayers = () => useProjectStore.getState().project.layers

function makeProject(title = 'Test') {
  return { ...createDefaultProject(), meta: { ...createDefaultProject().meta, title } }
}

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  const project = createDefaultProject()
  useProjectStore.setState({ project })
  useEditorStore.setState({
    selectedLayerIds: [],
    activeTool: 'select',
    gridVisible: false,
    guidesVisible: false,
    previewBackground: 'dark',
  })
  useHistoryStore.setState({ snapshots: [], pointer: -1, pendingEditSnapshot: null })
})

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with no snapshots', () => {
    expect(getHistory().snapshots).toHaveLength(0)
  })

  it('starts with pointer -1', () => {
    expect(getHistory().pointer).toBe(-1)
  })

  it('canUndo is false', () => {
    expect(selectCanUndo(getHistory())).toBe(false)
  })

  it('canRedo is false', () => {
    expect(selectCanRedo(getHistory())).toBe(false)
  })
})

// ─── initHistory ─────────────────────────────────────────────────────────────

describe('initHistory', () => {
  it('sets snapshots to [project] and pointer to 0', () => {
    const project = createDefaultProject()
    useHistoryStore.getState().initHistory(project)
    expect(getHistory().snapshots).toHaveLength(1)
    expect(getHistory().pointer).toBe(0)
  })

  it('canUndo remains false after init', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    expect(selectCanUndo(getHistory())).toBe(false)
  })

  it('canRedo remains false after init', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    expect(selectCanRedo(getHistory())).toBe(false)
  })

  it('resets existing history on re-init', () => {
    const p0 = createDefaultProject()
    useHistoryStore.getState().initHistory(p0)
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(getHistory().snapshots).toHaveLength(2)
    useHistoryStore.getState().initHistory(createDefaultProject())
    expect(getHistory().snapshots).toHaveLength(1)
    expect(getHistory().pointer).toBe(0)
  })
})

// ─── pushSnapshot ─────────────────────────────────────────────────────────────

describe('pushSnapshot', () => {
  beforeEach(() => {
    useHistoryStore.getState().initHistory(createDefaultProject())
  })

  it('increases snapshot count', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(getHistory().snapshots).toHaveLength(2)
  })

  it('advances pointer to new snapshot', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(getHistory().pointer).toBe(1)
  })

  it('canUndo becomes true after first push', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(selectCanUndo(getHistory())).toBe(true)
  })

  it('canRedo stays false after push', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(selectCanRedo(getHistory())).toBe(false)
  })

  it('stores multiple sequential snapshots', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().pushSnapshot(makeProject('B'))
    useHistoryStore.getState().pushSnapshot(makeProject('C'))
    expect(getHistory().snapshots).toHaveLength(4)
    expect(getHistory().pointer).toBe(3)
  })

  it('does not mutate stored snapshots when later snapshots are pushed', () => {
    const p1 = makeProject('One')
    useHistoryStore.getState().pushSnapshot(p1)
    const storedRef = getHistory().snapshots[1]
    useHistoryStore.getState().pushSnapshot(makeProject('Two'))
    expect(getHistory().snapshots[1]).toBe(storedRef)
    expect(getHistory().snapshots[1].meta.title).toBe('One')
  })
})

// ─── undo ────────────────────────────────────────────────────────────────────

describe('undo', () => {
  beforeEach(() => {
    useHistoryStore.getState().initHistory(createDefaultProject())
  })

  it('does nothing when canUndo is false', () => {
    expect(selectCanUndo(getHistory())).toBe(false)
    useHistoryStore.getState().undo()
    expect(getHistory().pointer).toBe(0)
  })

  it('decrements pointer', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(getHistory().pointer).toBe(1)
    useHistoryStore.getState().undo()
    expect(getHistory().pointer).toBe(0)
  })

  it('restores the project to the previous snapshot', () => {
    const p0 = createDefaultProject()
    useProjectStore.setState({ project: p0 })
    useHistoryStore.getState().initHistory(p0)
    const ring = createRingLayer({ name: 'MyRing' })
    useProjectStore.getState().addLayer(ring)
    const p1 = useProjectStore.getState().project
    useHistoryStore.getState().pushSnapshot(p1)
    expect(getLayers()).toHaveLength(1)
    useHistoryStore.getState().undo()
    expect(getLayers()).toHaveLength(0)
  })

  it('restores exact layer IDs after undo of delete', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().removeLayer(ring.id)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(getLayers()[0].id).toBe(ring.id)
  })

  it('canUndo becomes false at the oldest state', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().undo()
    expect(selectCanUndo(getHistory())).toBe(false)
  })

  it('canRedo becomes true after undo', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().undo()
    expect(selectCanRedo(getHistory())).toBe(true)
  })

  it('does not go below pointer 0 on repeated undo', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().undo()
    useHistoryStore.getState().undo()
    useHistoryStore.getState().undo()
    expect(getHistory().pointer).toBe(0)
  })

  it('prunes selection to valid layer IDs after undo', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useEditorStore.getState().selectLayer(ring.id)
    expect(useEditorStore.getState().selectedLayerIds).toContain(ring.id)
    // Undo removes the ring → selection should be pruned
    useHistoryStore.getState().undo()
    expect(useEditorStore.getState().selectedLayerIds).not.toContain(ring.id)
  })
})

// ─── redo ────────────────────────────────────────────────────────────────────

describe('redo', () => {
  beforeEach(() => {
    useHistoryStore.getState().initHistory(createDefaultProject())
  })

  it('does nothing when canRedo is false', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    expect(selectCanRedo(getHistory())).toBe(false)
    useHistoryStore.getState().redo()
    expect(getHistory().pointer).toBe(1)
  })

  it('increments pointer', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().undo()
    useHistoryStore.getState().redo()
    expect(getHistory().pointer).toBe(1)
  })

  it('restores the project to the redo snapshot', () => {
    const p0 = createDefaultProject()
    useProjectStore.setState({ project: p0 })
    useHistoryStore.getState().initHistory(p0)
    const ring = createRingLayer({ name: 'MyRing' })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(getLayers()).toHaveLength(0)
    useHistoryStore.getState().redo()
    expect(getLayers()).toHaveLength(1)
    expect(getLayers()[0].name).toBe('MyRing')
  })

  it('restores exact layer ID on redo', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    useHistoryStore.getState().redo()
    expect(getLayers()[0].id).toBe(ring.id)
  })

  it('canRedo becomes false at the newest state', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().undo()
    useHistoryStore.getState().redo()
    expect(selectCanRedo(getHistory())).toBe(false)
  })

  it('canUndo becomes true after redo', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().undo()
    expect(selectCanUndo(getHistory())).toBe(false)
    useHistoryStore.getState().redo()
    expect(selectCanUndo(getHistory())).toBe(true)
  })

  it('does not exceed pointer at newest snapshot', () => {
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().redo()
    useHistoryStore.getState().redo()
    expect(getHistory().pointer).toBe(1)
  })

  it('prunes selection after redo', () => {
    // Start: ring exists, add to history
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    // Delete ring
    useProjectStore.getState().removeLayer(ring.id)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    // Undo: ring back, select it
    useHistoryStore.getState().undo()
    useEditorStore.getState().selectLayer(ring.id)
    // Redo: ring deleted again → selection should be pruned
    useHistoryStore.getState().redo()
    expect(useEditorStore.getState().selectedLayerIds).not.toContain(ring.id)
  })
})

// ─── Branching after undo + new edit ──────────────────────────────────────────

describe('branch truncation', () => {
  it('discards redo branch when a new snapshot is pushed after undo', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().pushSnapshot(makeProject('B'))
    useHistoryStore.getState().pushSnapshot(makeProject('C'))
    // 4 snapshots: [initial, A, B, C], pointer=3
    useHistoryStore.getState().undo() // pointer=2 (at B)
    useHistoryStore.getState().pushSnapshot(makeProject('D'))
    // Redo to C must now be impossible
    expect(selectCanRedo(getHistory())).toBe(false)
    expect(getHistory().snapshots).toHaveLength(4) // [initial, A, B, D]
    expect((getHistory().snapshots[3] as { meta: { title: string } }).meta.title).toBe('D')
  })

  it('redo is unavailable after branch edit', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().pushSnapshot(makeProject('B'))
    useHistoryStore.getState().undo()
    useHistoryStore.getState().pushSnapshot(makeProject('D'))
    expect(selectCanRedo(getHistory())).toBe(false)
  })

  it('new branch pointer is at newest snapshot', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    useHistoryStore.getState().pushSnapshot(makeProject('A'))
    useHistoryStore.getState().pushSnapshot(makeProject('B'))
    useHistoryStore.getState().undo()
    useHistoryStore.getState().pushSnapshot(makeProject('D'))
    expect(getHistory().pointer).toBe(getHistory().snapshots.length - 1)
  })
})

// ─── MAX_HISTORY_DEPTH ────────────────────────────────────────────────────────

describe('MAX_HISTORY_DEPTH enforcement', () => {
  it('never exceeds MAX_HISTORY_DEPTH snapshots', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    for (let i = 0; i < MAX_HISTORY_DEPTH + 10; i++) {
      useHistoryStore.getState().pushSnapshot(makeProject(`Step ${i}`))
    }
    expect(getHistory().snapshots.length).toBeLessThanOrEqual(MAX_HISTORY_DEPTH)
  })

  it('discards oldest snapshots when cap is exceeded', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    // Push MAX_HISTORY_DEPTH snapshots → with initHistory snapshot, that would be MAX+1
    // Push MAX_HISTORY_DEPTH - 1 more to stay at MAX after trim
    for (let i = 0; i < MAX_HISTORY_DEPTH; i++) {
      useHistoryStore.getState().pushSnapshot(makeProject(`Step ${i}`))
    }
    // Now at MAX_HISTORY_DEPTH (exactly). Add one more to trigger trim.
    useHistoryStore.getState().pushSnapshot(makeProject('Over limit'))
    expect(getHistory().snapshots).toHaveLength(MAX_HISTORY_DEPTH)
  })

  it('pointer stays valid after cap trim', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    for (let i = 0; i < MAX_HISTORY_DEPTH + 5; i++) {
      useHistoryStore.getState().pushSnapshot(makeProject(`Step ${i}`))
    }
    const { pointer, snapshots } = getHistory()
    expect(pointer).toBe(snapshots.length - 1)
    expect(pointer).toBeGreaterThanOrEqual(0)
  })

  it('undo stops safely at the oldest retained snapshot', () => {
    useHistoryStore.getState().initHistory(createDefaultProject())
    for (let i = 0; i < MAX_HISTORY_DEPTH + 5; i++) {
      useHistoryStore.getState().pushSnapshot(makeProject(`Step ${i}`))
    }
    // Undo many times — should not throw or go below 0
    for (let i = 0; i < MAX_HISTORY_DEPTH + 10; i++) {
      useHistoryStore.getState().undo()
    }
    expect(getHistory().pointer).toBe(0)
  })

  it('keeps the newest MAX_HISTORY_DEPTH snapshots after trim', () => {
    useHistoryStore.getState().initHistory(makeProject('initial'))
    for (let i = 0; i < MAX_HISTORY_DEPTH; i++) {
      useHistoryStore.getState().pushSnapshot(makeProject(`Step ${i}`))
    }
    // The oldest should be gone, the newest should be 'Step 49'
    const snapshots = getHistory().snapshots as unknown as Array<{ meta: { title: string } }>
    const lastTitle = snapshots[snapshots.length - 1].meta.title
    expect(lastTitle).toBe(`Step ${MAX_HISTORY_DEPTH - 1}`)
  })
})

// ─── Inspector begin/commit ────────────────────────────────────────────────────

describe('beginInspectorEdit / commitInspectorEdit', () => {
  beforeEach(() => {
    useHistoryStore.getState().initHistory(createDefaultProject())
  })

  it('beginInspectorEdit captures a structural copy of the current project', () => {
    const before = getProject()
    useHistoryStore.getState().beginInspectorEdit()
    // Deep clone — structurally equal but not the same reference
    expect(getHistory().pendingEditSnapshot).toEqual(before)
    expect(getHistory().pendingEditSnapshot).not.toBe(before)
  })

  it('commitInspectorEdit pushes a snapshot when project changed', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 42 })
    const snapshotsBefore = getHistory().snapshots.length
    useHistoryStore.getState().commitInspectorEdit()
    expect(getHistory().snapshots).toHaveLength(snapshotsBefore + 1)
  })

  it('commitInspectorEdit does NOT push when project unchanged', () => {
    useHistoryStore.getState().beginInspectorEdit()
    const snapshotsBefore = getHistory().snapshots.length
    useHistoryStore.getState().commitInspectorEdit()
    expect(getHistory().snapshots).toHaveLength(snapshotsBefore)
  })

  it('commitInspectorEdit clears pendingEditSnapshot', () => {
    useHistoryStore.getState().beginInspectorEdit()
    useHistoryStore.getState().commitInspectorEdit()
    expect(getHistory().pendingEditSnapshot).toBeNull()
  })

  it('commitInspectorEdit is a no-op when no begin was called', () => {
    const snapshotsBefore = getHistory().snapshots.length
    useHistoryStore.getState().commitInspectorEdit()
    expect(getHistory().snapshots).toHaveLength(snapshotsBefore)
  })

  it('multiple rapid changes with one commit produce one history entry', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().beginInspectorEdit()
    // Simulate rapid typing: multiple onChange calls
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 10 })
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 100 })
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 200 })
    const countBefore = getHistory().snapshots.length
    useHistoryStore.getState().commitInspectorEdit()
    expect(getHistory().snapshots).toHaveLength(countBefore + 1)
  })

  it('undo after inspector commit restores pre-edit value', () => {
    const ring = createRingLayer({ radius: 300 })
    useProjectStore.getState().addLayer(ring)
    const p0 = useProjectStore.getState().project
    useHistoryStore.getState().pushSnapshot(p0) // baseline after add
    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 42 })
    useHistoryStore.getState().commitInspectorEdit()
    expect(useProjectStore.getState().project.layers[0]).toMatchObject({ radius: 42 })
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().project.layers[0]).toMatchObject({ radius: 300 })
  })

  it('redo after undo restores edited value', () => {
    const ring = createRingLayer({ radius: 300 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 42 })
    useHistoryStore.getState().commitInspectorEdit()
    useHistoryStore.getState().undo()
    useHistoryStore.getState().redo()
    expect(useProjectStore.getState().project.layers[0]).toMatchObject({ radius: 42 })
  })

  it('second beginInspectorEdit during active session does not overwrite baseline', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    useHistoryStore.getState().beginInspectorEdit()
    const baseline = getHistory().pendingEditSnapshot

    // Simulate spurious focus event (React controlled-input re-render) mid-edit
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    useHistoryStore.getState().beginInspectorEdit() // must be a no-op

    // Same reference — beginInspectorEdit did not call set()
    expect(getHistory().pendingEditSnapshot).toBe(baseline)
  })

  it('undo clears pendingEditSnapshot to prevent stale inspector commits', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    // Undo fires before blur (e.g., user somehow triggers undo via other means)
    useHistoryStore.getState().undo()

    expect(getHistory().pendingEditSnapshot).toBeNull()
    // Subsequent stale commit is a safe no-op
    const countBefore = getHistory().snapshots.length
    useHistoryStore.getState().commitInspectorEdit()
    expect(getHistory().snapshots).toHaveLength(countBefore)
  })

  it('redo clears pendingEditSnapshot', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 42 })
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()

    useHistoryStore.getState().beginInspectorEdit()
    expect(getHistory().pendingEditSnapshot).not.toBeNull()

    useHistoryStore.getState().redo()
    expect(getHistory().pendingEditSnapshot).toBeNull()
  })
})

// ─── Bug regression: inspector undo must not jump to empty project ─────────────

describe('inspector history — bug regression', () => {
  const getRadius = () => {
    const l = getLayers()[0]
    return l?.type === 'ring' ? l.radius : null
  }

  beforeEach(() => {
    useHistoryStore.getState().initHistory(createDefaultProject())
  })

  it('single undo after multi-change inspector edit restores ring, not empty project', () => {
    const p0 = useProjectStore.getState().project
    // Snapshot 0: empty project (already done in initHistory above)

    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    // Snapshot 1: ring at radius 100

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 120 })
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 150 })
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    useHistoryStore.getState().commitInspectorEdit()
    // Snapshot 2: ring at radius 180

    expect(getHistory().snapshots).toHaveLength(3)
    expect(getHistory().pointer).toBe(2)
    expect(getRadius()).toBe(180)

    // ONE undo — ring must still exist
    useHistoryStore.getState().undo()
    expect(getLayers()).toHaveLength(1)
    expect(getRadius()).toBe(100)
    // The empty project (snapshot 0) must NOT have been restored
    expect(JSON.stringify(getProject())).not.toBe(JSON.stringify(p0))
  })

  it('undo/redo alternates deterministically between pre-edit and post-edit radius', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 120 })
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    useHistoryStore.getState().commitInspectorEdit()

    // Alternate four times — must be deterministic
    useHistoryStore.getState().undo()
    expect(getRadius()).toBe(100)
    useHistoryStore.getState().redo()
    expect(getRadius()).toBe(180)
    useHistoryStore.getState().undo()
    expect(getRadius()).toBe(100)
    useHistoryStore.getState().redo()
    expect(getRadius()).toBe(180)
  })

  it('canRedo remains true after undo without any new edit', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    useHistoryStore.getState().commitInspectorEdit()

    useHistoryStore.getState().undo()
    expect(selectCanRedo(getHistory())).toBe(true)
    // Nothing else happens — redo branch must stay intact
    expect(selectCanRedo(getHistory())).toBe(true)
    useHistoryStore.getState().redo()
    expect(getRadius()).toBe(180)
  })

  it('redo branch is discarded only when a genuine new edit occurs after undo', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    useHistoryStore.getState().commitInspectorEdit()

    useHistoryStore.getState().undo() // back to r100
    expect(selectCanRedo(getHistory())).toBe(true)

    // Genuine new edit — this should discard the r180 branch
    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 140 })
    useHistoryStore.getState().commitInspectorEdit()

    expect(selectCanRedo(getHistory())).toBe(false)
    expect(getRadius()).toBe(140)
  })

  it('spurious beginInspectorEdit mid-session does not cause missed history entry', () => {
    const ring = createRingLayer({ radius: 100 })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    const snapshotsBefore = getHistory().snapshots.length

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateRingLayer(ring.id, { radius: 180 })
    // Simulate spurious onFocus (React re-render during typing)
    useHistoryStore.getState().beginInspectorEdit() // must be no-op
    useHistoryStore.getState().commitInspectorEdit()

    // One snapshot MUST have been pushed
    expect(getHistory().snapshots).toHaveLength(snapshotsBefore + 1)
    expect(getRadius()).toBe(180)
  })

  it('transform field edit follows same grouped-history contract', () => {
    const ring = createRingLayer({ transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    useHistoryStore.getState().beginInspectorEdit()
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 10 })
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 50 })
    useProjectStore.getState().updateLayerTransform(ring.id, { x: 100 })
    useHistoryStore.getState().commitInspectorEdit()

    const afterCommit = getHistory().pointer
    expect(getLayers()[0].transform.x).toBe(100)

    useHistoryStore.getState().undo()
    expect(getLayers()[0].transform.x).toBe(0)
    expect(getHistory().pointer).toBe(afterCommit - 1)
  })
})

// ─── Restore contract ─────────────────────────────────────────────────────────

describe('project restoration', () => {
  beforeEach(() => {
    useHistoryStore.getState().initHistory(createDefaultProject())
  })

  it('restores layer order after reorder + undo', () => {
    const a = createRingLayer({ name: 'A' })
    const b = createRingLayer({ name: 'B' })
    const c = createRingLayer({ name: 'C' })
    useProjectStore.getState().addLayer(a)
    useProjectStore.getState().addLayer(b)
    useProjectStore.getState().addLayer(c)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().reorderLayers(0, 2) // move A to index 2
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(getLayers().map((l) => l.name)).toEqual(['A', 'B', 'C'])
  })

  it('restores visibility after toggle + undo', () => {
    const ring = createRingLayer({ visible: true })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().toggleLayerVisibility(ring.id)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(getLayers()[0].visible).toBe(true)
  })

  it('restores lock state after toggle + undo', () => {
    const ring = createRingLayer({ locked: false })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().toggleLayerLock(ring.id)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(getLayers()[0].locked).toBe(false)
  })

  it('restores transform after center + undo', () => {
    const ring = createRingLayer({ transform: { x: 99, y: 77, rotation: 0, scaleX: 1, scaleY: 1 } })
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().centerLayer(ring.id)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(getLayers()[0].transform).toMatchObject({ x: 99, y: 77 })
  })
})
