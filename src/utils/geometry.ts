import type { RadialLinesLayer } from '../types/layer'

export interface LineSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Compute line segments for a RadialLinesLayer.
 *
 * Lines are distributed evenly around 360°, starting from startAngle measured
 * clockwise from 12 o'clock (top). Returns an empty array when the layer has
 * no lines or the radii are invalid (innerRadius >= outerRadius).
 */
export function computeRadialLines(layer: RadialLinesLayer): LineSegment[] {
  const { count, innerRadius, outerRadius, startAngle } = layer
  if (count <= 0 || innerRadius >= outerRadius) return []
  const lines: LineSegment[] = []
  for (let i = 0; i < count; i++) {
    const angleDeg = startAngle + (i * 360) / count
    const angleRad = (angleDeg * Math.PI) / 180
    const cosA = Math.cos(angleRad)
    const sinA = Math.sin(angleRad)
    lines.push({
      x1: sinA * innerRadius,
      y1: -cosA * innerRadius,
      x2: sinA * outerRadius,
      y2: -cosA * outerRadius,
    })
  }
  return lines
}
