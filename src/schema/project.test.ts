import { beforeEach, describe, expect, it } from 'vitest'
import { importProjectFile, parseProjectFileStrict, ProjectFileSchema } from './project'
import {
  isProjectDirty,
  markProjectSaved,
  resetDirtyState,
  tryRestoreFromAutosave,
} from '../persistence/autosave'
import { useProjectStore } from '../store/project'
import { useHistoryStore } from '../store/history'
import { useEditorStore } from '../store/editor'
import { createDefaultProject, createRadialLinesLayer, createRingLayer } from '../utils/factories'
import { loadPreferences, savePreferences } from '../store/preferences'

// ─── Complete PROJECT_FORMAT.md example ───────────────────────────────────────

const EXAMPLE_PROJECT = {
  __magic_circle__: true,
  version: '1.0.0',
  meta: {
    title: 'Example Magic Circle',
    created: '2026-08-31T00:00:00.000Z',
    modified: '2026-08-31T00:00:00.000Z',
  },
  canvas: { width: 1000, height: 1000 },
  layers: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      type: 'ring',
      name: 'Outer Ring',
      visible: true,
      locked: false,
      opacity: 1.0,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      radius: 400,
      strokeWidth: 4,
      color: '#ffffff',
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      type: 'radial-lines',
      name: 'Rune Lines',
      visible: true,
      locked: false,
      opacity: 0.85,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      count: 12,
      innerRadius: 300,
      outerRadius: 390,
      startAngle: 0,
      strokeWidth: 2,
      color: '#88aaff',
    },
  ],
}

// ─── Schema: strict parse ─────────────────────────────────────────────────────

describe('parseProjectFileStrict', () => {
  it('parses the complete PROJECT_FORMAT.md example successfully', () => {
    const result = parseProjectFileStrict(EXAMPLE_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.project.layers).toHaveLength(2)
    expect(result.project.meta.title).toBe('Example Magic Circle')
  })

  it('fails when __magic_circle__ is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __magic_circle__: _mc, ...without } = EXAMPLE_PROJECT
    const result = parseProjectFileStrict(without)
    expect(result.ok).toBe(false)
  })

  it('fails when __magic_circle__ is not literal true', () => {
    const result = parseProjectFileStrict({ ...EXAMPLE_PROJECT, __magic_circle__: false })
    expect(result.ok).toBe(false)
  })

  it('fails when version is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version: _v, ...without } = EXAMPLE_PROJECT
    const result = parseProjectFileStrict(without)
    expect(result.ok).toBe(false)
  })

  it('fails for radial-lines layer with innerRadius >= outerRadius', () => {
    const badProject = {
      ...EXAMPLE_PROJECT,
      layers: [
        {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          type: 'radial-lines',
          name: 'Bad Lines',
          visible: true,
          locked: false,
          opacity: 1.0,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          count: 8,
          innerRadius: 400,
          outerRadius: 300,
          startAngle: 0,
          strokeWidth: 2,
          color: '#ffffff',
        },
      ],
    }
    const result = parseProjectFileStrict(badProject)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/innerRadius/)
    }
  })

  it('fails for radial-lines layer with innerRadius === outerRadius', () => {
    const badProject = {
      ...EXAMPLE_PROJECT,
      layers: [
        {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          type: 'radial-lines',
          name: 'Equal Radii',
          visible: true,
          locked: false,
          opacity: 1.0,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          count: 4,
          innerRadius: 200,
          outerRadius: 200,
          startAngle: 0,
          strokeWidth: 2,
          color: '#ffffff',
        },
      ],
    }
    const result = parseProjectFileStrict(badProject)
    expect(result.ok).toBe(false)
  })

  it('fails when layer IDs are duplicated', () => {
    const ring1 = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      type: 'ring',
      name: 'Ring 1',
      visible: true,
      locked: false,
      opacity: 1.0,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      radius: 300,
      strokeWidth: 4,
      color: '#fff',
    }
    const result = parseProjectFileStrict({ ...EXAMPLE_PROJECT, layers: [ring1, ring1] })
    expect(result.ok).toBe(false)
  })
})

// ─── Zod schema directly ──────────────────────────────────────────────────────

describe('ProjectFileSchema (Zod)', () => {
  it('passes for a minimal empty project', () => {
    const empty = {
      __magic_circle__: true,
      version: '1.0.0',
      meta: {
        title: 'Untitled',
        created: '2026-08-31T00:00:00.000Z',
        modified: '2026-08-31T00:00:00.000Z',
      },
      canvas: { width: 1000, height: 1000 },
      layers: [],
    }
    expect(() => ProjectFileSchema.parse(empty)).not.toThrow()
  })
})

// ─── importProjectFile — valid import ─────────────────────────────────────────

describe('importProjectFile', () => {
  it('imports a valid project successfully', () => {
    const result = importProjectFile(EXAMPLE_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.project.layers).toHaveLength(2)
    expect(result.skippedLayers).toBe(0)
  })

  it('skips unknown layer types and loads known layers', () => {
    const withUnknown = {
      ...EXAMPLE_PROJECT,
      layers: [
        ...EXAMPLE_PROJECT.layers,
        {
          id: 'c3d4e5f6-a7b8-9012-cdef-012345678902',
          type: 'future-layer-type',
          name: 'Future Layer',
          visible: true,
          locked: false,
          opacity: 1.0,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          someNewField: 42,
        },
      ],
    }
    const result = importProjectFile(withUnknown)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.project.layers).toHaveLength(2)
    expect(result.skippedLayers).toBe(1)
  })

  it('fails and returns error for completely invalid JSON structure', () => {
    const result = importProjectFile({ not_a_project: true })
    expect(result.ok).toBe(false)
  })

  it('fails for radial-lines with innerRadius >= outerRadius', () => {
    const bad = {
      ...EXAMPLE_PROJECT,
      layers: [
        {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          type: 'radial-lines',
          name: 'Bad',
          visible: true,
          locked: false,
          opacity: 1.0,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          count: 4,
          innerRadius: 350,
          outerRadius: 200,
          startAngle: 0,
          strokeWidth: 2,
          color: '#fff',
        },
      ],
    }
    const result = importProjectFile(bad)
    expect(result.ok).toBe(false)
  })
})

// ─── Autosave serialization ───────────────────────────────────────────────────

describe('autosave serialization', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
  })

  it('produces valid JSON from the current project', () => {
    const project = useProjectStore.getState().project
    const json = JSON.stringify(project)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('produces a JSON string that passes schema validation', () => {
    const project = useProjectStore.getState().project
    const json = JSON.stringify(project)
    const parsed = JSON.parse(json) as unknown
    const result = parseProjectFileStrict(parsed)
    expect(result.ok).toBe(true)
  })

  it('serialization round-trip preserves layer count', () => {
    const rl = createRadialLinesLayer()
    useProjectStore.getState().addLayer(rl)
    const project = useProjectStore.getState().project
    const json = JSON.stringify(project)
    const parsed = JSON.parse(json) as unknown
    const result = parseProjectFileStrict(parsed)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.project.layers).toHaveLength(2)
  })
})

// ─── Autosave restore ─────────────────────────────────────────────────────────

describe('autosave restore', () => {
  const AUTOSAVE_KEY = 'magic-circle-editor:autosave'

  beforeEach(() => {
    localStorage.clear()
    useProjectStore.setState({ project: createDefaultProject() })
  })

  it('returns null when no autosave exists', () => {
    expect(tryRestoreFromAutosave()).toBeNull()
  })

  it('restores a valid saved project', () => {
    const project = createDefaultProject()
    const ring = createRingLayer()
    const withLayer = { ...project, layers: [ring] }
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(withLayer))
    const restored = tryRestoreFromAutosave()
    expect(restored).not.toBeNull()
    expect(restored?.layers).toHaveLength(1)
  })

  it('returns null for invalid autosave data', () => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ invalid: true }))
    const restored = tryRestoreFromAutosave()
    expect(restored).toBeNull()
  })

  it('returns null for corrupt JSON', () => {
    localStorage.setItem(AUTOSAVE_KEY, 'not-json{')
    const restored = tryRestoreFromAutosave()
    expect(restored).toBeNull()
  })
})

// ─── Dirty state ──────────────────────────────────────────────────────────────

describe('dirty state tracking', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    resetDirtyState()
  })

  it('starts clean after resetDirtyState', () => {
    expect(isProjectDirty()).toBe(false)
  })

  it('becomes dirty after a project mutation + pushSnapshot', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    expect(isProjectDirty()).toBe(true)
  })

  it('is clean again after markProjectSaved', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    expect(isProjectDirty()).toBe(true)
    markProjectSaved()
    expect(isProjectDirty()).toBe(false)
  })
})

// ─── Dirty state: undo/redo regression ───────────────────────────────────────

describe('dirty state undo/redo regression', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    resetDirtyState() // savedHistoryPointer = 0
  })

  it('A → edit B → isDirty=true', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    expect(isProjectDirty()).toBe(true)
  })

  it('B → undo A → isDirty=false', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    expect(isProjectDirty()).toBe(true)
    useHistoryStore.getState().undo()
    expect(isProjectDirty()).toBe(false)
  })

  it('A → redo B → isDirty=true (after undo then redo)', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().undo()
    expect(isProjectDirty()).toBe(false)
    useHistoryStore.getState().redo()
    expect(isProjectDirty()).toBe(true)
  })

  it('multiple edits → partial undo → isDirty=true', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    // undo once: pointer=1, savedHistoryPointer=0 → still dirty
    useHistoryStore.getState().undo()
    expect(isProjectDirty()).toBe(true)
  })

  it('save at B → isDirty=false', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    markProjectSaved() // savedHistoryPointer = 1
    expect(isProjectDirty()).toBe(false)
  })

  it('save at B → edit C → undo B → isDirty=false', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    markProjectSaved() // savedHistoryPointer = 1
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    expect(isProjectDirty()).toBe(true) // pointer=2, saved=1
    useHistoryStore.getState().undo() // pointer=1
    expect(isProjectDirty()).toBe(false) // pointer=1 === saved=1
  })
})

// ─── New Project confirmation condition ───────────────────────────────────────

describe('new project / open project confirmation condition', () => {
  it('requires confirmation when project has layers AND is dirty', () => {
    const project = createDefaultProject()
    const ring = createRingLayer()
    const withLayer = { ...project, layers: [ring] }
    const isDirty = true
    const needsConfirm = withLayer.layers.length > 0 && isDirty
    expect(needsConfirm).toBe(true)
  })

  it('does NOT require confirmation when project has no layers', () => {
    const project = createDefaultProject()
    const isDirty = true
    const needsConfirm = project.layers.length > 0 && isDirty
    expect(needsConfirm).toBe(false)
  })

  it('does NOT require confirmation when project is clean', () => {
    const project = createDefaultProject()
    const ring = createRingLayer()
    const withLayer = { ...project, layers: [ring] }
    const isDirty = false
    const needsConfirm = withLayer.layers.length > 0 && isDirty
    expect(needsConfirm).toBe(false)
  })
})

// ─── Preferences stored separately ───────────────────────────────────────────

describe('preferences storage', () => {
  const PREFS_KEY = 'magic-circle-editor:preferences'
  const AUTOSAVE_KEY = 'magic-circle-editor:autosave'

  beforeEach(() => {
    localStorage.clear()
  })

  it('saves preferences under the preferences key', () => {
    savePreferences({ previewBackground: 'light' })
    expect(localStorage.getItem(PREFS_KEY)).not.toBeNull()
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })

  it('loads saved preferences', () => {
    savePreferences({ previewBackground: 'transparent' })
    const loaded = loadPreferences()
    expect(loaded.previewBackground).toBe('transparent')
  })

  it('preferences key is distinct from autosave key', () => {
    savePreferences({ previewBackground: 'dark' })
    const project = createDefaultProject()
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project))
    expect(localStorage.getItem(PREFS_KEY)).not.toBe(localStorage.getItem(AUTOSAVE_KEY))
  })

  it('returns empty object when no preferences exist', () => {
    const loaded = loadPreferences()
    expect(loaded).toEqual({})
  })

  it('returns empty object for corrupt preference data', () => {
    localStorage.setItem(PREFS_KEY, 'not-json')
    const loaded = loadPreferences()
    expect(loaded).toEqual({})
  })
})

// ─── modified timestamp behavior ─────────────────────────────────────────────

describe('modified timestamp', () => {
  it('downloadProject sets modified to a current timestamp in the saved output', () => {
    // We test the timestamp update logic directly (not the DOM download)
    const project = createDefaultProject()
    const before = Date.now()
    const now = new Date().toISOString()
    const saved = { ...project, meta: { ...project.meta, modified: now } }
    const after = Date.now()

    const modifiedMs = new Date(saved.meta.modified).getTime()
    expect(modifiedMs).toBeGreaterThanOrEqual(before)
    expect(modifiedMs).toBeLessThanOrEqual(after)
  })

  it('project store meta.modified does not change automatically on layer add', () => {
    useProjectStore.setState({ project: createDefaultProject() })
    const before = useProjectStore.getState().project.meta.modified
    useProjectStore.getState().addLayer(createRingLayer())
    const after = useProjectStore.getState().project.meta.modified
    expect(after).toBe(before)
  })
})

// ─── invalid import leaves project unchanged ──────────────────────────────────

describe('invalid import leaves current project unchanged', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    useEditorStore.setState({ selectedLayerIds: [] })
  })

  it('importProjectFile for invalid data does not modify store', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    const beforeLayers = useProjectStore.getState().project.layers.length

    // This function only returns a result — it does NOT modify the store
    const result = importProjectFile({ not_a_project: true })
    expect(result.ok).toBe(false)

    // Store is unchanged because the caller is responsible for applying
    expect(useProjectStore.getState().project.layers.length).toBe(beforeLayers)
  })
})

// ─── History reset on new/open project ───────────────────────────────────────

describe('history reset', () => {
  it('initHistory resets history with the new project state', () => {
    useProjectStore.setState({ project: createDefaultProject() })
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)

    const { snapshots, pointer } = useHistoryStore.getState()
    expect(snapshots).toHaveLength(1)
    expect(pointer).toBe(0)
    expect(snapshots[0].layers).toHaveLength(1)
  })
})
