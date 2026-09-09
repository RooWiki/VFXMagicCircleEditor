import type { RingLayer } from '../types/layer'

export type RingShape =
  { kind: 'circle'; radius: number; width: number } | { kind: 'path'; d: string; width: number }

const point = (radius: number, degrees: number) => {
  const angle = (degrees * Math.PI) / 180
  return `${Math.sin(angle) * radius} ${-Math.cos(angle) * radius}`
}

/** Decorations grow inward, keeping the outer radius and transform handles stable. */
export function computeRingShapes(layer: RingLayer): RingShape[] {
  const { radius, strokeWidth: width } = layer
  const style = layer.style ?? 'simple'
  const shapes: RingShape[] = [{ kind: 'circle', radius, width }]
  if (style === 'concentric') {
    const count = layer.ringCount ?? 3
    const spacing = Math.min(layer.spacing ?? 12, radius / count)
    for (let i = 1; i < count; i++) {
      shapes.push({ kind: 'circle', radius: radius - spacing * i, width })
    }
  } else if (style === 'divided') {
    const inner = radius - Math.min(layer.bandWidth ?? 20, radius * 0.95)
    const count = layer.divisions ?? 48
    shapes.push({ kind: 'circle', radius: inner, width })
    const d = Array.from({ length: count }, (_, i) => {
      const angle = (layer.startAngle ?? 0) + (i * 360) / count
      return `M ${point(inner, angle)} L ${point(radius, angle)}`
    }).join(' ')
    shapes.push({ kind: 'path', d, width: layer.dividerWidth ?? 2 })
  } else if (style === 'arc' && (layer.sweepAngle ?? 270) < 360) {
    const start = layer.startAngle ?? 0
    const sweep = layer.sweepAngle ?? 270
    return [
      {
        kind: 'path',
        width,
        d: `M ${point(radius, start)} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${point(radius, start + sweep)}`,
      },
    ]
  }
  return shapes
}
