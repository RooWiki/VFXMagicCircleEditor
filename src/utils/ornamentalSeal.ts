import type { GroupLayer, Layer } from '../types/layer'
import {
  createGroupLayer,
  createRingLayer,
  createShapeLayer,
  createSymbolLayer,
  createTextLayer,
} from './factories'

/** Editable example showing the full ornament workflow without importing flattened artwork. */
export function createOrnamentalSeal(): GroupLayer {
  const color = '#a51e2b'
  const ring = (radius: number, thickness = 3) =>
    createRingLayer({ radius, strokeWidth: thickness, color })
  const text = (radius: number, size: number, content: string) => ({
    ...createTextLayer(),
    radius,
    fontSize: size,
    text: content,
    color,
    letterSpacing: 1.5,
    fitToCircle: true,
  })
  const emblem = createGroupLayer([
    { ...ring(49, 3), knockout: true },
    ring(42, 1.5),
    ring(34, 2),
    { ...createSymbolLayer(), symbol: 'rune', radius: 23, color, strokeWidth: 2 } as Layer,
    { ...ring(6, 1.5), transform: { x: 0, y: -49, rotation: 0, scaleX: 1, scaleY: 1 } },
  ])
  emblem.name = 'Five medallions'
  emblem.repeatCount = 5
  emblem.repeatRadius = 350
  const layers: Layer[] = [
    ring(350, 5),
    ring(314, 2),
    ring(280, 2),
    {
      ...createShapeLayer('polygon'),
      name: 'Outer pentagon',
      points: 5,
      radius: 300,
      innerRadius: 100,
      color,
      strokeWidth: 3,
    },
    {
      ...createShapeLayer(),
      name: 'Inner star',
      starMode: 'interlaced',
      skip: 2,
      points: 7,
      radius: 230,
      innerRadius: 100,
      color,
      strokeWidth: 3,
    },
    ring(245, 3),
    ring(204, 3),
    text(293, 20, 'SOL • LUNA • STELLA • AETHER • SOL • LUNA • STELLA • AETHER •'),
    text(216, 17, 'LUX ET UMBRA • ORBIS ARCANA • LUX ET UMBRA • ORBIS ARCANA •'),
    { ...ring(80, 3), knockout: true },
    ring(67, 2),
    {
      ...createSymbolLayer(),
      symbol: 'sun',
      name: 'Center sun',
      radius: 44,
      color,
      strokeWidth: 2,
    },
    emblem,
  ]
  const group = createGroupLayer(layers)
  group.name = 'Ornamental Seal'
  group.outlineWidth = 0.8
  group.outlineColor = '#540511'
  group.shadowBlur = 3
  group.shadowY = 3
  group.shadowColor = '#25060b'
  return group
}
