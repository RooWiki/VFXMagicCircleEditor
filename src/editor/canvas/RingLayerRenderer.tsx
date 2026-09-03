import { useEditorStore } from '../../store/editor'
import { computeAnimatedTransform, useAnimationStore } from '../../store/animation'
import type { RingLayer } from '../../types/layer'

interface Props {
  layer: RingLayer
  spaceHeldRef: React.RefObject<boolean>
}

export default function RingLayerRenderer({ layer, spaceHeldRef }: Props) {
  const elapsedMs = useAnimationStore((s) => s.elapsedMs)
  const animConfig = useAnimationStore((s) => s.configs[layer.id])

  if (!layer.visible) return null

  const displayTransform = animConfig
    ? computeAnimatedTransform(layer.transform, animConfig, elapsedMs)
    : layer.transform
  const { x, y, rotation, scaleX, scaleY } = displayTransform
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY})`

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (spaceHeldRef.current) return
    if (layer.locked) return
    const activeTool = useEditorStore.getState().activeTool
    if (activeTool !== 'select') return

    e.stopPropagation()
    useEditorStore.getState().selectLayer(layer.id)
  }

  return (
    <g
      transform={transform}
      opacity={layer.opacity}
      data-testid={`ring-layer-${layer.id}`}
      data-layer-id={layer.id}
      style={{ pointerEvents: layer.visible && !layer.locked ? 'auto' : 'none' }}
      onPointerDown={handlePointerDown}
    >
      <circle
        cx="0"
        cy="0"
        r={layer.radius}
        fill="none"
        stroke={layer.color}
        strokeWidth={layer.strokeWidth}
        style={{ pointerEvents: 'visibleStroke' }}
      />
      {/* Wider transparent hit ring for easier clicking */}
      <circle
        cx="0"
        cy="0"
        r={layer.radius}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(layer.strokeWidth, 12)}
        style={{ pointerEvents: 'visibleStroke' }}
      />
    </g>
  )
}
