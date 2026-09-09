/** Import vector geometry only. No scripts, URLs, embedded images, CSS or foreign HTML. */
export function sanitizeSvg(source: string): string {
  if (source.length > 200000) throw new Error('SVG must be smaller than 200 KB.')
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  const root = doc.documentElement
  if (doc.querySelector('parsererror') || root.localName !== 'svg')
    throw new Error('Choose a valid SVG file.')
  const viewBox = (
    root.getAttribute('viewBox') ??
    `0 0 ${parseFloat(root.getAttribute('width') ?? '100')} ${parseFloat(root.getAttribute('height') ?? '100')}`
  )
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0)
    throw new Error('SVG needs a valid viewBox or width and height.')
  const allowed = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])
  const geometry = new Set([
    'd',
    'points',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'x',
    'y',
    'width',
    'height',
    'x1',
    'x2',
    'y1',
    'y2',
    'transform',
    'stroke-width',
    'fill-rule',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'fill-opacity',
    'stroke-opacity',
  ])
  let count = 0
  const clean = (element: Element, depth: number): string => {
    if (depth > 20 || ++count > 1000)
      throw new Error('SVG is too complex. Simplify its paths first.')
    if (!allowed.has(element.localName)) return ''
    const node = doc.createElementNS('http://www.w3.org/2000/svg', element.localName)
    for (const attr of Array.from(element.attributes)) {
      if (geometry.has(attr.name) && /^[\da-zA-Z\s.,+\-()]*$/.test(attr.value))
        node.setAttribute(attr.name, attr.value)
      if (attr.name === 'fill' || attr.name === 'stroke')
        node.setAttribute(attr.name, attr.value === 'none' ? 'none' : 'currentColor')
    }
    // Preserve common presentation styles while discarding all other CSS.
    const style = element.getAttribute('style') ?? ''
    for (const declaration of style.split(';')) {
      const [key, value] = declaration.split(':').map((s) => s.trim())
      if ((key === 'fill' || key === 'stroke') && value)
        node.setAttribute(key, value === 'none' ? 'none' : 'currentColor')
      if (key === 'stroke-width' && /^\d+(\.\d+)?$/.test(value ?? '')) node.setAttribute(key, value)
    }
    const contents = Array.from(element.children)
      .map((child) => clean(child, depth + 1))
      .join('')
    const serialized = new XMLSerializer().serializeToString(node).replace(/\s+xmlns="[^"]*"/g, '')
    return serialized.replace(/\s*\/>$/, `>${contents}</${element.localName}>`)
  }
  const content = Array.from(root.children)
    .map((child) => clean(child, 0))
    .join('')
  if (!content || !/<(path|circle|ellipse|rect|line|polyline|polygon)[\s>]/.test(content))
    throw new Error('SVG has no supported vector shapes. Convert text and strokes to paths first.')
  // A nested SVG preserves the original viewBox and remains self-contained in PNG export.
  const inheritedFill = root.getAttribute('fill') === 'none' ? 'none' : 'currentColor'
  const inheritedStroke =
    root.getAttribute('stroke') && root.getAttribute('stroke') !== 'none' ? 'currentColor' : 'none'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(' ')}" fill="${inheritedFill}" stroke="${inheritedStroke}">${content}</svg>`
}
