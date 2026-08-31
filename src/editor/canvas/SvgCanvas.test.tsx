import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../store/editor'
import { useProjectStore } from '../../store/project'
import { useViewportStore } from '../../store/viewport'
import { createDefaultProject, createRingLayer } from '../../utils/factories'
import SvgCanvas from './SvgCanvas'

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
})

describe('SVG viewport renders', () => {
  it('renders the SVG viewport element', () => {
    render(<SvgCanvas />)
    expect(screen.getByTestId('svg-viewport')).toBeInTheDocument()
  })

  it('renders the artboard background', () => {
    render(<SvgCanvas />)
    expect(screen.getByTestId('artboard-background')).toBeInTheDocument()
  })

  it('renders the artboard border', () => {
    render(<SvgCanvas />)
    expect(screen.getByTestId('artboard-border')).toBeInTheDocument()
  })

  it('renders the artwork group', () => {
    render(<SvgCanvas />)
    expect(screen.getByTestId('artwork-group')).toBeInTheDocument()
  })
})

describe('artboard uses logical bounds', () => {
  it('artboard background is positioned at -canvasWidth/2, -canvasHeight/2', () => {
    render(<SvgCanvas />)
    const bg = screen.getByTestId('artboard-background')
    expect(bg.getAttribute('x')).toBe('-500')
    expect(bg.getAttribute('y')).toBe('-500')
    expect(bg.getAttribute('width')).toBe('1000')
    expect(bg.getAttribute('height')).toBe('1000')
  })

  it('artboard border matches artboard background bounds', () => {
    render(<SvgCanvas />)
    const border = screen.getByTestId('artboard-border')
    expect(border.getAttribute('x')).toBe('-500')
    expect(border.getAttribute('y')).toBe('-500')
    expect(border.getAttribute('width')).toBe('1000')
    expect(border.getAttribute('height')).toBe('1000')
  })
})

describe('grid visibility', () => {
  it('does not render the grid overlay when gridVisible is false', () => {
    render(<SvgCanvas />)
    expect(screen.queryByTestId('grid-overlay')).not.toBeInTheDocument()
  })

  it('renders the grid overlay when gridVisible is true', () => {
    useEditorStore.setState({ gridVisible: true })
    render(<SvgCanvas />)
    expect(screen.getByTestId('grid-overlay')).toBeInTheDocument()
  })
})

describe('guides visibility', () => {
  it('does not render guides when guidesVisible is false', () => {
    render(<SvgCanvas />)
    expect(screen.queryByTestId('guides-overlay')).not.toBeInTheDocument()
  })

  it('renders guides when guidesVisible is true', () => {
    useEditorStore.setState({ guidesVisible: true })
    render(<SvgCanvas />)
    expect(screen.getByTestId('guides-overlay')).toBeInTheDocument()
  })
})

describe('preview backgrounds', () => {
  it('dark background gives artboard a non-transparent fill', () => {
    useEditorStore.setState({ previewBackground: 'dark' })
    render(<SvgCanvas />)
    const bg = screen.getByTestId('artboard-background')
    const fill = bg.getAttribute('fill') ?? ''
    expect(fill).not.toMatch(/url\(#/)
    expect(fill).toBeTruthy()
  })

  it('light background gives artboard a different fill than dark', () => {
    useEditorStore.setState({ previewBackground: 'dark' })
    render(<SvgCanvas />)
    const darkFill = screen.getByTestId('artboard-background').getAttribute('fill')

    cleanup()
    useEditorStore.setState({ previewBackground: 'light' })
    render(<SvgCanvas />)
    const lightFill = screen.getByTestId('artboard-background').getAttribute('fill')

    expect(darkFill).not.toBe(lightFill)
  })

  it('transparent background uses a url() reference (checkerboard)', () => {
    useEditorStore.setState({ previewBackground: 'transparent' })
    render(<SvgCanvas />)
    const bg = screen.getByTestId('artboard-background')
    expect(bg.getAttribute('fill')).toMatch(/^url\(#/)
  })
})

describe('empty state', () => {
  it('shows the empty state when there are no layers', () => {
    render(<SvgCanvas />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('empty state is not visible when there are layers', () => {
    useProjectStore.getState().addLayer(createRingLayer())
    render(<SvgCanvas />)
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })
})

describe('SVG viewBox', () => {
  it('has a non-empty viewBox attribute', () => {
    render(<SvgCanvas />)
    const svg = screen.getByTestId('svg-viewport')
    const vb = svg.getAttribute('viewBox')
    expect(vb).toBeTruthy()
    expect(vb?.split(' ')).toHaveLength(4)
  })

  it('viewBox contains finite numeric values', () => {
    render(<SvgCanvas />)
    const vb = screen.getByTestId('svg-viewport').getAttribute('viewBox') ?? ''
    const parts = vb.split(' ').map(Number)
    expect(parts).toHaveLength(4)
    parts.forEach((v) => {
      expect(isFinite(v)).toBe(true)
    })
  })
})
