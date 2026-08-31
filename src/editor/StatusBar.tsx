import { useProjectStore } from '../store/project'

export default function StatusBar() {
  const canvas = useProjectStore((s) => s.project.canvas)
  const layerCount = useProjectStore((s) => s.project.layers.length)

  return (
    <footer
      role="contentinfo"
      aria-label="Application status"
      className="flex items-center h-[26px] px-3 bg-neutral-900 border-t border-neutral-700 shrink-0 gap-4 text-xs text-neutral-400 select-none"
    >
      <span>Ready</span>
      <span aria-hidden="true" className="w-px h-3.5 bg-neutral-700" />
      <span aria-label="Canvas dimensions">
        {canvas.width} × {canvas.height}
      </span>
      <span aria-hidden="true" className="w-px h-3.5 bg-neutral-700" />
      <span aria-label="Zoom level">100%</span>
      <span aria-hidden="true" className="w-px h-3.5 bg-neutral-700" />
      <span aria-label="Layer count">
        {layerCount} {layerCount === 1 ? 'layer' : 'layers'}
      </span>
    </footer>
  )
}
