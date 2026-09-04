import { beforeEach, describe, expect, it } from 'vitest'
import { useHelpPanelStore } from './helpPanel'

beforeEach(() => {
  useHelpPanelStore.setState({ isOpen: false })
})

describe('helpPanel store', () => {
  it('initializes as closed', () => {
    expect(useHelpPanelStore.getState().isOpen).toBe(false)
  })

  it('open() sets isOpen to true', () => {
    useHelpPanelStore.getState().open()
    expect(useHelpPanelStore.getState().isOpen).toBe(true)
  })

  it('close() sets isOpen to false', () => {
    useHelpPanelStore.getState().open()
    useHelpPanelStore.getState().close()
    expect(useHelpPanelStore.getState().isOpen).toBe(false)
  })

  it('calling open() twice leaves isOpen true', () => {
    useHelpPanelStore.getState().open()
    useHelpPanelStore.getState().open()
    expect(useHelpPanelStore.getState().isOpen).toBe(true)
  })

  it('calling close() when already closed is a no-op', () => {
    useHelpPanelStore.getState().close()
    expect(useHelpPanelStore.getState().isOpen).toBe(false)
  })
})
