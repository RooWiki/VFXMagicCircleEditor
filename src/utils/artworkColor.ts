import type { Layer } from '../types/layer'

export function recolorArtwork(layers: Layer[], color: string, grayscale = false): Layer[] {
  const convert = (value: string) => {
    if (!grayscale) return color
    const hex = value.slice(1)
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
    const gray = Math.round(rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722)
      .toString(16)
      .padStart(2, '0')
    return `#${gray}${gray}${gray}`
  }
  return mapArtworkColors(layers, convert)
}

export function mapArtworkColors(layers: Layer[], convert: (color: string) => string): Layer[] {
  return layers.map((layer) => {
    if (layer.locked) return layer
    const result = { ...layer }
    if ('color' in result) result.color = convert(result.color)
    if (result.fill && result.fill !== 'none') result.fill = convert(result.fill)
    // Resolve renderer defaults too, so enabled effects cannot retain a colored fringe.
    if (result.outlineWidth) result.outlineColor = convert(result.outlineColor ?? '#660000')
    if (result.glowBlur) result.glowColor = convert(result.glowColor ?? '#ff4444')
    if (result.shadowBlur || result.shadowX || result.shadowY)
      result.shadowColor = convert(result.shadowColor ?? '#000000')
    if (result.type === 'group') result.children = mapArtworkColors(result.children, convert)
    return result
  })
}

/** HSL adjustments preserve relative palette differences instead of replacing every color. */
export function adjustColor(
  value: string,
  hue: number,
  saturation: number,
  lightness: number
): string {
  const match = /^#([a-f0-9]{3}|[a-f0-9]{6})$/i.exec(value)
  if (!match || (!hue && !saturation && !lightness)) return value
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min
  let l = (max + min) / 2
  let h =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4
  let s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  h = (((h * 60 + hue) % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s * (1 + saturation / 100)))
  l = Math.max(0, Math.min(1, l + lightness / 100))
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2
  const rgb =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}
