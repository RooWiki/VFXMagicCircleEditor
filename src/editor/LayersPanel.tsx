import { useProjectStore } from '../store/project'

export default function LayersPanel() {
  const layers = useProjectStore((s) => s.project.layers)

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-6 text-center h-full">
        <p className="text-sm font-medium text-neutral-300">No layers yet</p>
        <p className="text-xs text-neutral-600 max-w-[200px] leading-relaxed">
          Add a Ring or Radial Lines to start building your design.
        </p>
      </div>
    )
  }

  return (
    <ol aria-label="Layers" className="flex flex-col py-1">
      {[...layers].reverse().map((layer) => (
        <li
          key={layer.id}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800/50"
        >
          <span className="truncate">{layer.name}</span>
          <span className="ml-auto shrink-0 text-neutral-500 capitalize">{layer.type}</span>
        </li>
      ))}
    </ol>
  )
}
