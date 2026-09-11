import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ArtworkPalette from './ArtworkPalette'
import ColorField from './inspector/ColorField'
import { createDefaultProject, createGroupLayer, createRingLayer } from '../utils/factories'
import { useProjectStore } from '../store/project'
import { useHistoryStore } from '../store/history'
import { recolorArtwork } from '../utils/artworkColor'

describe('VFX colors', () => {
  it('recolors nested effects and preserves locked artwork, transparency and undo', () => {
    const ring = createRingLayer({ color: '#ff0000' })
    ring.glowBlur = 5
    ring.fill = 'none'
    ring.opacity = 0.4
    const locked = createRingLayer({ color: '#00ff00' })
    locked.locked = true
    const project = { ...createDefaultProject(), layers: [createGroupLayer([ring]), locked] }
    useProjectStore.getState().setProject(project)
    useHistoryStore.getState().initHistory(project)
    render(<ArtworkPalette />)
    fireEvent.click(screen.getByRole('button', { name: /^White$/ }))
    const layers = useProjectStore.getState().project.layers
    expect(layers[0].type === 'group' && layers[0].children[0]).toMatchObject({
      color: '#ffffff',
      glowColor: '#ffffff',
      opacity: 0.4,
      fill: 'none',
    })
    expect(layers[1]).toEqual(locked)
    act(() => useHistoryStore.getState().undo())
    expect(useProjectStore.getState().project).toEqual(project)
  })
  it('converts color intensity to grayscale', () => {
    expect(recolorArtwork([createRingLayer({ color: '#ff0000' })], '#fff', true)[0]).toMatchObject({
      color: '#363636',
    })
  })
  it('accepts short hex drafts and discards invalid input', () => {
    let result = '#ffffff'
    render(
      <ColorField
        value={result}
        onChange={(v) => {
          result = v
        }}
      />
    )
    const input = screen.getByLabelText('Color hex value')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'a3f' } })
    fireEvent.blur(input)
    expect(result).toBe('#aa33ff')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'invalid' } })
    fireEvent.blur(input)
    expect(result).toBe('#aa33ff')
  })
})
