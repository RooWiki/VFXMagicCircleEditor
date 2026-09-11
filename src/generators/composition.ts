import type { GroupLayer, Layer, ShapeLayer, SymbolLayer, TextLayer } from '../types/layer'
import type { GeneratorParams } from './generator'
import { prngUuid, seededRng } from './prng'

/** Compose ornaments in separate radial zones so lettering and geometry stay legible. */
export function addMagicComposition(layers: Layer[], params: GeneratorParams, seed: string): void {
  if (!layers.length) return
  const rng = seededRng(`${seed}:composition`)
  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)]
  const style = params.designStyle
  const symmetry = Math.max(3, Math.min(24, Math.round(params.symmetry ?? 8)))
  const detail = params.complexity === 'high' ? 3 : params.complexity === 'medium' ? 2 : 1
  const palette = params.colorPalette.length ? params.colorPalette : ['#ffffff']
  const main = palette[0]
  const accent = palette[1] ?? main
  const fine = palette[2] ?? accent
  const rings = layers.filter((layer) => layer.type === 'ring')
  const radius = Math.max(180, ...rings.map((ring) => ring.radius))
  const weight = Math.max(0.6, Math.min(4, (params.ringThicknessMin + params.ringThicknessMax) / 4))
  const base = (name: string) => ({
    id: prngUuid(rng),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
  })
  const ring = (r: number, color = main, thickness = weight): Layer => ({
    ...base('Emblem border'),
    type: 'ring',
    radius: r,
    strokeWidth: thickness,
    color,
  })
  const symbol = (r: number, motif: SymbolLayer['symbol'], color = accent): SymbolLayer => ({
    ...base(`${motif[0].toUpperCase()}${motif.slice(1)} sigil`),
    type: 'symbol',
    symbol: motif,
    radius: r,
    color,
    strokeWidth: weight,
    fill: 'none',
  })

  // Keep ring/line count controls literal; the additional elements are separate editable layers.
  rings.forEach((item, i) => {
    const fraction =
      rings.length === 1
        ? 1
        : i === 0
          ? 0.22
          : i === rings.length - 1
            ? 1
            : i === rings.length - 2
              ? 0.94
              : 0.48 + (i / Math.max(1, rings.length - 3)) * 0.24
    item.radius = radius * fraction
    item.color = i === rings.length - 1 ? main : fine
    item.opacity = params.complexity === 'low' ? 1 : 0.9
    item.strokeWidth = Math.min(weight * (i === rings.length - 1 ? 1.6 : 0.7), radius * 0.012)
    item.style =
      style === 'mechanical' && i === rings.length - 1
        ? 'divided'
        : style === 'celestial' && i > 0 && i < rings.length - 1
          ? 'arc'
          : 'concentric'
    item.ringCount = i === 0 ? 2 : 2 + (detail === 3 ? 1 : 0)
    item.spacing = Math.min(radius * 0.016, (radius * 0.08) / Math.max(1, rings.length))
    item.bandWidth = radius * 0.035
    item.divisions = symmetry * (detail + 2)
    item.dividerWidth = weight * 0.5
  })
  layers
    .filter((layer) => layer.type === 'radial-lines')
    .forEach((item, i) => {
      const orbit = radius * (i % 2 ? 0.69 : 0.965)
      item.outerRadius = orbit
      item.innerRadius = orbit - radius * (style === 'mechanical' ? 0.045 : 0.025)
      item.twistAngle = 0
      item.sweepAngle = 360
      item.color = fine
      item.strokeWidth = weight * 0.65
      item.majorEvery = 4
      item.minorLength = 0.45
    })

  const star: ShapeLayer = {
    ...base(style === 'mechanical' ? 'Geometric core' : 'Binding star'),
    type: 'shape',
    shape: style === 'mechanical' ? 'polygon' : 'star',
    starMode: style === 'arcane' ? 'interlaced' : 'outline',
    skip: symmetry > 6 ? pick([2, 3]) : 2,
    points: symmetry,
    radius: radius * 0.63,
    innerRadius: radius * (0.3 + rng() * 0.12),
    color: main,
    strokeWidth: weight,
    fill: 'none',
  }
  star.transform.rotation = pick([0, 180 / symmetry])
  layers.push(star)
  if (detail > 1) {
    const inner: ShapeLayer = {
      ...star,
      ...base('Inner geometry'),
      radius: radius * 0.49,
      innerRadius: radius * 0.26,
      strokeWidth: weight * 0.55,
      color: fine,
    }
    inner.transform.rotation = star.transform.rotation + 180 / symmetry
    layers.push(inner)
  }

  const coreMotif =
    style === 'celestial'
      ? pick<SymbolLayer['symbol']>(['moon', 'sun', 'eclipse', 'spiral', 'infinity', 'eye'])
      : style === 'mechanical'
        ? pick<SymbolLayer['symbol']>(['diamond', 'crystal', 'hourglass', 'hexagram', 'lightning'])
        : pick<SymbolLayer['symbol']>(['rune', 'sun', 'cross', 'pentagram', 'eye', 'spiral', 'trident', 'infinity', 'hexagram'])
  layers.push(symbol(radius * 0.135, coreMotif))

  if (params.inscriptions !== false && detail > 1) {
    const words =
      style === 'celestial'
        ? ['LUNA', 'SOL', 'ASTRA', 'ORION', 'NOVA', 'AETHER']
        : style === 'mechanical'
          ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
          : ['ARCANUM', 'LUX', 'UMBRA', 'IGNIS', 'ANIMA', 'AETHER', 'SIGILLUM', 'ORBIS']
    const verse = Array.from({ length: symmetry }, () => pick(words)).join(' • ') + ' • '
    const phrase = verse.repeat(Math.max(1, Math.ceil(180 / verse.length)))
    const text: TextLayer = {
      ...base('Outer inscription'),
      type: 'circular-text',
      text: phrase,
      fitToCircle: true,
      radius: radius * 0.835,
      fontSize: radius * 0.042,
      fontFamily: style === 'mechanical' ? 'monospace' : 'serif',
      letterSpacing: 1,
      startAngle: 180 / symmetry,
      direction: 'clockwise',
      color: accent,
      strokeWidth: 0,
    }
    layers.push(text)
  }

  if (params.emblems !== false) {
    const count = Math.min(12, symmetry)
    const emblemRadius = Math.min(radius * 0.095, radius * Math.sin(Math.PI / count) * 0.35)
    const motif =
      style === 'celestial'
        ? pick<SymbolLayer['symbol']>(['moon', 'diamond', 'crystal', 'eye', 'infinity', 'eclipse'])
        : style === 'mechanical'
          ? pick<SymbolLayer['symbol']>(['diamond', 'crystal', 'hexagram', 'lightning', 'hourglass'])
          : pick<SymbolLayer['symbol']>(['rune', 'cross', 'diamond', 'pentagram', 'eye', 'fire', 'water', 'air', 'earth', 'trident'])
    const children: Layer[] = [
      { ...ring(emblemRadius), knockout: true },
      symbol(emblemRadius * 0.57, motif),
    ]
    if (detail > 1) children.splice(1, 0, ring(emblemRadius * 0.78, fine, weight * 0.55))
    const group: GroupLayer = {
      ...base('Orbit emblems'),
      type: 'group',
      children,
      repeatCount: count,
      repeatRadius: radius,
      startAngle: pick([0, 180 / count]),
      orientation: style === 'celestial' ? 'upright' : 'radial',
    }
    layers.push(group)
  }
  if (detail === 3) {
    const group: GroupLayer = {
      ...base('Inner satellites'),
      type: 'group',
      children: [
        symbol(
          radius * 0.035,
          style === 'celestial'
            ? pick<SymbolLayer['symbol']>(['sun', 'moon', 'spiral', 'eclipse'])
            : style === 'mechanical'
              ? pick<SymbolLayer['symbol']>(['diamond', 'crystal', 'hexagram'])
              : pick<SymbolLayer['symbol']>(['diamond', 'rune', 'eye', 'cross', 'fire', 'water', 'air', 'earth']),
          fine
        ),
      ],
      repeatCount: symmetry,
      repeatRadius: radius * 0.68,
      startAngle: 180 / symmetry,
      orientation: 'radial',
    }
    layers.push(group)
  }
}
