import { commitAction, controlStyle } from './inspectorActions'
import type { Layer } from '../../types/layer'
import { useProjectStore } from '../../store/project'
import { useHistoryStore } from '../../store/history'
import { NumericField, SectionHeading } from './shared'

export function ArtworkNumber({
  layer,
  field,
  label,
  value,
  min = 0,
  max,
  step = 1,
}: {
  layer: Layer
  field: string
  label: string
  value: number
  min?: number
  max?: number
  step?: number
}) {
  return (
    <NumericField
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onBeginEdit={() => useHistoryStore.getState().beginInspectorEdit()}
      onCommitEdit={() => useHistoryStore.getState().commitInspectorEdit()}
      onChange={(value) => useProjectStore.getState().updateLayer(layer.id, { [field]: value })}
    />
  )
}
export function ArtworkSelect({
  layer,
  field,
  label,
  value,
  options,
}: {
  layer: Layer
  field: string
  label: string
  value: string
  options: [string, string][]
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      <select
        aria-label={label}
        value={value}
        className="rounded p-1.5"
        style={controlStyle}
        onChange={(event) =>
          commitAction(() =>
            useProjectStore.getState().updateLayer(layer.id, { [field]: event.target.value })
          )
        }
      >
        {options.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}
export function ArtworkColor({
  layer,
  field,
  label,
  value,
}: {
  layer: Layer
  field: string
  label: string
  value: string
}) {
  return (
    <label className="flex items-center justify-between text-xs">
      {label}
      <input
        type="color"
        aria-label={label}
        value={value}
        style={controlStyle}
        className="w-10 h-7 rounded"
        onFocus={() => useHistoryStore.getState().beginInspectorEdit()}
        onBlur={() => useHistoryStore.getState().commitInspectorEdit()}
        onChange={(event) =>
          useProjectStore.getState().updateLayer(layer.id, { [field]: event.target.value })
        }
      />
    </label>
  )
}
export default function FinishInspector({ layer }: { layer: Layer }) {
  const canFill = ['ring', 'shape', 'symbol'].includes(layer.type)
  return (
    <div className="pb-3">
      <SectionHeading>Fill and effects</SectionHeading>
      <div className="flex flex-col gap-2 px-3">
        {canFill && (
          <>
            <label className="flex gap-2 items-center text-xs">
              <input
                type="checkbox"
                checked={!!layer.fill && layer.fill !== 'none'}
                onChange={(event) =>
                  commitAction(() =>
                    useProjectStore
                      .getState()
                      .updateLayer(layer.id, { fill: event.target.checked ? '#1c1c1e' : 'none' })
                  )
                }
              />
              Solid fill
            </label>
            {layer.fill && layer.fill !== 'none' && (
              <ArtworkColor layer={layer} field="fill" label="Fill color" value={layer.fill} />
            )}
            <label className="flex gap-2 items-center text-xs">
              <input
                type="checkbox"
                checked={layer.knockout ?? false}
                onChange={(event) =>
                  commitAction(() =>
                    useProjectStore
                      .getState()
                      .updateLayer(layer.id, { knockout: event.target.checked })
                  )
                }
              />
              Cut out layers below
            </label>
            {layer.knockout && (
              <p className="text-[10px]">
                Removes underlying artwork. Disable Solid fill for a transparent opening.
              </p>
            )}
          </>
        )}
        <ArtworkNumber
          layer={layer}
          field="outlineWidth"
          label="Second outline"
          value={layer.outlineWidth ?? 0}
          max={40}
          step={0.5}
        />
        {!!layer.outlineWidth && (
          <ArtworkColor
            layer={layer}
            field="outlineColor"
            label="Outline color"
            value={layer.outlineColor ?? '#660000'}
          />
        )}
        <ArtworkNumber
          layer={layer}
          field="glowBlur"
          label="Glow"
          value={layer.glowBlur ?? 0}
          max={40}
          step={0.5}
        />
        {!!layer.glowBlur && (
          <ArtworkColor
            layer={layer}
            field="glowColor"
            label="Glow color"
            value={layer.glowColor ?? '#ff4444'}
          />
        )}
        <ArtworkNumber
          layer={layer}
          field="shadowBlur"
          label="Shadow softness"
          value={layer.shadowBlur ?? 0}
          max={40}
          step={0.5}
        />
        <div className="grid grid-cols-2 gap-2">
          <ArtworkNumber
            layer={layer}
            field="shadowX"
            label="Shadow X"
            value={layer.shadowX ?? 0}
            min={-100}
            max={100}
          />
          <ArtworkNumber
            layer={layer}
            field="shadowY"
            label="Shadow Y"
            value={layer.shadowY ?? 0}
            min={-100}
            max={100}
          />
        </div>
        {!!(layer.shadowBlur || layer.shadowX || layer.shadowY) && (
          <ArtworkColor
            layer={layer}
            field="shadowColor"
            label="Shadow color"
            value={layer.shadowColor ?? '#000000'}
          />
        )}
      </div>
    </div>
  )
}
