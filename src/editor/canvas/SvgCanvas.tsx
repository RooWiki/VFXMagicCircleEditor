import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { VIEWPORT_WHEEL_SENSITIVITY } from '../../constants'
import { useEditorStore, type ActiveTool, type PreviewBackground } from '../../store/editor'
import { useProjectStore } from '../../store/project'
import { useViewportStore } from '../../store/viewport'
import { calcViewBox, formatZoomPercent } from '../../utils/viewport'

// ─── helpers ─────────────────────────────────────────────────────────────────

function isEditableElement(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  )
}

function cursorForState(activeTool: ActiveTool, isPanning: boolean, isSpaceHeld: boolean): string {
  if (isPanning) return 'grabbing'
  if (activeTool === 'hand' || isSpaceHeld) return 'grab'
  return 'default'
}

// ─── background helpers ───────────────────────────────────────────────────────

function artboardFill(bg: PreviewBackground, checkerId: string): string {
  if (bg === 'transparent') return `url(#${checkerId})`
  if (bg === 'light') return '#e8e8e8'
  return '#1a1a1e'
}

function gridMinorStroke(bg: PreviewBackground): string {
  return bg === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
}

function gridMajorStroke(bg: PreviewBackground): string {
  return bg === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
}

function guideStroke(bg: PreviewBackground): string {
  return bg === 'light' ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.7)'
}

function artboardBorderStroke(bg: PreviewBackground): string {
  return bg === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)'
}

// ─── component ───────────────────────────────────────────────────────────────

interface PanState {
  lastX: number
  lastY: number
  pointerId: number
}

export default function SvgCanvas() {
  const uid = useId()
  const clipId = `${uid}-clip`
  const checkerId = `${uid}-checker`
  const gridMinorId = `${uid}-grid-minor`
  const gridMajorId = `${uid}-grid-major`

  // Store subscriptions
  const { centerX, centerY, zoom, pan, zoomAtPoint, fitView, setViewportSize } = useViewportStore()
  const { activeTool, gridVisible, guidesVisible, previewBackground } = useEditorStore()
  const canvas = useProjectStore((s) => s.project.canvas)
  const layerCount = useProjectStore((s) => s.project.layers.length)

  // DOM refs
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Pan interaction (refs avoid re-renders on every pointer move)
  const panStateRef = useRef<PanState | null>(null)
  const spaceHeldRef = useRef(false)

  // React-managed state for cursor-relevant flags
  const [isPanning, setIsPanning] = useState(false)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const hasInitialFitRef = useRef(false)

  // Derived SVG values
  const cw = canvas.width
  const ch = canvas.height
  const ax = -cw / 2
  const ay = -ch / 2

  // ── ResizeObserver ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        setViewportSize(width, height)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [setViewportSize])

  // ── Initial fit-to-view once we have real dimensions ────────────────────────
  useEffect(() => {
    if (hasInitialFitRef.current) return
    const { viewportWidth, viewportHeight } = useViewportStore.getState()
    if (viewportWidth > 0 && viewportHeight > 0) {
      hasInitialFitRef.current = true
      fitView(cw, ch)
    }
  })

  // ── Wheel zoom (native listener — must not be passive) ──────────────────────
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const { zoom: currentZoom } = useViewportStore.getState()
      const factor = Math.exp(-e.deltaY * VIEWPORT_WHEEL_SENSITIVITY)
      zoomAtPoint(currentZoom * factor, screenX, screenY)
    }

    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [zoomAtPoint])

  // ── Space key (document-level, skip editable elements) ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (isEditableElement(document.activeElement)) return
      spaceHeldRef.current = true
      setIsSpaceHeld(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      spaceHeldRef.current = false
      setIsSpaceHeld(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // ── Pointer events ──────────────────────────────────────────────────────────

  const stopPan = useCallback(() => {
    panStateRef.current = null
    setIsPanning(false)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const isMiddle = e.button === 1
    const isPrimaryBtn = e.button === 0
    const currentTool = useEditorStore.getState().activeTool

    const shouldPan =
      isMiddle || (isPrimaryBtn && currentTool === 'hand') || (isPrimaryBtn && spaceHeldRef.current)

    if (!shouldPan) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    panStateRef.current = { lastX: e.clientX, lastY: e.clientY, pointerId: e.pointerId }
    setIsPanning(true)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const state = panStateRef.current
      if (!state || state.pointerId !== e.pointerId) return

      const dx = e.clientX - state.lastX
      const dy = e.clientY - state.lastY
      state.lastX = e.clientX
      state.lastY = e.clientY
      pan(dx, dy)
    },
    [pan]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (panStateRef.current?.pointerId === e.pointerId) {
        e.currentTarget.releasePointerCapture(e.pointerId)
        stopPan()
      }
    },
    [stopPan]
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (panStateRef.current?.pointerId === e.pointerId) {
        stopPan()
      }
    },
    [stopPan]
  )

  // ── Prevent middle-mouse browser autoscroll ─────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1) e.preventDefault()
  }, [])

  // ── ViewBox ─────────────────────────────────────────────────────────────────
  const { viewportWidth, viewportHeight } = useViewportStore.getState()
  const vb = calcViewBox(centerX, centerY, zoom, viewportWidth, viewportHeight)
  const viewBoxStr = `${vb.x} ${vb.y} ${vb.width} ${vb.height}`

  const cursor = cursorForState(activeTool, isPanning, isSpaceHeld)
  const minorStroke = gridMinorStroke(previewBackground)
  const majorStroke = gridMajorStroke(previewBackground)

  // ── Zoom label (for StatusBar via store; also here for aria) ────────────────
  const zoomLabel = formatZoomPercent(zoom)

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      data-testid="svg-canvas-container"
      aria-label={`Canvas viewport, zoom ${zoomLabel}`}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={viewBoxStr}
        aria-hidden="true"
        data-testid="svg-viewport"
        style={{ display: 'block', cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseDown={handleMouseDown}
      >
        <defs>
          {/* Artboard clip */}
          <clipPath id={clipId}>
            <rect x={ax} y={ay} width={cw} height={ch} />
          </clipPath>

          {/* Transparent-background checkerboard (fixed 20-unit squares in logical space) */}
          <pattern
            id={checkerId}
            x={ax}
            y={ay}
            width={20}
            height={20}
            patternUnits="userSpaceOnUse"
          >
            <rect width="10" height="10" fill="#666" />
            <rect x="10" y="0" width="10" height="10" fill="#888" />
            <rect x="0" y="10" width="10" height="10" fill="#888" />
            <rect x="10" y="10" width="10" height="10" fill="#666" />
          </pattern>

          {/* Minor grid lines every 50 units */}
          <pattern
            id={gridMinorId}
            x="0"
            y="0"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke={minorStroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>

          {/* Major grid lines every 100 units (fills with minor, adds major border) */}
          <pattern
            id={gridMajorId}
            x="0"
            y="0"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <rect width="100" height="100" fill={`url(#${gridMinorId})`} />
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke={majorStroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        {/* ── Artboard background ─────────────────────────────────────────── */}
        <rect
          x={ax}
          y={ay}
          width={cw}
          height={ch}
          fill={artboardFill(previewBackground, checkerId)}
          data-testid="artboard-background"
        />

        {/* ── Optional grid ───────────────────────────────────────────────── */}
        {gridVisible && (
          <rect
            x={ax}
            y={ay}
            width={cw}
            height={ch}
            fill={`url(#${gridMajorId})`}
            clipPath={`url(#${clipId})`}
            data-testid="grid-overlay"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* ── Optional center guides ──────────────────────────────────────── */}
        {guidesVisible && (
          <g clipPath={`url(#${clipId})`} data-testid="guides-overlay">
            <line
              x1={ax}
              y1={0}
              x2={-ax}
              y2={0}
              stroke={guideStroke(previewBackground)}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
            <line
              x1={0}
              y1={ay}
              x2={0}
              y2={-ay}
              stroke={guideStroke(previewBackground)}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )}

        {/* ── Artwork group (empty in Phase 4 — ready for Phase 5 rendering) */}
        <g data-testid="artwork-group" id="artwork" />

        {/* ── Artboard border ─────────────────────────────────────────────── */}
        <rect
          x={ax}
          y={ay}
          width={cw}
          height={ch}
          fill="none"
          stroke={artboardBorderStroke(previewBackground)}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          data-testid="artboard-border"
          style={{ pointerEvents: 'none' }}
        />

        {/* ── Empty state (in logical space, scales naturally with zoom) ──── */}
        {layerCount === 0 && (
          <g data-testid="empty-state" style={{ pointerEvents: 'none' }}>
            <text
              x={0}
              y={-20}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={40}
              fill={previewBackground === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Create an element to begin
            </text>
            <text
              x={0}
              y={40}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={24}
              fill={previewBackground === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Add a Ring or Radial Lines from the tool rail
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
