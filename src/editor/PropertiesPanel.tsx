import { useEditorStore } from '../store/editor'
import { useProjectStore } from '../store/project'
import type { RadialLinesLayer, RingLayer } from '../types/layer'
import RadialLinesInspector from './inspector/RadialLinesInspector'
import RingInspector from './inspector/RingInspector'

export default function PropertiesPanel() {
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds)
  const layers = useProjectStore((s) => s.project.layers)

  const selectedId = selectedLayerIds[0] ?? null
  const selectedLayer = selectedId !== null ? layers.find((l) => l.id === selectedId) : null

  if (!selectedLayer) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
        <p className="text-sm font-medium" style={{ color: 'var(--rw-text-secondary)' }}>
          No selection
        </p>
        <p
          className="text-xs max-w-[200px] leading-relaxed"
          style={{ color: 'var(--rw-text-tertiary)' }}
        >
          Select a layer to edit its properties.
        </p>
      </div>
    )
  }

  if (selectedLayer.type === 'ring') {
    return <RingInspector key={selectedLayer.id} layer={selectedLayer as RingLayer} />
  }

  if (selectedLayer.type === 'radial-lines') {
    return <RadialLinesInspector key={selectedLayer.id} layer={selectedLayer as RadialLinesLayer} />
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
      <p className="text-sm font-medium" style={{ color: 'var(--rw-text-secondary)' }}>
        Unknown layer type
      </p>
      <p
        className="text-xs max-w-[200px] leading-relaxed"
        style={{ color: 'var(--rw-text-tertiary)' }}
      >
        This layer type is not yet supported in the inspector.
      </p>
    </div>
  )
}
