import { z } from 'zod'
import type { ProjectFile } from '../types/project'

// ─── Primitive helpers ────────────────────────────────────────────────────────

const fin = () => z.number().finite()

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const TransformSchema = z.object({
  x: fin(),
  y: fin(),
  rotation: fin(),
  scaleX: fin(),
  scaleY: fin(),
})

const BaseLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: fin().min(0).max(1),
  transform: TransformSchema,
})

export const RingLayerSchema = BaseLayerSchema.extend({
  type: z.literal('ring'),
  radius: fin().positive(),
  strokeWidth: fin().positive(),
  color: z.string().min(1),
})

export const RadialLinesLayerSchema = BaseLayerSchema.extend({
  type: z.literal('radial-lines'),
  count: fin().int().min(1),
  innerRadius: fin().min(0),
  outerRadius: fin().positive(),
  startAngle: fin(),
  strokeWidth: fin().positive(),
  color: z.string().min(1),
})

export const LayerSchema = z.discriminatedUnion('type', [RingLayerSchema, RadialLinesLayerSchema])

const ProjectMetaSchema = z.object({
  title: z.string().min(1),
  created: z.string().datetime(),
  modified: z.string().datetime(),
})

const CanvasSchema = z.object({
  width: fin().positive(),
  height: fin().positive(),
})

export const ProjectFileSchema = z.object({
  __magic_circle__: z.literal(true),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  meta: ProjectMetaSchema,
  canvas: CanvasSchema,
  layers: z.array(LayerSchema),
})

// ─── Import pipeline ──────────────────────────────────────────────────────────

export type ParseProjectResult =
  { ok: true; project: ProjectFile; warnings: string[] } | { ok: false; error: string }

const CURRENT_MAJOR = 1
const CURRENT_MINOR = 0
const CURRENT_VERSION = `${CURRENT_MAJOR}.${CURRENT_MINOR}.0`

const KNOWN_LAYER_TYPES = new Set(['ring', 'radial-lines'])

export function parseProjectFile(raw: unknown): ParseProjectResult {
  // Magic marker must be the literal boolean true
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as Record<string, unknown>).__magic_circle__ !== true
  ) {
    return { ok: false, error: 'Not a Magic Circle Editor project file.' }
  }

  const rawObj = raw as Record<string, unknown>

  // Version must be present and semver-shaped
  if (typeof rawObj.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(rawObj.version)) {
    return { ok: false, error: 'Project file version is missing or malformed.' }
  }

  const parts = rawObj.version.split('.')
  const fileMajor = parseInt(parts[0], 10)
  const fileMinor = parseInt(parts[1], 10)

  if (fileMajor !== CURRENT_MAJOR) {
    return {
      ok: false,
      error: `This file requires editor version ${rawObj.version} (current: ${CURRENT_VERSION}). Cannot open.`,
    }
  }

  const warnings: string[] = []

  if (fileMinor > CURRENT_MINOR) {
    warnings.push(
      `This file was created by a newer version (${rawObj.version}). Some features may not be available.`
    )
  }

  // Filter unknown layer types before full Zod validation so they don't fail the parse
  if (Array.isArray(rawObj.layers)) {
    const unknownTypes = new Set<string>()
    const filteredLayers = (rawObj.layers as unknown[]).filter((l) => {
      if (typeof l === 'object' && l !== null) {
        const type = (l as Record<string, unknown>).type
        if (typeof type === 'string' && !KNOWN_LAYER_TYPES.has(type)) {
          unknownTypes.add(type)
          return false
        }
      }
      return true
    })
    if (unknownTypes.size > 0) {
      warnings.push(
        `Some layers were skipped because their type is not supported: ${[...unknownTypes].join(', ')}.`
      )
      rawObj.layers = filteredLayers
    }
  }

  // Full Zod validation
  const result = ProjectFileSchema.safeParse(raw)
  if (!result.success) {
    console.error('[parseProjectFile] Zod validation failed:', result.error)
    return { ok: false, error: 'The project file is not valid and could not be opened.' }
  }

  // Cross-field: innerRadius must be strictly less than outerRadius
  for (const layer of result.data.layers) {
    if (layer.type === 'radial-lines' && layer.innerRadius >= layer.outerRadius) {
      return { ok: false, error: 'The project file is not valid and could not be opened.' }
    }
  }

  // Cross-field: layer IDs must be unique
  const ids = result.data.layers.map((l) => l.id)
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: 'The project file is not valid and could not be opened.' }
  }

  return { ok: true, project: result.data as ProjectFile, warnings }
}
