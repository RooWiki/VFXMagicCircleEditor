import { memo } from 'react'
import { useEditorStore } from '../../store/editor'
import type { RadialLinesLayer } from '../../types/layer'
import { computeRadialLines } from '../../utils/geometry'
import { useArtworkMoveGesture } from './useArtworkMoveGesture'

interface Props {
  layer: RadialLinesLayer
  spaceHeldRef: React.RefObject<boolean>
  svgRef: React.RefObject<SVGSVGElement | null>
}

function RadialLinesLayerRenderer({ layer, spaceHeldRef, svgRef }: Props) {
  const { startGesture, onPointerMove, onPointerUp, onPointerCancel } = useArtworkMoveGesture(
    layer.id,
    () => layer.transform,
    svgRef
  )

  if (!layer.visible) return null

  const { x, y, rotation, scaleX, scaleY } = layer.transform
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY})`

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (spaceHeldRef.current) return
    if (layer.locked) return
    const activeTool = useEditorStore.getState().activeTool
    if (activeTool !== 'select') return

    e.stopPropagation()
    e.preventDefault()
    useEditorStore.getState().selectLayer(layer.id)
    startGesture(e)
  }

  const segments = computeRadialLines(layer)

  return (
    <g
      transform={transform}
      opacity={layer.opacity}
      data-testid={`radial-lines-layer-${layer.id}`}
      data-layer-id={layer.id}
      style={{ pointerEvents: layer.visible && !layer.locked ? 'auto' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {segments.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={layer.color}
          strokeWidth={layer.strokeWidth}
          strokeLinecap="round"
        />
      ))}
      {/* Per-line transparent wider strokes — hit area aligned with actual geometry */}
      {segments.map((seg, i) => (
        <line
          key={`hit-${i}`}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke="transparent"
          strokeWidth={Math.max(layer.strokeWidth, 12)}
          strokeLinecap="round"
          style={{ pointerEvents: 'visibleStroke' }}
        />
      ))}
    </g>
  )
}

export default memo(RadialLinesLayerRenderer)
