import type { Layer, RadialLinesLayer, RingLayer } from '../types/layer'

export const isRingLayer = (layer: Layer): layer is RingLayer => layer.type === 'ring'

export const isRadialLinesLayer = (layer: Layer): layer is RadialLinesLayer =>
  layer.type === 'radial-lines'

export const getLayerById = (layers: Layer[], id: string): Layer | undefined =>
  layers.find((l) => l.id === id)
