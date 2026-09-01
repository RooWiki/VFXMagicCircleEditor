import { useCallback, useRef } from 'react'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import { useViewportStore } from '../../store/viewport'
import type { Transform } from '../../types/layer'
import { calcMoveTransform } from '../../utils/transform'
import { screenToWorld } from '../../utils/viewport'

interface MoveGestureState {
  pointerId: number
  startWorldX: number
  startWorldY: number
  startTransform: Transform
}

function transformsEqual(a: Transform, b: Transform): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.rotation === b.rotation &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY
  )
}

/**
 * Move-only gesture hook for artwork layer renderers.
 *
 * Call startGesture() from the renderer's pointerdown handler after all guards
 * (button, locked, tool, space) have been checked and selectLayer has been called.
 * Spread onPointerMove / onPointerUp / onPointerCancel onto the same <g> element.
 *
 * History contract matches SelectionOverlay:
 *   - Exactly one snapshot on pointerup/cancel if the transform changed.
 *   - Zero snapshots on zero-distance drags.
 */
export function useArtworkMoveGesture(
  layerId: string,
  getTransform: () => Transform,
  svgRef: React.RefObject<SVGSVGElement | null>
) {
  const gestureRef = useRef<MoveGestureState | null>(null)
  const updateLayerTransform = useProjectStore((s) => s.updateLayerTransform)

  const getWorldPos = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      const { centerX, centerY, zoom, viewportWidth, viewportHeight } = useViewportStore.getState()
      if (viewportWidth <= 0 || viewportHeight <= 0 || zoom <= 0) return null
      return screenToWorld(
        clientX - rect.left,
        clientY - rect.top,
        centerX,
        centerY,
        zoom,
        viewportWidth,
        viewportHeight
      )
    },
    [svgRef]
  )

  const startGesture = useCallback(
    (e: React.PointerEvent) => {
      const world = getWorldPos(e.clientX, e.clientY)
      if (!world) return
      try {
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      } catch {
        /* jsdom */
      }
      gestureRef.current = {
        pointerId: e.pointerId,
        startWorldX: world.x,
        startWorldY: world.y,
        startTransform: { ...getTransform() },
      }
    },
    [getWorldPos, getTransform]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current
      if (!g || g.pointerId !== e.pointerId) return
      const world = getWorldPos(e.clientX, e.clientY)
      if (!world) return
      const { x, y } = calcMoveTransform(
        g.startTransform.x,
        g.startTransform.y,
        g.startWorldX,
        g.startWorldY,
        world.x,
        world.y
      )
      updateLayerTransform(layerId, { x, y })
    },
    [getWorldPos, layerId, updateLayerTransform]
  )

  const endGesture = useCallback(
    (target: EventTarget | null, pointerId: number) => {
      const g = gestureRef.current
      if (!g || g.pointerId !== pointerId) return
      const project = useProjectStore.getState().project
      const current = project.layers.find((l) => l.id === layerId)
      if (current && !transformsEqual(current.transform, g.startTransform)) {
        useHistoryStore.getState().pushSnapshot(project)
      }
      try {
        ;(target as Element)?.releasePointerCapture(pointerId)
      } catch {
        /* jsdom */
      }
      gestureRef.current = null
    },
    [layerId]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      endGesture(e.nativeEvent.currentTarget, e.pointerId)
    },
    [endGesture]
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      endGesture(e.nativeEvent.currentTarget, e.pointerId)
    },
    [endGesture]
  )

  return { startGesture, onPointerMove, onPointerUp, onPointerCancel }
}
