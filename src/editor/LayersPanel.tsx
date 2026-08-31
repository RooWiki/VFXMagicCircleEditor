import { useEditorStore } from '../store/editor'
import { useProjectStore } from '../store/project'

function EyeOpenIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path d="M1 8C1 8 3.5 3 8 3s7 5 7 5-2.5 5-7 5S1 8 1 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path d="M2 2l12 12" />
      <path d="M6.7 6.8A2 2 0 0 0 8 10a2 2 0 0 0 1.3-3.2" />
      <path d="M9.9 3.5C9.3 3.2 8.7 3 8 3 3.5 3 1 8 1 8s.7 1.4 2 2.7" />
      <path d="M12 5c1.2 1.1 2 2.9 2 3s-2.5 5-7 5c-.7 0-1.4-.1-2-.3" />
    </svg>
  )
}

export default function LayersPanel() {
  const layers = useProjectStore((s) => s.project.layers)
  const toggleLayerVisibility = useProjectStore((s) => s.toggleLayerVisibility)
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds)
  const selectLayer = useEditorStore((s) => s.selectLayer)

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

  const selectedId = selectedLayerIds[0] ?? null

  return (
    <ol aria-label="Layers" className="flex flex-col py-1">
      {[...layers].reverse().map((layer) => {
        const isSelected = layer.id === selectedId
        return (
          <li key={layer.id}>
            <div
              className={[
                'flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer',
                isSelected
                  ? 'bg-violet-900/30 text-neutral-200'
                  : 'text-neutral-300 hover:bg-neutral-800/50',
              ].join(' ')}
              role="row"
              aria-selected={isSelected}
            >
              {/* Visibility toggle */}
              <button
                type="button"
                aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={() => toggleLayerVisibility(layer.id)}
                className={[
                  'flex items-center justify-center w-5 h-5 shrink-0 rounded',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
                  layer.visible ? 'text-neutral-400' : 'text-neutral-600',
                  'hover:text-neutral-200',
                ].join(' ')}
              >
                {layer.visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>

              {/* Layer name — clicking selects the layer */}
              <button
                type="button"
                aria-label={`Select layer ${layer.name}`}
                onClick={() => selectLayer(layer.id)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 rounded"
              >
                <span className="truncate">{layer.name}</span>
                <span className="ml-auto shrink-0 text-neutral-500 capitalize">{layer.type}</span>
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
