import { useEditorStore } from '../store/editor'
import { useProjectStore } from '../store/project'
import type { RadialLinesLayer, RingLayer } from '../types/layer'
import AnimationPanel from './AnimationPanel'
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
        <p className="text-sm font-medium text-neutral-300">No selection</p>
        <p className="text-xs text-neutral-600 max-w-[200px] leading-relaxed">
          Select a layer to edit its properties.
        </p>
      </div>
    )
  }

  if (selectedLayer.type === 'ring') {
    return (
      <div className="flex flex-col" key={selectedLayer.id}>
        <RingInspector layer={selectedLayer as RingLayer} />
        <AnimationPanel layer={selectedLayer} />
      </div>
    )
  }

  if (selectedLayer.type === 'radial-lines') {
    return (
      <div className="flex flex-col" key={selectedLayer.id}>
        <RadialLinesInspector layer={selectedLayer as RadialLinesLayer} />
        <AnimationPanel layer={selectedLayer} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
      <p className="text-sm font-medium text-neutral-300">Unknown layer type</p>
      <p className="text-xs text-neutral-600 max-w-[200px] leading-relaxed">
        This layer type is not yet supported in the inspector.
      </p>
    </div>
  )
}
