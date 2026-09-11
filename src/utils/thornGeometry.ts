import type { Layer } from '../types/layer'
import { strokeSpans } from './strokeSpans'

export function thornHeight(layer: Layer): number {
  if (layer.lineTexture !== 'thorns' || !['ring', 'radial-lines'].includes(layer.type)) return 0
  return (
    Math.min(
      48,
      Math.max(
        ('strokeWidth' in layer ? layer.strokeWidth : 1) * 1.5,
        (layer.textureScale ?? 6) * 0.9
      )
    ) *
    ((layer.textureAmount ?? 75) / 100)
  )
}

/** Bounded, deterministic geometry; follows rings, arcs and tilted radial lines. */
export function thornPath(layer: Layer): string {
  const height = thornHeight(layer)
  if (!height) return ''
  const spans = strokeSpans(layer)
  const total = spans.reduce((sum, span) => sum + span.length, 0)
  const spacing = Math.max((layer.textureScale ?? 6) * 4, total / 1800, 4)
  let seed = (layer.textureSeed ?? 1) + 1
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const paths: string[] = []
  for (const span of spans) {
    const count = Math.floor(span.length / spacing)
    for (let i = 0; i < count; i++) {
      const p = span.point((i + 0.3 + random() * 0.4) / count)
      const side = i % 2 ? -1 : 1
      const nx = p.ty * side,
        ny = -p.tx * side
      const h = span.width / 2 + height * (0.65 + random() * 0.35)
      const half = Math.min(spacing * 0.22, height * 0.55)
      const lean = half * (0.4 + random() * 0.6)
      paths.push(
        `M ${p.x - p.tx * half} ${p.y - p.ty * half} L ${p.x + nx * h + p.tx * lean} ${p.y + ny * h + p.ty * lean} L ${p.x + p.tx * half} ${p.y + p.ty * half} Z`
      )
    }
  }
  return paths.join(' ')
}
