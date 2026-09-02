import { z } from 'zod'
import type { Layer } from '../types/layer'
import type { ProjectFile } from '../types/project'

// ─── Element schemas ───────────────────────────────────────────────────────────

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
})

export const BaseLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1),
  transform: TransformSchema,
})

export const RingLayerSchema = BaseLayerSchema.extend({
  type: z.literal('ring'),
  radius: z.number().positive(),
  strokeWidth: z.number().positive(),
  color: z.string().min(1),
})

export const RadialLinesLayerSchema = BaseLayerSchema.extend({
  type: z.literal('radial-lines'),
  count: z.number().int().min(1),
  innerRadius: z.number().min(0),
  outerRadius: z.number().positive(),
  startAngle: z.number(),
  strokeWidth: z.number().positive(),
  color: z.string().min(1),
})

export const LayerSchema = z.discriminatedUnion('type', [RingLayerSchema, RadialLinesLayerSchema])

export const ProjectMetaSchema = z.object({
  title: z.string().min(1),
  created: z.string().datetime(),
  modified: z.string().datetime(),
})

export const CanvasSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
})

export const ProjectFileSchema = z.object({
  __magic_circle__: z.literal(true),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  meta: ProjectMetaSchema,
  canvas: CanvasSchema,
  layers: z.array(LayerSchema),
})

// Accepts unknown layer types in the array — used for lenient import
const ProjectFileLooseSchema = z.object({
  __magic_circle__: z.literal(true),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  meta: ProjectMetaSchema,
  canvas: CanvasSchema,
  layers: z.array(z.unknown()),
})

// ─── Cross-field validation ────────────────────────────────────────────────────

function checkLayerCrossFields(layer: z.infer<typeof LayerSchema>): string | null {
  if (layer.type === 'radial-lines' && layer.innerRadius >= layer.outerRadius) {
    return `Layer "${layer.name}": innerRadius must be less than outerRadius`
  }
  return null
}

function checkUniqueIds(layers: { id: string }[]): string | null {
  const ids = layers.map((l) => l.id)
  if (new Set(ids).size !== ids.length) return 'Project file contains duplicate layer IDs'
  return null
}

// ─── Result types ──────────────────────────────────────────────────────────────

export type ParseResult = { ok: true; project: ProjectFile } | { ok: false; error: string }

export type ImportResult =
  { ok: true; project: ProjectFile; skippedLayers: number } | { ok: false; error: string }

// ─── Strict parse — used for autosave restore and schema tests ─────────────────

export function parseProjectFileStrict(raw: unknown): ParseResult {
  const result = ProjectFileSchema.safeParse(raw)
  if (!result.success) {
    console.error('[schema] Strict parse failed:', result.error.issues)
    return { ok: false, error: 'Invalid project file format.' }
  }
  const uniqueErr = checkUniqueIds(result.data.layers)
  if (uniqueErr) return { ok: false, error: uniqueErr }
  for (const layer of result.data.layers) {
    const crossErr = checkLayerCrossFields(layer)
    if (crossErr) return { ok: false, error: crossErr }
  }
  return { ok: true, project: result.data as unknown as ProjectFile }
}

// ─── Lenient import — skips unknown layer types, fails on bad known layers ─────

export function importProjectFile(raw: unknown): ImportResult {
  const looseResult = ProjectFileLooseSchema.safeParse(raw)
  if (!looseResult.success) {
    console.error('[schema] Import structure failed:', looseResult.error.issues)
    return { ok: false, error: 'Invalid project file format.' }
  }
  const loose = looseResult.data

  const validLayers: Layer[] = []
  let skippedLayers = 0
  for (const rawLayer of loose.layers) {
    const lr = LayerSchema.safeParse(rawLayer)
    if (!lr.success) {
      skippedLayers++
      continue
    }
    const crossErr = checkLayerCrossFields(lr.data)
    if (crossErr) return { ok: false, error: crossErr }
    validLayers.push(lr.data as unknown as Layer)
  }

  const uniqueErr = checkUniqueIds(validLayers)
  if (uniqueErr) return { ok: false, error: uniqueErr }

  const project: ProjectFile = {
    __magic_circle__: true,
    version: loose.version,
    meta: loose.meta,
    canvas: loose.canvas,
    layers: validLayers,
  }

  return { ok: true, project, skippedLayers }
}
