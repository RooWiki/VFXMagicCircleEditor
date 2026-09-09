import { useNavigationPreview } from './useNavigationPreview'
import { memo, useMemo } from 'react'
import type { Layer } from '../../types/layer'
import { buildLayerContent, layerTransform } from '../../utils/artwork'
import { useEditorStore } from '../../store/editor'
import { computeAnimatedTransform, useAnimationStore } from '../../store/animation'
import { useArtworkMoveGesture } from './useArtworkMoveGesture'

function ExtendedLayerRenderer({
  layer,
  spaceHeldRef,
  svgRef,
  navigating = false,
}: {
  layer: Layer
  navigating?: boolean
  spaceHeldRef: React.RefObject<boolean>
  svgRef: React.RefObject<SVGSVGElement | null>
}) {
  const elapsedMs = useAnimationStore((s) => s.elapsedMs)
  const config = useAnimationStore((s) => s.configs[layer.id])
  const gesture = useArtworkMoveGesture(layer.id, () => layer.transform, svgRef)
  const content = useMemo(
    () => ({ __html: buildLayerContent(layer, `canvas-${layer.id}`) }),
    [layer]
  )
  const preview = useNavigationPreview(layer, content.__html)
  const displayed = useMemo(
    () =>
      navigating && preview
        ? {
            __html: `<image data-navigation-preview="true" href="${preview.url}" x="${-preview.extent}" y="${-preview.extent}" width="${preview.extent * 2}" height="${preview.extent * 2}" />`,
          }
        : content,
    [navigating, preview, content]
  )
  if (!layer.visible) return null
  const animated = config
    ? { ...layer, transform: computeAnimatedTransform(layer.transform, config, elapsedMs) }
    : layer
  return (
    <g
      data-testid={`${layer.type}-layer-${layer.id}`}
      data-layer-id={layer.id}
      data-preview-ready={preview ? 'true' : undefined}
      transform={layerTransform(animated)}
      opacity={layer.opacity}
      style={{ pointerEvents: layer.locked ? 'none' : 'visiblePainted' }}
      onPointerDown={(event) => {
        if (
          event.button !== 0 ||
          spaceHeldRef.current ||
          layer.locked ||
          useEditorStore.getState().activeTool !== 'select'
        )
          return
        event.stopPropagation()
        event.preventDefault()
        if (event.shiftKey) useEditorStore.getState().addToSelection(layer.id)
        else useEditorStore.getState().selectLayer(layer.id)
        gesture.startGesture(event)
      }}
      onPointerMove={gesture.onPointerMove}
      onPointerUp={gesture.onPointerUp}
      onPointerCancel={gesture.onPointerCancel}
      dangerouslySetInnerHTML={displayed}
    />
  )
}

export default memo(ExtendedLayerRenderer)
