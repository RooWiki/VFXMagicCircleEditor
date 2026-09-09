import type { ProjectFile } from '../types/project'
import { buildArtworkStack, xml } from './artwork'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportOptions {
  widthPx: number
  heightPx: number
  backgroundColor: string | null // null = transparent
  marginPercent: number // 0..50 — expands viewBox symmetrically
  selectedLayerId: string | null // null = export all visible layers
}

// ─── Validation ───────────────────────────────────────────────────────────────

// Returns an error message, or null when the value is valid.
export function validateResolution(value: unknown): string | null {
  if (typeof value !== 'number' || isNaN(value)) return 'Resolution must be a number.'
  if (!Number.isInteger(value)) return 'Resolution must be a whole number.'
  if (value <= 0) return 'Resolution must be greater than 0.'
  if (value > 4096) return 'Resolution must not exceed 4096.'
  return null
}

// ─── Main export builder ──────────────────────────────────────────────────────

/**
 * Builds a standalone SVG string from project data only.
 * Does NOT reference or clone any DOM element from the editor.
 * Does NOT contain grid, guides, selection overlay, transform handles,
 * hit-area strokes, pointer-events, data-testid, or any editor-only element.
 */
export function buildExportSvgString(project: ProjectFile, options: ExportOptions): string {
  const { widthPx, heightPx, backgroundColor, marginPercent, selectedLayerId } = options
  const { canvas } = project

  // Determine which layers to render.
  // Hidden layers are always excluded.
  let layers = project.layers.filter((l) => l.visible)
  if (selectedLayerId !== null) {
    layers = layers.filter((l) => l.id === selectedLayerId)
  }

  // Compute viewBox. Margin expands each side by (canvas.width * margin%) logical units.
  const halfW = canvas.width / 2
  const halfH = canvas.height / 2
  const mw = (canvas.width * marginPercent) / 100
  const mh = (canvas.height * marginPercent) / 100
  const vx = -(halfW + mw)
  const vy = -(halfH + mh)
  const vw = canvas.width + 2 * mw
  const vh = canvas.height + 2 * mh
  const viewBox = `${vx} ${vy} ${vw} ${vh}`

  // Build artwork group contents.
  const parts: string[] = []

  // Background rect must be the FIRST element in the root artwork group.
  if (backgroundColor !== null) {
    parts.push(
      `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${xml(backgroundColor)}" />`
    )
  }

  parts.push(buildArtworkStack(layers))

  const artwork = `<g>${parts.join('')}</g>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${widthPx}" height="${heightPx}" ` +
    `viewBox="${viewBox}">` +
    artwork +
    `</svg>`
  )
}
