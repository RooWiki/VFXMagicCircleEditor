import { applyLineTexture } from './lineTexture'
import { EXTRA_SYMBOLS } from './symbolCatalog'
import type { Layer, ShapeLayer } from '../types/layer'
import { computeRingShapes } from './ringGeometry'
import { computeRadialLines } from './geometry'
import { repetitionTransform, artworkRadius, stackRadius } from './layerTree'

export const xml = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!
  )
export const layerTransform = (layer: Layer) => {
  const t = layer.transform
  return `translate(${t.x}, ${t.y}) rotate(${t.rotation}) scale(${t.scaleX}, ${t.scaleY})`
}
export function shapePoints(layer: ShapeLayer): string {
  const count = layer.shape === 'star' ? layer.points * 2 : layer.points
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * Math.PI * 2) / count
    const radius = layer.shape === 'star' && i % 2 ? layer.innerRadius : layer.radius
    return `${Math.sin(angle) * radius},${-Math.cos(angle) * radius}`
  }).join(' ')
}

export function interlacedStarPath(layer: ShapeLayer): string {
  const visited = new Set<number>()
  const paths: string[] = []
  const skip = Math.min(layer.skip ?? 2, layer.points - 1)
  for (let start = 0; start < layer.points; start++) {
    if (visited.has(start)) continue
    let index = start
    let path = ''
    do {
      visited.add(index)
      const angle = (index * Math.PI * 2) / layer.points
      path += `${path ? ' L' : 'M'} ${Math.sin(angle) * layer.radius} ${-Math.cos(angle) * layer.radius}`
      index = (index + skip) % layer.points
    } while (index !== start)
    paths.push(`${path} Z`)
  }
  return paths.join(' ')
}

function geometry(layer: Layer, prefix: string, silhouette = false): string {
  if (layer.type === 'group')
    return Array.from(
      { length: layer.repeatCount },
      (_, i) =>
        `<g transform="${repetitionTransform(layer, i)}">${buildArtworkStack(layer.children, `${prefix}-copy${i}`)}</g>`
    ).join('')
  const color = silhouette ? '#000000' : xml(layer.color)
  const fill = silhouette ? '#000000' : xml(layer.fill ?? 'none')
  const stroke = silhouette ? 'none' : color
  const width = silhouette ? 0 : layer.strokeWidth
  const attrs = `fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"`
  if (layer.type === 'ring') {
    if (silhouette) return `<circle r="${layer.radius}" fill="black" />`
    const background =
      layer.fill && layer.fill !== 'none' ? `<circle r="${layer.radius}" fill="${fill}" />` : ''
    return (
      background +
      computeRingShapes(layer)
        .map((shape) =>
          shape.kind === 'circle'
            ? `<circle cx="0" cy="0" r="${shape.radius}" fill="none" stroke="${color}" stroke-width="${shape.width}" />`
            : `<path d="${shape.d}" fill="none" stroke="${color}" stroke-width="${shape.width}" />`
        )
        .join('')
    )
  }
  if (layer.type === 'radial-lines')
    return computeRadialLines(layer)
      .map(
        (line) =>
          `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" stroke="${color}" stroke-width="${layer.strokeWidth}" stroke-linecap="${layer.lineCap ?? 'round'}" />`
      )
      .join('')
  if (layer.type === 'shape' && layer.shape === 'star' && layer.starMode === 'interlaced')
    return `<path d="${interlacedStarPath(layer)}" ${attrs} />`
  if (layer.type === 'shape') return `<polygon points="${shapePoints(layer)}" ${attrs} />`
  if (layer.type === 'circular-text') {
    const r = layer.radius
    const sweep = layer.direction === 'clockwise' ? 1 : 0
    const id = `${prefix}-text`
    const path = `M 0 ${-r} A ${r} ${r} 0 1 ${sweep} 0 ${r} A ${r} ${r} 0 1 ${sweep} 0 ${-r}`
    return `<g transform="rotate(${layer.startAngle})"><defs><path id="${id}" d="${path}" /></defs><text fill="${color}" stroke="${stroke}" stroke-width="${width}" font-family="${layer.fontFamily}" font-size="${layer.fontSize}" letter-spacing="${layer.letterSpacing}"><textPath href="#${id}"${layer.fitToCircle ? ` textLength="${2 * Math.PI * r * 0.98}" lengthAdjust="spacingAndGlyphs"` : ''}>${xml(layer.text)}</textPath></text></g>`
  }
  const r = layer.radius
  if (layer.symbol === 'custom' && layer.customSvg) {
    const viewBox = layer.customSvg
      .match(/viewBox="([^"]+)"/)?.[1]
      .split(' ')
      .map(Number) ?? [0, 0, 100, 100]
    const importedFill = silhouette ? '#000000' : xml(layer.fill ?? layer.color)
    const importedWidth = (width * Math.max(viewBox[2], viewBox[3])) / (2 * r)
    let svg = layer.customSvg.replace(/ stroke-width="[^"]*"/g, '')
    svg = svg
      .replace(/fill="currentColor"/g, `fill="${importedFill}"`)
      .replace(/stroke="(?:currentColor|none)"/g, `stroke="${stroke}"`)
    return `<g color="${color}">${svg.replace('<svg ', `<svg x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" stroke-width="${importedWidth}" `)}</g>`
  }
  const paths: Record<string, string> = {
    ...Object.fromEntries(Object.entries(EXTRA_SYMBOLS).map(([id, symbol]) => [id, symbol.path])),
    rune: 'M 0 -45 L 0 45 M 0 -45 L 28 -15 L 0 10 M 0 -20 L -24 4',
    cross: 'M 0 -45 L 0 45 M -30 -12 L 30 -12',
    diamond: 'M 0 -48 L 30 0 L 0 48 L -30 0 Z',
    moon: 'M 20 -43 A 48 48 0 1 0 20 43 A 43 43 0 0 1 20 -43 Z',
  }
  if (layer.symbol === 'sun') {
    return `<g transform="scale(${r / 50})" fill="${fill}" stroke="${stroke}" stroke-width="${(width * 50) / r}"><circle r="23" />${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M 0 -31 L 0 -48" />`).join('')}</g>`
  }
  return `<path transform="scale(${r / 50})" d="${paths[layer.symbol] ?? paths.rune}" fill="${fill}" stroke="${stroke}" stroke-width="${(width * 50) / r}" stroke-linecap="round" stroke-linejoin="round" />`
}

export function buildLayerContent(layer: Layer, prefix: string): string {
  const content = applyLineTexture(layer, geometry(layer, prefix), prefix)
  if (
    !layer.outlineWidth &&
    !layer.glowBlur &&
    !layer.shadowBlur &&
    !layer.shadowX &&
    !layer.shadowY
  )
    return content
  const id = `${prefix}-finish`
  const nodes: string[] = []
  const merge: string[] = []
  if (layer.outlineWidth) {
    nodes.push(
      `<feMorphology in="SourceAlpha" operator="dilate" radius="${layer.outlineWidth}" result="outlineShape" /><feFlood flood-color="${xml(layer.outlineColor ?? '#660000')}" /><feComposite in2="outlineShape" operator="in" result="outline" />`
    )
    merge.push('<feMergeNode in="outline" />')
  }
  if (layer.glowBlur) {
    nodes.push(
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${layer.glowBlur}" result="glowShape" /><feFlood flood-color="${xml(layer.glowColor ?? '#ff4444')}" /><feComposite in2="glowShape" operator="in" result="glow" />`
    )
    merge.unshift('<feMergeNode in="glow" />')
  }
  if (layer.shadowBlur || layer.shadowX || layer.shadowY) {
    nodes.push(
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${layer.shadowBlur ?? 0}" result="shadowBlur" /><feOffset in="shadowBlur" dx="${layer.shadowX ?? 0}" dy="${layer.shadowY ?? 0}" result="shadowShape" /><feFlood flood-color="${xml(layer.shadowColor ?? '#000000')}" /><feComposite in2="shadowShape" operator="in" result="shadow" />`
    )
    merge.unshift('<feMergeNode in="shadow" />')
  }
  const extent = artworkRadius(layer)
  return `<defs><filter id="${id}" filterUnits="userSpaceOnUse" x="${-extent}" y="${-extent}" width="${extent * 2}" height="${extent * 2}" color-interpolation-filters="sRGB">${nodes.join('')}<feMerge>${merge.join('')}<feMergeNode in="SourceGraphic" /></feMerge></filter></defs><g filter="url(#${id})">${content}</g>`
}

/** Opaque cutout silhouettes only; the layer's visible outline is drawn separately. */
export function buildCutouts(layer: Layer, prefix: string): string {
  if (!layer.visible) return ''
  let content = ''
  if (layer.type === 'group') {
    const children = layer.children
      .map((child, j) => buildCutouts(child, `${prefix}-${j}`))
      .join('')
    if (children)
      content = Array.from(
        { length: layer.repeatCount },
        (_, i) => `<g transform="${repetitionTransform(layer, i)}">${children}</g>`
      ).join('')
  } else if (layer.knockout) content = geometry(layer, prefix, true)
  return content ? `<g transform="${layerTransform(layer)}">${content}</g>` : ''
}

export function cutoutMask(id: string, content: string, extent = 2000): string {
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="${-extent}" y="${-extent}" width="${extent * 2}" height="${extent * 2}" style="mask-type:luminance"><rect x="${-extent}" y="${-extent}" width="${extent * 2}" height="${extent * 2}" fill="white" />${content}</mask>`
}

export function buildArtworkStack(layers: Layer[], prefix = 'export'): string {
  let content = ''
  const extent = stackRadius(layers)
  layers.forEach((layer, i) => {
    if (!layer.visible) return
    const id = `${prefix}-${i}`
    const cutouts = buildCutouts(layer, `${id}-cut`)
    if (cutouts && content)
      content = `<defs>${cutoutMask(`${id}-mask`, cutouts, extent)}</defs><g mask="url(#${id}-mask)">${content}</g>`
    content += `<g transform="${layerTransform(layer)}" opacity="${layer.opacity}">${buildLayerContent(layer, id)}</g>`
  })
  return content
}
