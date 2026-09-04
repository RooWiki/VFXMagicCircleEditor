import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportToPng } from './exportPng'

// ─── Browser API mocks ────────────────────────────────────────────────────────

const fakeObjectUrl = 'blob:fake-url'
let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }
let mockCanvas: {
  width: number
  height: number
  getContext: ReturnType<typeof vi.fn>
  toBlob: ReturnType<typeof vi.fn>
}
let mockCtx: { drawImage: ReturnType<typeof vi.fn> }

beforeEach(() => {
  // URL stubs
  vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeObjectUrl)
  vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

  // Anchor element stub
  mockAnchor = { href: '', download: '', click: vi.fn() }

  // Canvas context stub
  mockCtx = { drawImage: vi.fn() }

  // Canvas element stub
  mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(mockCtx),
    toBlob: vi.fn().mockImplementation((cb: (b: Blob | null) => void) => {
      cb(new Blob(['png-data'], { type: 'image/png' }))
    }),
  }

  // createElement stub: return anchor or canvas depending on tag
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockAnchor as unknown as HTMLElement
    if (tag === 'canvas') return mockCanvas as unknown as HTMLElement
    throw new Error(`Unexpected createElement("${tag}") in exportPng test`)
  })

  // document.body stubs
  vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as unknown as Node)
  vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchor as unknown as Node)

  // Mock Image so onload fires synchronously
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_val: string) {
        Promise.resolve().then(() => this.onload?.())
      }
    }
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('exportToPng', () => {
  it('creates an object URL from the SVG string', async () => {
    await exportToPng('<svg></svg>', 512, 512, 'test.png')
    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/svg+xml;charset=utf-8' })
    )
  })

  it('sets canvas dimensions to the requested size', async () => {
    await exportToPng('<svg></svg>', 1024, 2048, 'test.png')
    expect(mockCanvas.width).toBe(1024)
    expect(mockCanvas.height).toBe(2048)
  })

  it('calls drawImage on the canvas context', async () => {
    await exportToPng('<svg></svg>', 512, 512, 'test.png')
    expect(mockCtx.drawImage).toHaveBeenCalledOnce()
  })

  it('sets the anchor download attribute to the given filename', async () => {
    await exportToPng('<svg></svg>', 512, 512, 'magic-circle.png')
    expect(mockAnchor.download).toBe('magic-circle.png')
  })

  it('clicks the anchor to trigger download', async () => {
    await exportToPng('<svg></svg>', 512, 512, 'test.png')
    expect(mockAnchor.click).toHaveBeenCalledOnce()
  })

  it('revokes both object URLs after export', async () => {
    await exportToPng('<svg></svg>', 512, 512, 'test.png')
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('throws when canvas.toBlob returns null', async () => {
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) => cb(null))
    await expect(exportToPng('<svg></svg>', 512, 512, 'test.png')).rejects.toThrow(
      'canvas.toBlob returned null'
    )
  })

  it('throws when getContext returns null', async () => {
    mockCanvas.getContext.mockReturnValue(null)
    await expect(exportToPng('<svg></svg>', 512, 512, 'test.png')).rejects.toThrow(
      '2D rendering context'
    )
  })

  it('revokes the SVG URL even when an error occurs', async () => {
    mockCanvas.getContext.mockReturnValue(null)
    await expect(exportToPng('<svg></svg>', 512, 512, 'test.png')).rejects.toThrow()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeObjectUrl)
  })
})
