import ColorField from './ColorField'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import type { RingLayer } from '../../types/layer'
import { NumericField, SectionHeading } from './shared'

// ─── inspector ───────────────────────────────────────────────────────────────

interface Props {
  layer: RingLayer
}

export default function RingInspector({ layer }: Props) {
  const updateRingLayer = useProjectStore((s) => s.updateRingLayer)
  const updateLayerTransform = useProjectStore((s) => s.updateLayerTransform)

  const historyBegin = () => useHistoryStore.getState().beginInspectorEdit()
  const historyCommit = () => useHistoryStore.getState().commitInspectorEdit()

  const style = layer.style ?? 'simple'
  const decorationFields =
    style === 'concentric'
      ? [
          {
            key: 'ringCount' as const,
            label: 'Ring count',
            value: layer.ringCount ?? 3,
            min: 2,
            max: 20,
            step: 1,
          },
          {
            key: 'spacing' as const,
            label: 'Spacing',
            value: layer.spacing ?? 12,
            min: 0.1,
            step: 1,
          },
        ]
      : style === 'divided'
        ? [
            {
              key: 'bandWidth' as const,
              label: 'Band width',
              value: layer.bandWidth ?? 20,
              min: 0.1,
              step: 1,
            },
            {
              key: 'divisions' as const,
              label: 'Divisions',
              value: layer.divisions ?? 48,
              min: 1,
              max: 360,
              step: 1,
            },
            {
              key: 'dividerWidth' as const,
              label: 'Divider thickness',
              value: layer.dividerWidth ?? 2,
              min: 0.1,
              step: 0.5,
            },
            {
              key: 'startAngle' as const,
              label: 'Initial angle',
              value: layer.startAngle ?? 0,
              step: 1,
            },
          ]
        : style === 'arc'
          ? [
              {
                key: 'startAngle' as const,
                label: 'Initial angle',
                value: layer.startAngle ?? 0,
                step: 1,
              },
              {
                key: 'sweepAngle' as const,
                label: 'Arc span',
                value: layer.sweepAngle ?? 270,
                min: 1,
                max: 360,
                step: 1,
              },
            ]
          : []

  return (
    <div className="flex flex-col" data-testid="ring-inspector">
      {/* Layer name */}
      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--rw-border-subtle)' }}>
        <p className="text-xs font-medium truncate" style={{ color: 'var(--rw-text-primary)' }}>
          {layer.name}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--rw-text-tertiary)' }}>
          Ring
        </p>
      </div>

      {/* ── Artwork ────────────────────────────────────────────────────────── */}
      <SectionHeading>Ring</SectionHeading>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <label
          className="flex flex-col gap-1 text-xs"
          style={{ color: 'var(--rw-text-secondary)' }}
        >
          Ring style
          <select
            aria-label="Ring style"
            value={style}
            className="rounded px-2 py-1.5 text-xs"
            style={{
              background: 'var(--rw-bg-control)',
              color: 'var(--rw-text-primary)',
              border: '1px solid var(--rw-border-default)',
            }}
            onChange={(event) => {
              historyBegin()
              updateRingLayer(layer.id, {
                style: event.target.value as NonNullable<RingLayer['style']>,
              })
              historyCommit()
            }}
          >
            <option value="simple">Simple</option>
            <option value="concentric">Concentric</option>
            <option value="divided">Divided band</option>
            <option value="arc">Arc</option>
          </select>
        </label>
        {decorationFields.map(({ key, ...field }) => (
          <NumericField
            key={key}
            {...field}
            onBeginEdit={historyBegin}
            onCommitEdit={historyCommit}
            onChange={(value) => {
              if ((key === 'ringCount' || key === 'divisions') && !Number.isInteger(value)) return
              updateRingLayer(layer.id, { [key]: value })
            }}
          />
        ))}
        {(style === 'concentric' || style === 'divided') && (
          <p className="text-[10px]" style={{ color: 'var(--rw-text-tertiary)' }}>
            Details extend inward. Spacing and band width fit automatically inside the radius.
          </p>
        )}

        <NumericField
          label="Radius"
          value={layer.radius}
          min={0.1}
          step={1}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRingLayer(layer.id, { radius: n })}
        />
        <NumericField
          label="Thickness"
          value={layer.strokeWidth}
          min={0.1}
          step={0.5}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRingLayer(layer.id, { strokeWidth: n })}
        />

        <ColorField
          value={layer.color}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(color) => updateRingLayer(layer.id, { color })}
        />

        {/* Opacity */}
        <label className="flex flex-col gap-0.5">
          <span
            className="text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--rw-text-tertiary)' }}
          >
            Opacity
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(layer.opacity * 100)}
              aria-label="Opacity"
              onFocus={historyBegin}
              onChange={(e) =>
                updateRingLayer(layer.id, { opacity: parseInt(e.target.value, 10) / 100 })
              }
              onBlur={historyCommit}
              className="flex-1"
            />
            <span
              className="text-xs tabular-nums w-9 text-right"
              style={{ color: 'var(--rw-text-secondary)' }}
            >
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>
        </label>
      </div>

      <div
        aria-hidden="true"
        className="mx-3 h-px"
        style={{ background: 'var(--rw-border-subtle)' }}
      />

      {/* ── Transform ───────────────────────────────────────────────────────── */}
      <SectionHeading>Transform</SectionHeading>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <NumericField
            label="X"
            value={layer.transform.x}
            step={1}
            onBeginEdit={historyBegin}
            onCommitEdit={historyCommit}
            onChange={(n) => updateLayerTransform(layer.id, { x: n })}
          />
          <NumericField
            label="Y"
            value={layer.transform.y}
            step={1}
            onBeginEdit={historyBegin}
            onCommitEdit={historyCommit}
            onChange={(n) => updateLayerTransform(layer.id, { y: n })}
          />
        </div>

        <NumericField
          label="Rotation"
          value={layer.transform.rotation}
          step={1}
          unit="°"
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateLayerTransform(layer.id, { rotation: n })}
        />

        <div className="grid grid-cols-2 gap-2">
          <NumericField
            label="Scale X"
            value={layer.transform.scaleX}
            step={0.01}
            onBeginEdit={historyBegin}
            onCommitEdit={historyCommit}
            onChange={(n) => updateLayerTransform(layer.id, { scaleX: n })}
          />
          <NumericField
            label="Scale Y"
            value={layer.transform.scaleY}
            step={0.01}
            onBeginEdit={historyBegin}
            onCommitEdit={historyCommit}
            onChange={(n) => updateLayerTransform(layer.id, { scaleY: n })}
          />
        </div>
      </div>
    </div>
  )
}
