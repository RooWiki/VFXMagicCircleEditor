import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editor'

const LAYER_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const LAYER_B = 'bbbbbbbb-0000-4000-8000-000000000002'
const LAYER_C = 'cccccccc-0000-4000-8000-000000000003'

beforeEach(() => {
  useEditorStore.setState({ selectedLayerIds: [] })
})

const getState = () => useEditorStore.getState()

describe('default state', () => {
  it('starts with no selection', () => {
    expect(getState().selectedLayerIds).toHaveLength(0)
  })

  it('does not contain project fields', () => {
    const state = getState() as unknown as Record<string, unknown>
    expect(state.__magic_circle__).toBeUndefined()
    expect(state.layers).toBeUndefined()
    expect(state.canvas).toBeUndefined()
    expect(state.meta).toBeUndefined()
  })
})

describe('selectLayer', () => {
  it('sets a single selected layer', () => {
    getState().selectLayer(LAYER_A)
    expect(getState().selectedLayerIds).toEqual([LAYER_A])
  })

  it('replaces the previous selection', () => {
    getState().selectLayer(LAYER_A)
    getState().selectLayer(LAYER_B)
    expect(getState().selectedLayerIds).toEqual([LAYER_B])
  })

  it('clears selection when called with null', () => {
    getState().selectLayer(LAYER_A)
    getState().selectLayer(null)
    expect(getState().selectedLayerIds).toHaveLength(0)
  })
})

describe('setSelection', () => {
  it('replaces the complete selection', () => {
    getState().selectLayer(LAYER_A)
    getState().setSelection([LAYER_B, LAYER_C])
    expect(getState().selectedLayerIds).toContain(LAYER_B)
    expect(getState().selectedLayerIds).toContain(LAYER_C)
    expect(getState().selectedLayerIds).not.toContain(LAYER_A)
  })

  it('deduplicates IDs in the supplied list', () => {
    getState().setSelection([LAYER_A, LAYER_A, LAYER_B])
    const ids = getState().selectedLayerIds
    expect(ids.filter((id) => id === LAYER_A)).toHaveLength(1)
    expect(ids).toHaveLength(2)
  })

  it('sets an empty selection when given an empty array', () => {
    getState().selectLayer(LAYER_A)
    getState().setSelection([])
    expect(getState().selectedLayerIds).toHaveLength(0)
  })

  it('produces a deterministic order (Set insertion order is preserved)', () => {
    getState().setSelection([LAYER_B, LAYER_A, LAYER_C])
    expect(getState().selectedLayerIds).toEqual([LAYER_B, LAYER_A, LAYER_C])
  })
})

describe('addToSelection', () => {
  it('adds a layer to an empty selection', () => {
    getState().addToSelection(LAYER_A)
    expect(getState().selectedLayerIds).toContain(LAYER_A)
  })

  it('adds multiple distinct layers', () => {
    getState().addToSelection(LAYER_A)
    getState().addToSelection(LAYER_B)
    expect(getState().selectedLayerIds).toContain(LAYER_A)
    expect(getState().selectedLayerIds).toContain(LAYER_B)
    expect(getState().selectedLayerIds).toHaveLength(2)
  })

  it('does not add duplicate IDs', () => {
    getState().addToSelection(LAYER_A)
    getState().addToSelection(LAYER_A)
    expect(getState().selectedLayerIds.filter((id) => id === LAYER_A)).toHaveLength(1)
  })

  it('preserves insertion order', () => {
    getState().addToSelection(LAYER_B)
    getState().addToSelection(LAYER_A)
    expect(getState().selectedLayerIds[0]).toBe(LAYER_B)
    expect(getState().selectedLayerIds[1]).toBe(LAYER_A)
  })
})

describe('removeFromSelection', () => {
  it('removes an existing selection entry', () => {
    getState().addToSelection(LAYER_A)
    getState().addToSelection(LAYER_B)
    getState().removeFromSelection(LAYER_A)
    expect(getState().selectedLayerIds).not.toContain(LAYER_A)
    expect(getState().selectedLayerIds).toContain(LAYER_B)
  })

  it('is a no-op when the ID is not selected', () => {
    getState().addToSelection(LAYER_A)
    getState().removeFromSelection(LAYER_C)
    expect(getState().selectedLayerIds).toEqual([LAYER_A])
  })

  it('results in empty selection when the last entry is removed', () => {
    getState().addToSelection(LAYER_A)
    getState().removeFromSelection(LAYER_A)
    expect(getState().selectedLayerIds).toHaveLength(0)
  })
})

describe('clearSelection', () => {
  it('empties the selection', () => {
    getState().addToSelection(LAYER_A)
    getState().addToSelection(LAYER_B)
    getState().clearSelection()
    expect(getState().selectedLayerIds).toHaveLength(0)
  })

  it('is idempotent on an already-empty selection', () => {
    getState().clearSelection()
    expect(getState().selectedLayerIds).toHaveLength(0)
  })
})

describe('pruneSelection', () => {
  it('removes IDs that are not in the valid set', () => {
    getState().setSelection([LAYER_A, LAYER_B, LAYER_C])
    getState().pruneSelection([LAYER_A, LAYER_C])
    expect(getState().selectedLayerIds).toContain(LAYER_A)
    expect(getState().selectedLayerIds).toContain(LAYER_C)
    expect(getState().selectedLayerIds).not.toContain(LAYER_B)
  })

  it('preserves all IDs when all are valid', () => {
    getState().setSelection([LAYER_A, LAYER_B])
    getState().pruneSelection([LAYER_A, LAYER_B, LAYER_C])
    expect(getState().selectedLayerIds).toContain(LAYER_A)
    expect(getState().selectedLayerIds).toContain(LAYER_B)
    expect(getState().selectedLayerIds).toHaveLength(2)
  })

  it('results in empty selection when no IDs are valid', () => {
    getState().setSelection([LAYER_A, LAYER_B])
    getState().pruneSelection([LAYER_C])
    expect(getState().selectedLayerIds).toHaveLength(0)
  })

  it('is a no-op when the selection is already empty', () => {
    getState().pruneSelection([LAYER_A, LAYER_B])
    expect(getState().selectedLayerIds).toHaveLength(0)
  })

  it('does not mutate the supplied validLayerIds array', () => {
    getState().setSelection([LAYER_A, LAYER_B])
    const validIds = [LAYER_A]
    const originalLength = validIds.length
    getState().pruneSelection(validIds)
    expect(validIds).toHaveLength(originalLength)
    expect(validIds[0]).toBe(LAYER_A)
  })

  it('results in empty selection when called with an empty valid set', () => {
    getState().setSelection([LAYER_A, LAYER_B])
    getState().pruneSelection([])
    expect(getState().selectedLayerIds).toHaveLength(0)
  })
})
