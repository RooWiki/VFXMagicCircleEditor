import type { Layer } from '../types/layer'
import { strokeSpans, type StrokeSpan } from './strokeSpans'

const FOLLOWING_TEXTURES = ['hatching', 'crosshatch', 'dots', 'scales', 'cracks', 'fibers']
export function followsStroke(layer: Layer): boolean {
  return (
    (layer.type === 'ring' || layer.type === 'radial-lines') &&
    FOLLOWING_TEXTURES.includes(layer.lineTexture ?? '')
  )
}

/** Map texture coordinates (distance, offset) onto the stroke's tangent/normal frame. */
function polygon(span: StrokeSpan, vertices: number[][]): string {
  const points: string[] = []
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length]
    const steps = Math.min(12, Math.max(1, Math.ceil(Math.abs(b[0] - a[0]) / 3)))
    for (let j = 0; j < steps; j++) {
      const u = a[0] + ((b[0] - a[0]) * j) / steps
      const v = a[1] + ((b[1] - a[1]) * j) / steps
      const t = span.closed ? u / span.length : Math.max(0, Math.min(1, u / span.length))
      const p = span.point(t)
      points.push(`${p.x + p.ty * v} ${p.y - p.tx * v}`)
    }
  }
  return `M ${points.join(' L ')} Z`
}

/** Repeat in arc length, not canvas coordinates. Closed rings use an integer tile count. */
export function strokeTexturePath(layer: Layer): string {
  const spans = strokeSpans(layer)
  const total = spans.reduce((sum, span) => sum + span.length, 0)
  const scale = Math.max(layer.textureScale ?? 6, total / 5000)
  const paths: string[] = []
  const phase = ((layer.textureSeed ?? 1) % 101) / 101
  for (const span of spans) {
    if (!span.length) continue
    const count = Math.max(1, Math.round(span.length / scale))
    const period = span.length / count
    const half = span.width / 2
    const add = (points: number[][]) => paths.push(polygon(span, points))
    const ribbon = (points: number[][], width: number) => {
      for (let j = 0; j < points.length - 1; j++) {
        const a = points[j],
          b = points[j + 1]
        add([
          [a[0] - width / 2, a[1]],
          [a[0] + width / 2, a[1]],
          [b[0] + width / 2, b[1]],
          [b[0] - width / 2, b[1]],
        ])
      }
    }
    // Cover an open stroke's end caps; a closed stroke wraps exactly once.
    const extra = span.closed ? 0 : Math.ceil(half / period) + 1
    for (let i = -extra; i < count + extra; i++) {
      const u = (i + phase) * period
      switch (layer.lineTexture) {
        case 'hatching':
          add([
            [u - half, -half],
            [u - half + period * 0.4, -half],
            [u + half + period * 0.4, half],
            [u + half, half],
          ])
          break
        case 'crosshatch':
          for (const sign of [-1, 1])
            ribbon(
              [
                [u - half * sign, -half],
                [u + half * sign, half],
              ],
              period * 0.18
            )
          break
        case 'dots': {
          const radius = Math.min(period * 0.36, half * 0.7)
          add(
            Array.from({ length: 12 }, (_, n) => {
              const angle = (n * Math.PI) / 6
              return [u + period / 2 + Math.cos(angle) * radius, Math.sin(angle) * radius]
            })
          )
          break
        }
        case 'scales':
          ribbon(
            Array.from({ length: 9 }, (_, n) => {
              const v = -half + (n * span.width) / 8
              return [u + period * 0.55 * (1 - (v / half) ** 2), v]
            }),
            period * 0.18
          )
          break
        case 'cracks':
          ribbon(
            [
              [u, -half],
              [u + period * 0.35, -half * 0.4],
              [u + period * 0.1, half * 0.25],
              [u + period * 0.4, half],
            ],
            period * 0.16
          )
          ribbon(
            [
              [u + period * 0.1, half * 0.25],
              [u + period * 0.8, half * 0.05],
            ],
            period * 0.13
          )
          break
        case 'fibers':
          for (const v of [-0.65, -0.1, 0.5]) {
            const thickness = span.width * 0.12
            const offset = Math.sin((i + phase) * 2.4) * span.width * 0.06
            add([
              [u, v * half + offset],
              [u + period, v * half],
              [u + period, v * half + thickness],
              [u, v * half + offset + thickness],
            ])
          }
          break
      }
    }
  }
  return paths.join(' ')
}
