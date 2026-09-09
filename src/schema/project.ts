import { withinLayerBudget } from '../utils/layerTree'
import { z } from 'zod'
import { sanitizeSvg } from '../utils/sanitizeSvg'
import type { Layer } from '../types/layer'
import type { ProjectFile } from '../types/project'

// ─── Element schemas ───────────────────────────────────────────────────────────

export const TransformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
  scaleX: z.number().finite(),
  scaleY: z.number().finite(),
})

export const BaseLayerSchema = z.object({
  fill: z.string().max(50).optional(),
  knockout: z.boolean().optional(),
  outlineWidth: z.number().finite().min(0).max(40).optional(),
  outlineColor: z.string().max(50).optional(),
  glowBlur: z.number().finite().min(0).max(40).optional(),
  glowColor: z.string().max(50).optional(),
  shadowBlur: z.number().finite().min(0).max(40).optional(),
  shadowColor: z.string().max(50).optional(),
  shadowX: z.number().finite().min(-100).max(100).optional(),
  shadowY: z.number().finite().min(-100).max(100).optional(),
  id: z.string().uuid(),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1),
  transform: TransformSchema,
})

export const RingLayerSchema = BaseLayerSchema.extend({
  type: z.literal('ring'),
  style: z.enum(['simple', 'concentric', 'divided', 'arc']).optional(),
  ringCount: z.number().int().min(2).max(20).optional(),
  spacing: z.number().finite().positive().optional(),
  bandWidth: z.number().finite().positive().optional(),
  divisions: z.number().int().min(1).max(360).optional(),
  dividerWidth: z.number().finite().positive().optional(),
  startAngle: z.number().finite().optional(),
  sweepAngle: z.number().finite().min(1).max(360).optional(),
  radius: z.number().positive(),
  strokeWidth: z.number().positive(),
  color: z.string().min(1),
})

export const RadialLinesLayerSchema = BaseLayerSchema.extend({
  type: z.literal('radial-lines'),
  sweepAngle: z.number().finite().min(1).max(360).optional(),
  twistAngle: z.number().finite().min(-180).max(180).optional(),
  majorEvery: z.number().int().min(1).max(360).optional(),
  minorLength: z.number().finite().min(0.01).max(1).optional(),
  lineCap: z.enum(['round', 'butt', 'square']).optional(),
  count: z.number().int().min(1),
  innerRadius: z.number().min(0),
  outerRadius: z.number().positive(),
  startAngle: z.number().finite(),
  strokeWidth: z.number().positive(),
  color: z.string().min(1),
})

export const ShapeLayerSchema = BaseLayerSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['star', 'polygon']),
  starMode: z.enum(['outline', 'interlaced']).optional(),
  skip: z.number().int().min(2).max(31).optional(),
  points: z.number().int().min(3).max(64),
  radius: z.number().finite().positive(),
  innerRadius: z.number().finite().min(0),
  strokeWidth: z.number().finite().positive(),
  color: z.string().min(1),
})
export const TextLayerSchema = BaseLayerSchema.extend({
  type: z.literal('circular-text'),
  text: z.string().max(2000),
  fitToCircle: z.boolean().optional(),
  radius: z.number().finite().positive(),
  fontSize: z.number().finite().min(1).max(300),
  fontFamily: z.enum(['serif', 'sans-serif', 'monospace']),
  letterSpacing: z.number().finite().min(-10).max(100),
  startAngle: z.number().finite(),
  direction: z.enum(['clockwise', 'counterclockwise']),
  color: z.string().min(1),
  strokeWidth: z.number().finite().min(0).max(20),
})
export const SymbolLayerSchema = BaseLayerSchema.extend({
  type: z.literal('symbol'),
  symbol: z.enum(['sun', 'moon', 'cross', 'rune', 'diamond', 'custom']),
  customSvg: z
    .string()
    .max(200000)
    .transform((source, ctx) => {
      try {
        return sanitizeSvg(source)
      } catch (error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: String(error) })
        return z.NEVER
      }
    })
    .optional(),
  radius: z.number().finite().positive(),
  strokeWidth: z.number().finite().positive(),
  color: z.string().min(1),
})
export const LayerSchema: z.ZodType<Layer> = z.lazy(() =>
  z.union([
    RingLayerSchema,
    RadialLinesLayerSchema,
    ShapeLayerSchema,
    TextLayerSchema,
    SymbolLayerSchema,
    BaseLayerSchema.extend({
      type: z.literal('group'),
      children: z.array(LayerSchema).max(100),
      repeatCount: z.number().int().min(1).max(36),
      repeatRadius: z.number().finite().min(0),
      startAngle: z.number().finite(),
      orientation: z.enum(['upright', 'radial', 'tangent']),
    }),
  ])
)

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
  if (layer.type === 'shape' && layer.innerRadius > layer.radius)
    return 'Star inner radius must not exceed outer radius.'
  if (layer.type === 'symbol' && layer.symbol === 'custom' && !layer.customSvg)
    return 'Custom symbols require SVG geometry.'
  if (layer.type === 'group') {
    for (const child of layer.children) {
      const error = checkLayerCrossFields(child)
      if (error) return error
    }
  }
  return null
}

function checkUniqueIds(layers: Layer[]): string | null {
  const ids: string[] = []
  const visit = (items: Layer[]) =>
    items.forEach((layer) => {
      ids.push(layer.id)
      if (layer.type === 'group') visit(layer.children)
    })
  visit(layers)
  if (new Set(ids).size !== ids.length) return 'Project file contains duplicate layer IDs'
  return null
}

// ─── Result types ──────────────────────────────────────────────────────────────

export type ParseResult = { ok: true; project: ProjectFile } | { ok: false; error: string }

export type ImportResult =
  { ok: true; project: ProjectFile; skippedLayers: number } | { ok: false; error: string }

// ─── Strict parse — used for autosave restore and schema tests ─────────────────

export function parseProjectFileStrict(raw: unknown): ParseResult {
  if (raw && typeof raw === 'object' && 'layers' in raw && !withinLayerBudget(raw.layers))
    return { ok: false, error: 'Project exceeds the group depth or repeated layer limit.' }
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
  if (raw && typeof raw === 'object' && 'layers' in raw && !withinLayerBudget(raw.layers))
    return { ok: false, error: 'Project exceeds the group depth or repeated layer limit.' }
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
