import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProject, createRingLayer } from '../utils/factories'
import { usePersistenceStore } from './persistence'
import { useProjectStore } from './project'

beforeEach(() => {
  useProjectStore.setState({ project: createDefaultProject() })
  usePersistenceStore.setState({
    baselineProject: null,
    baselineSerialized: '',
    isDirty: false,
  })
})

const getStore = () => usePersistenceStore.getState()

describe('setBaseline', () => {
  it('stores the project reference', () => {
    const project = createDefaultProject()
    usePersistenceStore.getState().setBaseline(project)
    expect(getStore().baselineProject).toBe(project)
  })

  it('serializes the project', () => {
    const project = createDefaultProject()
    usePersistenceStore.getState().setBaseline(project)
    expect(getStore().baselineSerialized).toBe(JSON.stringify(project))
  })

  it('resets isDirty to false', () => {
    usePersistenceStore.setState({ isDirty: true })
    usePersistenceStore.getState().setBaseline(createDefaultProject())
    expect(getStore().isDirty).toBe(false)
  })
})

describe('markDirty', () => {
  it('sets isDirty to true', () => {
    usePersistenceStore.getState().markDirty()
    expect(getStore().isDirty).toBe(true)
  })
})

describe('setDirtyFlag', () => {
  it('sets isDirty to the given value', () => {
    usePersistenceStore.getState().setDirtyFlag(true)
    expect(getStore().isDirty).toBe(true)
    usePersistenceStore.getState().setDirtyFlag(false)
    expect(getStore().isDirty).toBe(false)
  })
})

describe('New Project — baseline state', () => {
  it('New Project: baseline references only the new empty project', () => {
    // Simulate an existing project with layers
    const ringLayer = createRingLayer()
    useProjectStore.getState().addLayer(ringLayer)
    const oldProject = useProjectStore.getState().project
    usePersistenceStore.getState().setBaseline(oldProject)
    expect(getStore().baselineProject?.layers).toHaveLength(1)

    // Simulate New Project
    const fresh = createDefaultProject()
    useProjectStore.getState().setProject(fresh)
    usePersistenceStore.getState().setBaseline(fresh)

    expect(getStore().baselineProject).toBe(fresh)
    expect(getStore().baselineProject?.layers).toHaveLength(0)
    expect(getStore().isDirty).toBe(false)
  })

  it('New Project: baselineSerialized reflects the new empty project', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    usePersistenceStore.getState().setBaseline(useProjectStore.getState().project)

    const fresh = createDefaultProject()
    usePersistenceStore.getState().setBaseline(fresh)

    expect(getStore().baselineSerialized).toBe(JSON.stringify(fresh))
    expect(getStore().baselineSerialized).not.toContain(ring.id)
  })

  it('New Project: old project data not referenced from baseline', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    const old = useProjectStore.getState().project
    usePersistenceStore.getState().setBaseline(old)

    const fresh = createDefaultProject()
    usePersistenceStore.getState().setBaseline(fresh)

    // Old project is no longer the baseline
    expect(getStore().baselineProject).not.toBe(old)
  })
})
