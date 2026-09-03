import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import type { RadialLinesLayer } from '../../types/layer'
import { NumericField, SectionHeading } from './shared'

// ─── inspector ───────────────────────────────────────────────────────────────

interface Props {
  layer: RadialLinesLayer
}

export default function RadialLinesInspector({ layer }: Props) {
  const updateRadialLinesLayer = useProjectStore((s) => s.updateRadialLinesLayer)
  const updateLayerTransform = useProjectStore((s) => s.updateLayerTransform)

  const historyBegin = () => useHistoryStore.getState().beginInspectorEdit()
  const historyCommit = () => useHistoryStore.getState().commitInspectorEdit()

  return (
    <div className="flex flex-col" data-testid="radial-lines-inspector">
      {/* Layer name */}
      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--rw-border-subtle)' }}>
        <p className="text-xs font-medium truncate" style={{ color: 'var(--rw-text-primary)' }}>
          {layer.name}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--rw-text-tertiary)' }}>
          Radial Lines
        </p>
      </div>

      {/* ── Artwork ────────────────────────────────────────────────────────── */}
      <SectionHeading>Radial Lines</SectionHeading>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <NumericField
          label="Count"
          value={layer.count}
          min={1}
          max={360}
          step={1}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRadialLinesLayer(layer.id, { count: Math.round(n) })}
        />

        <NumericField
          label="Inner Radius"
          value={layer.innerRadius}
          min={0.1}
          step={1}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRadialLinesLayer(layer.id, { innerRadius: n })}
        />

        <NumericField
          label="Outer Radius"
          value={layer.outerRadius}
          min={0.1}
          step={1}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRadialLinesLayer(layer.id, { outerRadius: n })}
        />

        <NumericField
          label="Start Angle"
          value={layer.startAngle}
          step={1}
          unit="°"
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRadialLinesLayer(layer.id, { startAngle: n })}
        />

        <NumericField
          label="Thickness"
          value={layer.strokeWidth}
          min={0.1}
          step={0.5}
          onBeginEdit={historyBegin}
          onCommitEdit={historyCommit}
          onChange={(n) => updateRadialLinesLayer(layer.id, { strokeWidth: n })}
        />

        {/* Color */}
        <label className="flex flex-col gap-0.5">
          <span
            className="text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--rw-text-tertiary)' }}
          >
            Color
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.color}
              aria-label="Color"
              onFocus={historyBegin}
              onChange={(e) => updateRadialLinesLayer(layer.id, { color: e.target.value })}
              onBlur={historyCommit}
              className="w-8 h-7 rounded cursor-pointer p-0.5"
              style={{
                background: 'var(--rw-bg-control)',
                border: '1px solid var(--rw-border-default)',
              }}
            />
            <input
              type="text"
              value={layer.color}
              aria-label="Color hex value"
              maxLength={7}
              onFocus={(e) => {
                historyBegin()
                e.currentTarget.style.borderColor = 'var(--rw-active-border)'
              }}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    updateRadialLinesLayer(layer.id, { color: v })
                  }
                }
              }}
              onBlur={(e) => {
                historyCommit()
                e.currentTarget.style.borderColor = 'var(--rw-border-default)'
              }}
              className="flex-1 rounded px-2 py-1 text-xs font-mono focus:outline-none"
              style={{
                background: 'var(--rw-bg-control)',
                border: '1px solid var(--rw-border-default)',
                color: 'var(--rw-text-primary)',
              }}
            />
          </div>
        </label>

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
                updateRadialLinesLayer(layer.id, { opacity: parseInt(e.target.value, 10) / 100 })
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
