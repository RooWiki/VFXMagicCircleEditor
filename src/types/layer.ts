export interface Transform {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export interface BaseLayer {
  id: string
  type: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  transform: Transform
}

export interface RingLayer extends BaseLayer {
  type: 'ring'
  radius: number
  strokeWidth: number
  color: string
}

export interface RadialLinesLayer extends BaseLayer {
  type: 'radial-lines'
  count: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  strokeWidth: number
  color: string
}

export type Layer = RingLayer | RadialLinesLayer
