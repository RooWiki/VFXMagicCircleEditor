import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from '../constants'
import type { CanvasConfig, ProjectFile, ProjectMeta } from '../types/project'
import type {
  RadialLinesLayer,
  RingLayer,
  Transform,
  ShapeLayer,
  TextLayer,
  SymbolLayer,
  GroupLayer,
  Layer,
} from '../types/layer'
import { generateId } from './id'

const defaultTransform = (): Transform => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
})

export const createRingLayer = (
  overrides: Partial<Omit<RingLayer, 'id' | 'type'>> = {}
): RingLayer => {
  const { transform: transformOverride, ...props } = overrides
  return {
    id: generateId(),
    ...props,
    type: 'ring',
    name: props.name ?? 'Ring',
    visible: props.visible ?? true,
    locked: props.locked ?? false,
    opacity: props.opacity ?? 1,
    radius: props.radius ?? 300,
    strokeWidth: props.strokeWidth ?? 4,
    color: props.color ?? '#ffffff',
    transform: transformOverride !== undefined ? { ...transformOverride } : defaultTransform(),
  }
}

export const createRadialLinesLayer = (
  overrides: Partial<Omit<RadialLinesLayer, 'id' | 'type'>> = {}
): RadialLinesLayer => {
  const { transform: transformOverride, ...props } = overrides
  return {
    id: generateId(),
    ...overrides,
    type: 'radial-lines',
    name: props.name ?? 'Radial Lines',
    visible: props.visible ?? true,
    locked: props.locked ?? false,
    opacity: props.opacity ?? 1,
    count: props.count ?? 8,
    innerRadius: props.innerRadius ?? 200,
    outerRadius: props.outerRadius ?? 350,
    startAngle: props.startAngle ?? 0,
    strokeWidth: props.strokeWidth ?? 2,
    color: props.color ?? '#ffffff',
    transform: transformOverride ?? defaultTransform(),
  }
}

export const createDefaultProject = (): ProjectFile => {
  const now = new Date().toISOString()
  const meta: ProjectMeta = {
    title: 'Untitled',
    created: now,
    modified: now,
  }
  const canvas: CanvasConfig = {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  }
  return {
    __magic_circle__: true,
    version: '1.0.0',
    meta,
    canvas,
    layers: [],
  }
}

const base = (name: string) => ({
  id: generateId(),
  name,
  visible: true,
  locked: false,
  opacity: 1,
  transform: defaultTransform(),
})
export const createShapeLayer = (shape: 'star' | 'polygon' = 'star'): ShapeLayer => ({
  ...base(shape === 'star' ? 'Star' : 'Polygon'),
  type: 'shape',
  shape,
  points: 5,
  radius: 220,
  innerRadius: 100,
  strokeWidth: 4,
  color: '#ffffff',
  fill: 'none',
})
export const createTextLayer = (): TextLayer => ({
  ...base('Circular Text'),
  type: 'circular-text',
  text: 'SOL • LUNA • STELLA • SOL • LUNA • STELLA •',
  radius: 270,
  fontSize: 30,
  fontFamily: 'serif',
  letterSpacing: 2,
  startAngle: 0,
  direction: 'clockwise',
  color: '#ffffff',
  strokeWidth: 0,
})
export const createSymbolLayer = (): SymbolLayer => ({
  ...base('Symbol'),
  type: 'symbol',
  symbol: 'rune',
  radius: 50,
  strokeWidth: 3,
  color: '#ffffff',
  fill: 'none',
})
export const createGroupLayer = (children: Layer[]): GroupLayer => ({
  ...base('Group'),
  type: 'group',
  children,
  repeatCount: 1,
  repeatRadius: 300,
  startAngle: 0,
  orientation: 'upright',
})
