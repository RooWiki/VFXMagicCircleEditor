import { useProjectStore } from '../store/project'
import { useViewportStore } from '../store/viewport'
import { formatZoomPercent } from '../utils/viewport'

export default function StatusBar() {
  const canvas = useProjectStore((s) => s.project.canvas)
  const layerCount = useProjectStore((s) => s.project.layers.length)
  const zoom = useViewportStore((s) => s.zoom)

  return (
    <footer
      role="contentinfo"
      aria-label="Application status"
      className="flex items-center h-[26px] px-3 shrink-0 gap-4 text-xs select-none border-t"
      style={{
        background: 'var(--rw-bg-panel)',
        borderColor: 'var(--rw-border-subtle)',
        color: 'var(--rw-text-tertiary)',
      }}
    >
      <span>Ready</span>
      <span
        aria-hidden="true"
        className="w-px h-3.5"
        style={{ background: 'var(--rw-border-subtle)' }}
      />
      <span aria-label="Canvas dimensions">
        {canvas.width} × {canvas.height}
      </span>
      <span
        aria-hidden="true"
        className="w-px h-3.5"
        style={{ background: 'var(--rw-border-subtle)' }}
      />
      <span aria-label="Zoom level">{formatZoomPercent(zoom)}</span>
      <span
        aria-hidden="true"
        className="w-px h-3.5"
        style={{ background: 'var(--rw-border-subtle)' }}
      />
      <span aria-label="Layer count">
        {layerCount} {layerCount === 1 ? 'layer' : 'layers'}
      </span>
    </footer>
  )
}
