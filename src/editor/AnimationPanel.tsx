import { useAnimationStore } from '../store/animation'
import type { Layer } from '../types/layer'
import { NumericField, SectionHeading } from './inspector/shared'

interface Props {
  layer: Layer
}

export default function AnimationPanel({ layer }: Props) {
  const config = useAnimationStore((s) => s.configs[layer.id])
  const setLayerConfig = useAnimationStore((s) => s.setLayerConfig)

  const rotationSpeed = config?.rotationSpeed ?? 0
  const pulseSpeed = config?.pulseSpeed ?? 0
  const pulseAmplitude = config?.pulseAmplitude ?? 0

  return (
    <div data-testid="animation-panel">
      <div
        aria-hidden="true"
        className="mx-3 h-px"
        style={{ background: 'var(--rw-border-subtle)' }}
      />
      <SectionHeading>Animation</SectionHeading>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <NumericField
          label="Spin Speed"
          value={rotationSpeed}
          step={5}
          unit="°/s"
          onChange={(n) => setLayerConfig(layer.id, { rotationSpeed: n })}
        />
        <NumericField
          label="Pulse Speed"
          value={pulseSpeed}
          min={0}
          step={0.1}
          unit="Hz"
          onChange={(n) => setLayerConfig(layer.id, { pulseSpeed: n })}
        />
        <NumericField
          label="Pulse Amplitude"
          value={pulseAmplitude}
          min={0}
          max={1}
          step={0.05}
          onChange={(n) => setLayerConfig(layer.id, { pulseAmplitude: n })}
        />
      </div>
    </div>
  )
}
