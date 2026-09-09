export interface Transform {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export interface LayerFinish {
  fill?: string
  knockout?: boolean
  outlineWidth?: number
  outlineColor?: string
  glowBlur?: number
  glowColor?: string
  shadowBlur?: number
  shadowColor?: string
  shadowX?: number
  shadowY?: number
}

export interface BaseLayer extends LayerFinish {
  id: string
  type: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  transform: Transform
}

export interface RingDecoration {
  style?: 'simple' | 'concentric' | 'divided' | 'arc'
  ringCount?: number
  spacing?: number
  bandWidth?: number
  divisions?: number
  dividerWidth?: number
  startAngle?: number
  sweepAngle?: number
}

export interface RingLayer extends BaseLayer, RingDecoration {
  type: 'ring'
  radius: number
  strokeWidth: number
  color: string
}

export interface RadialPattern {
  sweepAngle?: number
  twistAngle?: number
  majorEvery?: number
  minorLength?: number
  lineCap?: 'round' | 'butt' | 'square'
}

export interface RadialLinesLayer extends BaseLayer, RadialPattern {
  type: 'radial-lines'
  count: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  strokeWidth: number
  color: string
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape'
  shape: 'star' | 'polygon'
  starMode?: 'outline' | 'interlaced'
  skip?: number
  points: number
  radius: number
  innerRadius: number
  strokeWidth: number
  color: string
}

export interface TextLayer extends BaseLayer {
  type: 'circular-text'
  text: string
  fitToCircle?: boolean
  radius: number
  fontSize: number
  fontFamily: 'serif' | 'sans-serif' | 'monospace'
  letterSpacing: number
  startAngle: number
  direction: 'clockwise' | 'counterclockwise'
  color: string
  strokeWidth: number
}

export interface SymbolLayer extends BaseLayer {
  type: 'symbol'
  symbol: 'sun' | 'moon' | 'cross' | 'rune' | 'diamond' | 'custom'
  customSvg?: string
  radius: number
  strokeWidth: number
  color: string
}

export interface GroupLayer extends BaseLayer {
  type: 'group'
  children: Layer[]
  repeatCount: number
  repeatRadius: number
  startAngle: number
  orientation: 'upright' | 'radial' | 'tangent'
}

export type Layer = RingLayer | RadialLinesLayer | ShapeLayer | TextLayer | SymbolLayer | GroupLayer
