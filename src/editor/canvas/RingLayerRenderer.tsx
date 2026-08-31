import type { RingLayer } from '../../types/layer'

interface Props {
  layer: RingLayer
}

export default function RingLayerRenderer({ layer }: Props) {
  if (!layer.visible) return null

  const { x, y, rotation, scaleX, scaleY } = layer.transform
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY})`

  return (
    <g
      transform={transform}
      opacity={layer.opacity}
      data-testid={`ring-layer-${layer.id}`}
      data-layer-id={layer.id}
      style={{ pointerEvents: 'none' }}
    >
      <circle
        cx="0"
        cy="0"
        r={layer.radius}
        fill="none"
        stroke={layer.color}
        strokeWidth={layer.strokeWidth}
      />
    </g>
  )
}
