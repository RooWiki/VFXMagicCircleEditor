import type { Layer } from '../types/layer'
import { computeRadialLines } from './geometry'
import { computeRingShapes } from './ringGeometry'

export type StrokeSpan = {
  closed?: boolean
  length: number
  width: number
  point: (t: number) => { x: number; y: number; tx: number; ty: number }
}
export function strokeSpans(layer: Layer): StrokeSpan[] {
  const spans: StrokeSpan[] = []
  const line = (x1: number, y1: number, x2: number, y2: number, width: number) => {
    const length = Math.hypot(x2 - x1, y2 - y1)
    if (!length) return
    spans.push({
      length,
      width,
      point: (t) => ({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        tx: (x2 - x1) / length,
        ty: (y2 - y1) / length,
      }),
    })
  }
  const arc = (radius: number, start: number, sweep: number, width: number) =>
    spans.push({
      closed: sweep === 360,
      length: Math.abs((radius * sweep * Math.PI) / 180),
      width,
      point: (t) => {
        const angle = ((start + sweep * t) * Math.PI) / 180
        return {
          x: Math.sin(angle) * radius,
          y: -Math.cos(angle) * radius,
          tx: Math.cos(angle),
          ty: Math.sin(angle),
        }
      },
    })
  if (layer.type === 'radial-lines') {
    for (const segment of computeRadialLines(layer))
      line(segment.x1, segment.y1, segment.x2, segment.y2, layer.strokeWidth)
  } else if (layer.type === 'ring') {
    if (layer.style === 'arc' && (layer.sweepAngle ?? 270) < 360)
      arc(layer.radius, layer.startAngle ?? 0, layer.sweepAngle ?? 270, layer.strokeWidth)
    else {
      for (const shape of computeRingShapes(layer))
        if (shape.kind === 'circle') arc(shape.radius, 0, 360, shape.width)
      if (layer.style === 'divided') {
        const inner = layer.radius - Math.min(layer.bandWidth ?? 20, layer.radius * 0.95)
        for (let i = 0; i < (layer.divisions ?? 48); i++) {
          const angle =
            (((layer.startAngle ?? 0) + (i * 360) / (layer.divisions ?? 48)) * Math.PI) / 180
          line(
            Math.sin(angle) * inner,
            -Math.cos(angle) * inner,
            Math.sin(angle) * layer.radius,
            -Math.cos(angle) * layer.radius,
            layer.dividerWidth ?? 2
          )
        }
      }
    }
  }
  return spans
}
