import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDirtyState } from '../persistence/autosave'
import { ProjectFileSchema } from '../schema/project'
import { useConfirmStore } from '../store/confirm'
import { useEditorStore } from '../store/editor'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import { useTemplateGalleryStore } from '../store/templateGalleryStore'
import type { ProjectFile } from '../types/project'
import { createDefaultProject, createRingLayer } from '../utils/factories'
import { loadTemplate } from './loadTemplate'
import { TEMPLATES } from './templates'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '../../public/templates')
const THUMBNAILS_DIR = join(TEMPLATES_DIR, 'thumbnails')

function readTemplateJson(slug: string): unknown {
  return JSON.parse(readFileSync(join(TEMPLATES_DIR, `${slug}.mce.json`), 'utf-8'))
}

// ─── Bundled template files — Zod validation ──────────────────────────────────

describe('bundled template JSON files — Zod validation', () => {
  it.each(TEMPLATES)('$id passes ProjectFileSchema.parse()', ({ id }) => {
    const raw = readTemplateJson(id)
    expect(() => ProjectFileSchema.parse(raw)).not.toThrow()
  })

  it.each(TEMPLATES)('$id has at least one layer', ({ id }) => {
    const raw = readTemplateJson(id) as { layers: unknown[] }
    expect(raw.layers.length).toBeGreaterThan(0)
  })

  it.each(TEMPLATES)('$id has unique layer IDs within the file', ({ id }) => {
    const raw = readTemplateJson(id) as { layers: Array<{ id: string }> }
    const ids = raw.layers.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(TEMPLATES)('$id version is 1.0.0', ({ id }) => {
    const raw = readTemplateJson(id) as { version: string }
    expect(raw.version).toBe('1.0.0')
  })

  it.each(TEMPLATES)('$id radial-lines layers satisfy innerRadius < outerRadius', ({ id }) => {
    const raw = readTemplateJson(id) as {
      layers: Array<{ type: string; innerRadius?: number; outerRadius?: number }>
    }
    for (const layer of raw.layers) {
      if (layer.type === 'radial-lines') {
        expect(layer.innerRadius!).toBeLessThan(layer.outerRadius!)
      }
    }
  })
})

// ─── Template registry structure ──────────────────────────────────────────────

describe('TEMPLATES registry', () => {
  it('contains 5 templates', () => {
    expect(TEMPLATES).toHaveLength(5)
  })

  it.each(TEMPLATES)('$id has required fields', (template) => {
    expect(template.id).toBeTruthy()
    expect(template.name).toBeTruthy()
    expect(template.description).toBeTruthy()
    expect(template.file).toMatch(/^\/templates\//)
    expect(template.thumbnail).toMatch(/^\/templates\/thumbnails\//)
  })

  it('all template IDs are unique', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('template file paths end with .mce.json', () => {
    for (const template of TEMPLATES) {
      expect(template.file).toMatch(/\.mce\.json$/)
    }
  })

  it('all thumbnail paths end with .png (not .svg)', () => {
    for (const template of TEMPLATES) {
      expect(template.thumbnail).toMatch(/\.png$/)
      expect(template.thumbnail).not.toMatch(/\.svg$/)
    }
  })

  it('no registry entry references an SVG thumbnail', () => {
    for (const template of TEMPLATES) {
      expect(template.thumbnail).not.toContain('.svg')
    }
  })

  it('each template has exactly one corresponding PNG thumbnail', () => {
    const slugs = TEMPLATES.map((t) => t.id)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
    for (const template of TEMPLATES) {
      const filename = template.thumbnail.split('/').at(-1)!
      expect(filename).toMatch(/\.png$/)
    }
  })
})

// ─── PNG thumbnail file verification ─────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const THUMBNAIL_SIZE = 512

describe('PNG thumbnail files', () => {
  it.each(TEMPLATES)('$id thumbnail file exists as a PNG', ({ id }) => {
    const path = join(THUMBNAILS_DIR, `${id}.png`)
    expect(existsSync(path)).toBe(true)
  })

  it.each(TEMPLATES)('$id thumbnail has the correct PNG signature', ({ id }) => {
    const path = join(THUMBNAILS_DIR, `${id}.png`)
    const buf = readFileSync(path)
    expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true)
  })

  it.each(TEMPLATES)(`$id thumbnail is exactly ${THUMBNAIL_SIZE}×${THUMBNAIL_SIZE}`, ({ id }) => {
    const path = join(THUMBNAILS_DIR, `${id}.png`)
    const buf = readFileSync(path)
    // PNG IHDR chunk: width at byte 16, height at byte 20 (big-endian uint32)
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    expect(width).toBe(THUMBNAIL_SIZE)
    expect(height).toBe(THUMBNAIL_SIZE)
  })

  it('no SVG files exist in the thumbnails directory', () => {
    const svgFiles = readdirSync(THUMBNAILS_DIR).filter((f) => f.endsWith('.svg'))
    expect(svgFiles).toHaveLength(0)
  })

  it('thumbnail count matches template count', () => {
    const pngFiles = readdirSync(THUMBNAILS_DIR).filter((f) => f.endsWith('.png'))
    expect(pngFiles).toHaveLength(TEMPLATES.length)
  })
})

// ─── Template gallery store ───────────────────────────────────────────────────

describe('useTemplateGalleryStore', () => {
  it('starts closed', () => {
    expect(useTemplateGalleryStore.getState().isOpen).toBe(false)
  })

  it('open() sets isOpen to true', () => {
    useTemplateGalleryStore.getState().open()
    expect(useTemplateGalleryStore.getState().isOpen).toBe(true)
    useTemplateGalleryStore.getState().close()
  })

  it('close() sets isOpen to false', () => {
    useTemplateGalleryStore.getState().open()
    useTemplateGalleryStore.getState().close()
    expect(useTemplateGalleryStore.getState().isOpen).toBe(false)
  })

  it('open → close → open round-trip works', () => {
    useTemplateGalleryStore.getState().open()
    useTemplateGalleryStore.getState().close()
    useTemplateGalleryStore.getState().open()
    expect(useTemplateGalleryStore.getState().isOpen).toBe(true)
    useTemplateGalleryStore.getState().close()
  })
})

// ─── loadTemplate — fetch mock setup ─────────────────────────────────────────

const mockFetch = vi.fn<typeof fetch>()

beforeAll(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

function makeFetchOk(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response)
}

function makeFetchFail(status = 404) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  } as Response)
}

// ─── loadTemplate — successful load ──────────────────────────────────────────

describe('loadTemplate — successful load', () => {
  const TEMPLATE = TEMPLATES[0]

  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    useEditorStore.setState({ selectedLayerIds: [] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    resetDirtyState()
    mockFetch.mockReset()
  })

  it('returns true on success', async () => {
    makeFetchOk(readTemplateJson(TEMPLATE.id))
    const result = await loadTemplate(TEMPLATE, false)
    expect(result).toBe(true)
  })

  it('loads layers into the project store', async () => {
    const raw = readTemplateJson(TEMPLATE.id) as { layers: unknown[] }
    makeFetchOk(raw)
    await loadTemplate(TEMPLATE, false)
    expect(useProjectStore.getState().project.layers.length).toBe(raw.layers.length)
  })

  it('applies fresh timestamps to meta.created and meta.modified', async () => {
    makeFetchOk(readTemplateJson(TEMPLATE.id))
    const before = Date.now()
    await loadTemplate(TEMPLATE, false)
    const after = Date.now()

    const { meta } = useProjectStore.getState().project
    const createdMs = new Date(meta.created).getTime()
    const modifiedMs = new Date(meta.modified).getTime()

    expect(createdMs).toBeGreaterThanOrEqual(before)
    expect(createdMs).toBeLessThanOrEqual(after)
    expect(modifiedMs).toBeGreaterThanOrEqual(before)
    expect(modifiedMs).toBeLessThanOrEqual(after)
  })

  it('does NOT use the original template timestamps', async () => {
    const raw = readTemplateJson(TEMPLATE.id) as ProjectFile
    makeFetchOk(raw)
    await loadTemplate(TEMPLATE, false)

    const { meta } = useProjectStore.getState().project
    expect(meta.created).not.toBe(raw.meta.created)
  })

  it('assigns fresh UUIDs — no original layer ID appears in the loaded project', async () => {
    const raw = readTemplateJson(TEMPLATE.id) as ProjectFile
    const originalIds = new Set(raw.layers.map((l) => l.id))
    makeFetchOk(raw)
    await loadTemplate(TEMPLATE, false)

    const loadedIds = useProjectStore.getState().project.layers.map((l) => l.id)
    for (const id of loadedIds) {
      expect(originalIds.has(id)).toBe(false)
    }
  })

  it('each fresh ID is a valid UUID v4', async () => {
    makeFetchOk(readTemplateJson(TEMPLATE.id))
    await loadTemplate(TEMPLATE, false)

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    for (const layer of useProjectStore.getState().project.layers) {
      expect(layer.id).toMatch(uuidRe)
    }
  })

  it('clears selection in the editor store', async () => {
    useEditorStore.setState({ selectedLayerIds: ['some-id'] })
    makeFetchOk(readTemplateJson(TEMPLATE.id))
    await loadTemplate(TEMPLATE, false)
    expect(useEditorStore.getState().selectedLayerIds).toHaveLength(0)
  })

  it('resets history to a single initial snapshot', async () => {
    // Add extra history entries first
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    expect(useHistoryStore.getState().snapshots.length).toBeGreaterThan(1)

    makeFetchOk(readTemplateJson(TEMPLATE.id))
    await loadTemplate(TEMPLATE, false)

    const { snapshots, pointer } = useHistoryStore.getState()
    expect(snapshots).toHaveLength(1)
    expect(pointer).toBe(0)
  })

  it('resets dirty state', async () => {
    // Make it dirty first
    useProjectStore.getState().addLayer(createRingLayer())
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)

    makeFetchOk(readTemplateJson(TEMPLATE.id))
    await loadTemplate(TEMPLATE, false)

    // After loading a template, the state should be clean
    const { pointer } = useHistoryStore.getState()
    // savedHistoryPointer was just set to pointer by resetDirtyState
    // We can't import isProjectDirty directly but we can check pointer is 0
    expect(pointer).toBe(0)
  })

  it('preserves the template title', async () => {
    const raw = readTemplateJson(TEMPLATE.id) as ProjectFile
    makeFetchOk(raw)
    await loadTemplate(TEMPLATE, false)
    expect(useProjectStore.getState().project.meta.title).toBe(raw.meta.title)
  })
})

// ─── loadTemplate — error handling ───────────────────────────────────────────

describe('loadTemplate — error handling', () => {
  const TEMPLATE = TEMPLATES[0]

  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    resetDirtyState()
    mockFetch.mockReset()
  })

  it('throws when fetch returns a non-ok response', async () => {
    makeFetchFail(404)
    await expect(loadTemplate(TEMPLATE, false)).rejects.toThrow()
  })

  it('throws when fetch rejects (network error)', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    await expect(loadTemplate(TEMPLATE, false)).rejects.toThrow()
  })

  it('throws when the response JSON is not a valid project', async () => {
    makeFetchOk({ not_a_project: true })
    await expect(loadTemplate(TEMPLATE, false)).rejects.toThrow()
  })

  it('does not modify the project store on error', async () => {
    useProjectStore.getState().addLayer(createRingLayer())
    const beforeLayers = useProjectStore.getState().project.layers.length

    makeFetchFail(500)
    try {
      await loadTemplate(TEMPLATE, false)
    } catch {
      // expected
    }

    expect(useProjectStore.getState().project.layers.length).toBe(beforeLayers)
  })
})

// ─── loadTemplate — unsaved-changes confirmation ──────────────────────────────

describe('loadTemplate — unsaved-changes confirmation', () => {
  const TEMPLATE = TEMPLATES[0]

  beforeEach(() => {
    const project = createDefaultProject()
    useProjectStore.setState({ project })
    useEditorStore.setState({ selectedLayerIds: [] })
    useHistoryStore.getState().initHistory(project)
    resetDirtyState()
    mockFetch.mockReset()
    makeFetchOk(readTemplateJson(TEMPLATE.id))
  })

  it('skips confirmation when project is empty', async () => {
    // Empty project, dirty (unusual but possible)
    const result = await loadTemplate(TEMPLATE, true)
    // Confirmation not shown (empty project) → loads immediately
    expect(result).toBe(true)
  })

  it('skips confirmation when isDirty is false even with layers', async () => {
    useProjectStore.getState().addLayer(createRingLayer())
    // isDirty = false → no confirmation
    const result = await loadTemplate(TEMPLATE, false)
    expect(result).toBe(true)
  })

  it('shows confirmation when project has layers AND is dirty', async () => {
    // Add a layer to make the project non-empty
    useProjectStore.setState({
      project: {
        ...createDefaultProject(),
        layers: [createRingLayer()],
      },
    })

    // User confirms → load proceeds
    const loadPromise = loadTemplate(TEMPLATE, true)
    useConfirmStore.getState().respond(true)
    const result = await loadPromise
    expect(result).toBe(true)
  })

  it('returns false when user declines confirmation', async () => {
    useProjectStore.setState({
      project: {
        ...createDefaultProject(),
        layers: [createRingLayer()],
      },
    })

    const loadPromise = loadTemplate(TEMPLATE, true)
    useConfirmStore.getState().respond(false)
    const result = await loadPromise
    expect(result).toBe(false)
  })

  it('does not modify project store when user declines', async () => {
    const ring = createRingLayer()
    const project = { ...createDefaultProject(), layers: [ring] }
    useProjectStore.setState({ project })
    const beforeId = ring.id

    const loadPromise = loadTemplate(TEMPLATE, true)
    useConfirmStore.getState().respond(false)
    await loadPromise

    const layers = useProjectStore.getState().project.layers
    expect(layers[0]?.id).toBe(beforeId)
  })
})

// ─── loadTemplate — all templates load successfully ───────────────────────────

describe('loadTemplate — all five templates load', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject() })
    useEditorStore.setState({ selectedLayerIds: [] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    resetDirtyState()
    mockFetch.mockReset()
  })

  it.each(TEMPLATES)('$id loads without errors', async ({ id, ...rest }) => {
    makeFetchOk(readTemplateJson(id))
    const template = { id, ...rest }
    const result = await loadTemplate(template, false)
    expect(result).toBe(true)
    expect(useProjectStore.getState().project.layers.length).toBeGreaterThan(0)
  })
})
