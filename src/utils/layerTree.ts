import { thornHeight } from './thornGeometry'
import type { GroupLayer, Layer } from '../types/layer'
import { generateId } from './id'

export function findLayer(layers: Layer[], id: string): Layer | undefined {
  for (const layer of layers) {
    if (layer.id === id) return layer
    if (layer.type === 'group') {
      const found = findLayer(layer.children, id)
      if (found) return found
    }
  }
}

export function mapLayer(layers: Layer[], id: string, edit: (layer: Layer) => Layer): Layer[] {
  return layers.map((layer) => {
    if (layer.locked) return layer
    if (layer.id === id) return edit(layer)
    return layer.type === 'group'
      ? { ...layer, children: mapLayer(layer.children, id, edit) }
      : layer
  })
}

export function cloneLayer(layer: Layer): Layer {
  const copy = { ...layer, id: generateId(), transform: { ...layer.transform } }
  return copy.type === 'group' ? { ...copy, children: copy.children.map(cloneLayer) } : copy
}

export function layerRadius(layer: Layer): number {
  if (layer.type === 'radial-lines') return layer.outerRadius
  if (layer.type === 'circular-text') return layer.radius + layer.fontSize * 1.5
  if (layer.type === 'group')
    return (
      (layer.repeatCount > 1 ? layer.repeatRadius : 0) +
      Math.max(
        10,
        ...layer.children.map(
          (child) =>
            Math.hypot(child.transform.x, child.transform.y) +
            layerRadius(child) *
              Math.max(Math.abs(child.transform.scaleX), Math.abs(child.transform.scaleY))
        )
      )
    )
  return layer.radius
}

export function repetitionTransform(group: GroupLayer, index: number): string {
  if (group.repeatCount === 1) return ''
  const angle = group.startAngle + (index * 360) / group.repeatCount
  const radians = (angle * Math.PI) / 180
  const rotation =
    group.orientation === 'upright' ? 0 : angle + (group.orientation === 'tangent' ? 90 : 0)
  return `translate(${Math.sin(radians) * group.repeatRadius}, ${-Math.cos(radians) * group.repeatRadius}) rotate(${rotation})`
}

/** Bound nested repetition before parsing or rendering project files. */
export function withinLayerBudget(raw: unknown): boolean {
  let cost = 0
  const visit = (items: unknown, depth: number, copies: number): boolean => {
    if (!Array.isArray(items) || depth > 6 || items.length > 500) return false
    return items.every((item) => {
      if (!item || typeof item !== 'object') return true
      const layer = item as Record<string, unknown>
      cost += copies
      if (cost > 5000) return false
      if (layer.type !== 'group') return true
      const count =
        typeof layer.repeatCount === 'number' && Number.isFinite(layer.repeatCount)
          ? Math.max(1, layer.repeatCount)
          : 1
      return visit(layer.children, depth + 1, copies * count)
    })
  }
  return visit(raw, 0, 1)
}

/** Conservative local painted bounds, including nested transforms and finish effects. */
export function artworkRadius(layer: Layer): number {
  const geometryRadius =
    layer.type === 'group'
      ? (layer.repeatCount > 1 ? layer.repeatRadius : 0) +
        Math.max(
          1,
          ...layer.children
            .filter((child) => child.visible)
            .map(
              (child) =>
                Math.hypot(child.transform.x, child.transform.y) +
                artworkRadius(child) *
                  Math.max(Math.abs(child.transform.scaleX), Math.abs(child.transform.scaleY))
            )
        )
      : layerRadius(layer) + ('strokeWidth' in layer ? layer.strokeWidth : 0)
  return (
    geometryRadius +
    thornHeight(layer) +
    (layer.outlineWidth ?? 0) +
    4 * Math.max(layer.glowBlur ?? 0, layer.shadowBlur ?? 0) +
    Math.max(Math.abs(layer.shadowX ?? 0), Math.abs(layer.shadowY ?? 0))
  )
}

export function stackRadius(layers: Layer[]): number {
  return Math.max(
    1,
    ...layers
      .filter((layer) => layer.visible)
      .map(
        (layer) =>
          Math.hypot(layer.transform.x, layer.transform.y) +
          artworkRadius(layer) *
            Math.max(Math.abs(layer.transform.scaleX), Math.abs(layer.transform.scaleY))
      )
  )
}
