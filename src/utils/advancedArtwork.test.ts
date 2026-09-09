import { describe, it, expect, beforeEach } from 'vitest'
import {
  createGroupLayer,
  createRingLayer,
  createShapeLayer,
  createSymbolLayer,
  createTextLayer,
  createDefaultProject,
} from './factories'
import { createOrnamentalSeal } from './ornamentalSeal'
import { buildExportSvgString } from './export'
import { importProjectFile, parseProjectFileStrict } from '../schema/project'
import { sanitizeSvg } from './sanitizeSvg'
import { shapePoints, interlacedStarPath, buildCutouts } from './artwork'
import { useProjectStore } from '../store/project'
import { useHistoryStore } from '../store/history'
import { cloneLayer, findLayer, withinLayerBudget } from './layerTree'

const options = {
  widthPx: 1024,
  heightPx: 1024,
  backgroundColor: null,
  marginPercent: 0,
  selectedLayerId: null,
}
const parse = (source: string) => new DOMParser().parseFromString(source, 'image/svg+xml')
beforeEach(() => {
  useProjectStore.getState().setProject(createDefaultProject())
  useHistoryStore.getState().initHistory(useProjectStore.getState().project)
})

describe('advanced artwork', () => {
  it('creates editable polygon and star points', () => {
    expect(shapePoints(createShapeLayer()).split(' ')).toHaveLength(10)
    expect(shapePoints(createShapeLayer('polygon')).split(' ')).toHaveLength(5)
  })
  it('bounds masks and effects to the artwork and omits empty group cutouts', () => {
    expect(buildCutouts(createGroupLayer([createRingLayer()]), 'empty')).toBe('')
    const doc = parse(
      buildExportSvgString({ ...createDefaultProject(), layers: [createOrnamentalSeal()] }, options)
    )
    for (const node of doc.querySelectorAll('mask, filter')) {
      expect(Number(node.getAttribute('width'))).toBeLessThan(1000)
      expect(Number(node.getAttribute('height'))).toBeLessThan(1000)
    }
    expect(doc.querySelectorAll('mask').length).toBeGreaterThan(0)
    expect(doc.querySelector('filter')?.getAttribute('filterUnits')).toBe('userSpaceOnUse')
  })
  it('renders interlaced stars as closed vertex paths in preview and export', () => {
    const star = { ...createShapeLayer(), starMode: 'interlaced' as const, points: 6, skip: 2 }
    const path = interlacedStarPath(star)
    expect(path.match(/M/g)).toHaveLength(2)
    const doc = parse(buildExportSvgString({ ...createDefaultProject(), layers: [star] }, options))
    expect(doc.querySelector('polygon')).toBeNull()
    expect(doc.querySelector('path')?.getAttribute('d')).toBe(path)
  })
  it('prevents editing repetitions beyond the project rendering budget', () => {
    const inner = { ...createGroupLayer([createRingLayer()]), repeatCount: 36 }
    const middle = createGroupLayer([inner])
    const outer = { ...createGroupLayer([middle]), repeatCount: 36 }
    useProjectStore.getState().setProject({ ...createDefaultProject(), layers: [outer] })
    useProjectStore.getState().updateLayer(middle.id, { repeatCount: 36 })
    expect(findLayer(useProjectStore.getState().project.layers, middle.id)).toMatchObject({
      repeatCount: 1,
    })
  })
  it('round-trips all layer types and recursively validates member IDs', () => {
    const project = {
      ...createDefaultProject(),
      layers: [createOrnamentalSeal(), createTextLayer(), createSymbolLayer()],
    }
    expect(parseProjectFileStrict(JSON.parse(JSON.stringify(project)))).toEqual({
      ok: true,
      project,
    })
    const ring = createRingLayer()
    project.layers = [createGroupLayer([ring, ring])]
    expect(parseProjectFileStrict(project).ok).toBe(false)
    expect(importProjectFile(project).ok).toBe(false)
  })
  it('rejects invalid geometry inside groups', () => {
    const star = { ...createShapeLayer(), innerRadius: 999 }
    expect(
      parseProjectFileStrict({ ...createDefaultProject(), layers: [createGroupLayer([star])] }).ok
    ).toBe(false)
  })
  it('generates unique text path and effect references in repeated and nested groups', () => {
    const group = createGroupLayer([{ ...createTextLayer(), glowBlur: 3 }, createOrnamentalSeal()])
    group.repeatCount = 3
    const doc = parse(buildExportSvgString({ ...createDefaultProject(), layers: [group] }, options))
    expect(doc.querySelector('parsererror')).toBeNull()
    const ids = [...doc.querySelectorAll('[id]')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const path of doc.querySelectorAll('textPath'))
      expect(ids).toContain(path.getAttribute('href')!.slice(1))
  })
  it('escapes text and colors instead of inserting HTML', () => {
    const text = {
      ...createTextLayer(),
      text: '<script>alert(1)</script> & "moon"',
      color: 'red" onload="evil()',
    }
    const doc = parse(buildExportSvgString({ ...createDefaultProject(), layers: [text] }, options))
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.querySelector('[onload]')).toBeNull()
    expect(doc.querySelector('textPath')?.textContent).toBe(text.text)
  })
  it('groups selected layers while preserving their relative positions and supports shared member edits', () => {
    const a = createRingLayer({
      radius: 50,
      transform: { x: 50, y: 20, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const b = {
      ...createSymbolLayer(),
      transform: { x: 60, y: 20, rotation: 0, scaleX: 1, scaleY: 1 },
    }
    useProjectStore.getState().setProject({ ...createDefaultProject(), layers: [a, b] })
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
    const id = useProjectStore.getState().groupLayers([a.id, b.id])!
    useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
    const group = useProjectStore.getState().project.layers[0]
    expect(group.type).toBe('group')
    expect(group.transform.x).toBe(55)
    useProjectStore.getState().updateLayer(id, { repeatCount: 5 })
    useProjectStore.getState().updateRingLayer(a.id, { radius: 80 })
    expect(findLayer(useProjectStore.getState().project.layers, a.id)).toMatchObject({
      radius: 80,
      transform: { x: -5 },
    })
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().project.layers).toEqual([a, b])
  })
  it('deeply duplicates groups without sharing IDs or child transforms', () => {
    const original = createOrnamentalSeal()
    const duplicate = cloneLayer(original)
    expect(duplicate.id).not.toBe(original.id)
    if (duplicate.type !== 'group') throw new Error('expected group')
    expect(duplicate.children[0].id).not.toBe(original.children[0].id)
    duplicate.children[0].transform.x = 100
    expect(original.children[0].transform.x).toBe(0)
  })
  it('rejects excessive nested repetitions before parsing', () => {
    let layer = createGroupLayer([createRingLayer()])
    for (let i = 0; i < 5; i++) layer = { ...createGroupLayer([layer]), repeatCount: 36 }
    expect(withinLayerBudget([layer])).toBe(false)
    expect(parseProjectFileStrict({ ...createDefaultProject(), layers: [layer] }).ok).toBe(false)
  })
})

describe('SVG symbol import', () => {
  it('keeps vector geometry, strips executable and external content, and is idempotent', () => {
    const source =
      '<svg viewBox="0 0 100 100" onload="evil()"><script>evil()</script><foreignObject><div>bad</div></foreignObject><image href="https://example.com/x"/><g transform="translate(2 3)"><path d="M0 0L100 100" stroke="red" fill="none" onclick="evil()"/></g></svg>'
    const clean = sanitizeSvg(source)
    expect(clean).not.toMatch(/script|foreignObject|image|https:|onload|onclick/)
    expect(clean).toContain('translate(2 3)')
    expect(clean).toContain('currentColor')
    expect(sanitizeSvg(clean)).toBe(clean)
    const symbol = { ...createSymbolLayer(), symbol: 'custom' as const, customSvg: source }
    const result = importProjectFile({ ...createDefaultProject(), layers: [symbol] })
    expect(result.ok && result.project.layers[0]).toMatchObject({ customSvg: clean })
  })
  it('rejects invalid or empty files', () => {
    expect(() => sanitizeSvg('<svg><bad')).toThrow()
    expect(() => sanitizeSvg('<svg viewBox="0 0 0 0"><path d="M0 0"/></svg>')).toThrow()
    expect(() => sanitizeSvg('<svg><image href="remote"/></svg>')).toThrow()
  })
})
