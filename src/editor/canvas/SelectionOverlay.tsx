import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editor'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import { useViewportStore } from '../../store/viewport'
import { computeAnimatedTransform, useAnimationStore } from '../../store/animation'
import type { Layer, Transform } from '../../types/layer'
import { screenToWorld } from '../../utils/viewport'
import {
  angleRadians,
  calcMoveTransform,
  calcRotation,
  calcScaleTransform,
  cornerLocalPosition,
  rotateVec,
  type CornerHandle,
} from '../../utils/transform'

function transformsEqual(a: Transform, b: Transform): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.rotation === b.rotation &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY
  )
}

// ─── Layer radius helper ──────────────────────────────────────────────────────

function getLayerRadius(layer: Layer): number {
  if (layer.type === 'ring') return layer.radius
  return layer.outerRadius
}

// ─── Handle geometry constants ────────────────────────────────────────────────

const SCALE_HANDLE_HALF = 5 // half-size of corner square handle in screen px equiv (non-scaling)
const ROTATION_HANDLE_OFFSET = 40 // px above the ring bounding box (non-scaling)
const ROTATION_HANDLE_RADIUS = 5

// ─── Gesture state ────────────────────────────────────────────────────────────

type GestureType = 'move' | 'rotate' | 'scale'

interface GestureState {
  type: GestureType
  pointerId: number
  startWorldX: number
  startWorldY: number
  startTransform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  startAngleRad?: number
  startLocalX?: number
  startLocalY?: number
  cornerHandle?: CornerHandle
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getClientToSvgRect(svgEl: SVGSVGElement): DOMRect {
  return svgEl.getBoundingClientRect()
}

function safeSetPointerCapture(target: EventTarget, pointerId: number) {
  try {
    ;(target as Element).setPointerCapture(pointerId)
  } catch {
    /* not supported in test environment */
  }
}

function safeReleasePointerCapture(target: EventTarget | null, pointerId: number) {
  if (!target) return
  try {
    ;(target as Element).releasePointerCapture(pointerId)
  } catch {
    /* not supported in test environment */
  }
}

function clientToWorld(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  const { centerX, centerY, zoom, viewportWidth, viewportHeight } = useViewportStore.getState()
  return screenToWorld(
    clientX - rect.left,
    clientY - rect.top,
    centerX,
    centerY,
    zoom,
    viewportWidth,
    viewportHeight
  )
}

// ─── SelectionOverlay ─────────────────────────────────────────────────────────

interface OverlayProps {
  layer: Layer
  svgRef: React.RefObject<SVGSVGElement | null>
  spaceHeldRef: React.RefObject<boolean>
}

export default function SelectionOverlay({ layer, svgRef, spaceHeldRef }: OverlayProps) {
  const updateLayerTransform = useProjectStore((s) => s.updateLayerTransform)
  const gestureRef = useRef<GestureState | null>(null)
  const shiftHeldRef = useRef(false)

  // Track Shift key
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeldRef.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeldRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const endGesture = useCallback((target: EventTarget | null) => {
    const g = gestureRef.current
    if (!g) return
    safeReleasePointerCapture(target, g.pointerId)
    gestureRef.current = null
  }, [])

  // ── pointerdown on the ring body (move gesture) ───────────────────────────
  const handleRingPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (spaceHeldRef.current) return
      if (layer.locked) return

      const activeTool = useEditorStore.getState().activeTool
      if (activeTool !== 'select') return

      e.stopPropagation()
      e.preventDefault()

      const svg = svgRef.current
      if (!svg) return
      const rect = getClientToSvgRect(svg)
      const world = clientToWorld(e.clientX, e.clientY, rect)

      safeSetPointerCapture(e.currentTarget, e.pointerId)
      gestureRef.current = {
        type: 'move',
        pointerId: e.pointerId,
        startWorldX: world.x,
        startWorldY: world.y,
        startTransform: { ...layer.transform },
      }
    },
    [layer, svgRef, spaceHeldRef]
  )

  // ── pointerdown on the rotation handle ───────────────────────────────────
  const handleRotationPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (spaceHeldRef.current) return
      if (layer.locked) return

      e.stopPropagation()
      e.preventDefault()

      const svg = svgRef.current
      if (!svg) return
      const rect = getClientToSvgRect(svg)
      const world = clientToWorld(e.clientX, e.clientY, rect)
      const pivot = { x: layer.transform.x, y: layer.transform.y }
      const startAngle = angleRadians(world.x, world.y, pivot.x, pivot.y)

      safeSetPointerCapture(e.currentTarget, e.pointerId)
      gestureRef.current = {
        type: 'rotate',
        pointerId: e.pointerId,
        startWorldX: world.x,
        startWorldY: world.y,
        startTransform: { ...layer.transform },
        startAngleRad: startAngle,
      }
    },
    [layer, svgRef, spaceHeldRef]
  )

  // ── pointerdown on a corner scale handle ──────────────────────────────────
  const handleScalePointerDown = useCallback(
    (corner: CornerHandle) => (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (spaceHeldRef.current) return
      if (layer.locked) return

      e.stopPropagation()
      e.preventDefault()

      const svg = svgRef.current
      if (!svg) return
      const rect = getClientToSvgRect(svg)
      const world = clientToWorld(e.clientX, e.clientY, rect)

      // Compute startLocal: pointer position converted to layer-local (pre-scale) space
      const worldRelX = world.x - layer.transform.x
      const worldRelY = world.y - layer.transform.y
      const startLocal = rotateVec(worldRelX, worldRelY, layer.transform.rotation)

      safeSetPointerCapture(e.currentTarget, e.pointerId)
      gestureRef.current = {
        type: 'scale',
        pointerId: e.pointerId,
        startWorldX: world.x,
        startWorldY: world.y,
        startTransform: { ...layer.transform },
        startLocalX: startLocal.x,
        startLocalY: startLocal.y,
        cornerHandle: corner,
      }
    },
    [layer, svgRef, spaceHeldRef]
  )

  // ── pointermove ───────────────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current
      if (!g || g.pointerId !== e.pointerId) return

      const svg = svgRef.current
      if (!svg) return
      const rect = getClientToSvgRect(svg)
      const world = clientToWorld(e.clientX, e.clientY, rect)

      if (g.type === 'move') {
        const { x, y } = calcMoveTransform(
          g.startTransform.x,
          g.startTransform.y,
          g.startWorldX,
          g.startWorldY,
          world.x,
          world.y
        )
        updateLayerTransform(layer.id, { x, y })
      } else if (g.type === 'rotate') {
        const pivot = { x: g.startTransform.x, y: g.startTransform.y }
        const currentAngle = angleRadians(world.x, world.y, pivot.x, pivot.y)
        const rotation = calcRotation(g.startAngleRad!, currentAngle, g.startTransform.rotation)
        updateLayerTransform(layer.id, { rotation })
      } else if (g.type === 'scale') {
        const { scaleX, scaleY } = calcScaleTransform(
          g.startTransform.x,
          g.startTransform.y,
          g.startTransform.rotation,
          g.startTransform.scaleX,
          g.startTransform.scaleY,
          g.startLocalX!,
          g.startLocalY!,
          world.x,
          world.y,
          shiftHeldRef.current
        )
        updateLayerTransform(layer.id, { scaleX, scaleY })
      }
    },
    [layer.id, svgRef, updateLayerTransform]
  )

  // ── pointerup / cancel ────────────────────────────────────────────────────
  const commitGestureHistory = useCallback(
    (g: GestureState) => {
      const currentLayer = useProjectStore.getState().project.layers.find((l) => l.id === layer.id)
      if (currentLayer && !transformsEqual(currentLayer.transform, g.startTransform)) {
        useHistoryStore.getState().pushSnapshot(useProjectStore.getState().project)
      }
    },
    [layer.id]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current
      if (g?.pointerId === e.pointerId) {
        commitGestureHistory(g)
        endGesture(e.nativeEvent.currentTarget)
      }
    },
    [endGesture, commitGestureHistory]
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current
      if (g?.pointerId === e.pointerId) {
        commitGestureHistory(g)
        endGesture(e.nativeEvent.currentTarget)
      }
    },
    [endGesture, commitGestureHistory]
  )

  // ── Computed geometry ─────────────────────────────────────────────────────
  const elapsedMs = useAnimationStore((s) => s.elapsedMs)
  const animConfig = useAnimationStore((s) => s.configs[layer.id])
  const displayTransform = animConfig
    ? computeAnimatedTransform(layer.transform, animConfig, elapsedMs)
    : layer.transform
  const { x, y, rotation, scaleX, scaleY } = displayTransform
  const r = getLayerRadius(layer)
  const hw = r * Math.abs(scaleX) // scaled half-width in world units
  const hh = r * Math.abs(scaleY) // scaled half-height in world units
  const artworkTransform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY})`
  const uiTransform = `translate(${x}, ${y}) rotate(${rotation})`
  const rotHandleY = -hh - ROTATION_HANDLE_OFFSET

  const corners: CornerHandle[] = ['nw', 'ne', 'sw', 'se']
  const isLocked = layer.locked

  return (
    <g data-testid="selection-overlay" data-layer-id={layer.id} style={{ pointerEvents: 'none' }}>
      {/* Artwork group: full transform with scale — circle/rect become correct ellipse/box */}
      <g transform={artworkTransform}>
        {/* Selection circle indicator */}
        <circle
          cx={0}
          cy={0}
          r={r}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1"
          strokeDasharray="6 3"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
          data-testid="selection-indicator"
        />

        {/* Bounding box corner dashes */}
        <rect
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="0.5"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
          opacity={0.4}
        />

        {/* Move target: transparent hit area for dragging */}
        {!isLocked && (
          <circle
            cx={0}
            cy={0}
            r={r}
            fill="transparent"
            stroke="transparent"
            strokeWidth={Math.max(layer.strokeWidth, 12)}
            style={{ pointerEvents: 'visibleStroke', cursor: 'move' }}
            onPointerDown={handleRingPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            data-testid="move-target"
          />
        )}
      </g>

      {/* UI group: translate + rotate only — handles stay square regardless of scale */}
      {!isLocked ? (
        <g transform={uiTransform}>
          {/* Line from top of scaled ring to rotation handle */}
          <line
            x1={0}
            y1={-hh}
            x2={0}
            y2={rotHandleY}
            stroke="#a78bfa"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
            opacity={0.6}
          />

          {/* Rotation handle hit target */}
          <circle
            cx={0}
            cy={rotHandleY}
            r={ROTATION_HANDLE_RADIUS * 2}
            fill="transparent"
            style={{ pointerEvents: 'all', cursor: 'crosshair' }}
            onPointerDown={handleRotationPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />

          {/* Rotation handle visual */}
          <circle
            cx={0}
            cy={rotHandleY}
            r={ROTATION_HANDLE_RADIUS}
            fill="#1e1e2e"
            stroke="#a78bfa"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
            data-testid="rotation-handle"
          />

          {/* Corner scale handles — positioned at scaled bounding box corners */}
          {corners.map((corner) => {
            const { x: lx, y: ly } = cornerLocalPosition(1, corner)
            const cx = lx * hw
            const cy = ly * hh
            return (
              <g key={corner}>
                {/* Hit target */}
                <rect
                  x={cx - SCALE_HANDLE_HALF * 2}
                  y={cy - SCALE_HANDLE_HALF * 2}
                  width={SCALE_HANDLE_HALF * 4}
                  height={SCALE_HANDLE_HALF * 4}
                  fill="transparent"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'all', cursor: 'nwse-resize' }}
                  onPointerDown={handleScalePointerDown(corner)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  data-testid={`scale-handle-${corner}`}
                />
                {/* Visual */}
                <rect
                  x={cx - SCALE_HANDLE_HALF}
                  y={cy - SCALE_HANDLE_HALF}
                  width={SCALE_HANDLE_HALF * 2}
                  height={SCALE_HANDLE_HALF * 2}
                  fill="#1e1e2e"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}
        </g>
      ) : (
        <g transform={uiTransform}>
          {/* Locked indicator */}
          <text
            x={0}
            y={-hh - 12}
            textAnchor="middle"
            fontSize={10}
            fill="#a78bfa"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
            opacity={0.7}
            data-testid="locked-indicator"
          >
            locked
          </text>
        </g>
      )}
    </g>
  )
}
