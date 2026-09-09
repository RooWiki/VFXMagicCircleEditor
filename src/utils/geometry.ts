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
    const sweep = layer.sweepAngle ?? 360
    const steps = sweep === 360 ? count : Math.max(1, count - 1)
    const angleDeg = startAngle + (i * sweep) / steps
    const angleRad = (angleDeg * Math.PI) / 180
    const cosA = Math.cos(angleRad)
    const sinA = Math.sin(angleRad)
    const outerAngle = angleRad + ((layer.twistAngle ?? 0) * Math.PI) / 180
    const endX = Math.sin(outerAngle) * outerRadius
    const endY = -Math.cos(outerAngle) * outerRadius
    const fraction = i % (layer.majorEvery ?? 1) === 0 ? 1 : (layer.minorLength ?? 0.5)
    // Short marks stay anchored to the outer edge, including tilted patterns.
    const startX = endX + (sinA * innerRadius - endX) * fraction
    const startY = endY + (-cosA * innerRadius - endY) * fraction
    lines.push({
      x1: fraction === 1 ? sinA * innerRadius : startX,
      y1: fraction === 1 ? -cosA * innerRadius : startY,
      x2: endX,
      y2: endY,
    })
  }
  return lines
}
