import { commitAction, controlStyle } from './inspectorActions'
import { useState } from 'react'
import type { Layer, GroupLayer, SymbolLayer } from '../../types/layer'
import { useProjectStore } from '../../store/project'
import { useHistoryStore } from '../../store/history'
import {
  createRingLayer,
  createShapeLayer,
  createSymbolLayer,
  createTextLayer,
  createRadialLinesLayer,
} from '../../utils/factories'
import { sanitizeSvg } from '../../utils/sanitizeSvg'
import { NumericField, SectionHeading } from './shared'
import FinishInspector, { ArtworkNumber, ArtworkSelect, ArtworkColor } from './FinishInspector'
import RingInspector from './RingInspector'
import RadialLinesInspector from './RadialLinesInspector'

function SymbolImport({ layer }: { layer: SymbolLayer }) {
  const [error, setError] = useState('')
  return (
    <label className="text-xs flex flex-col gap-1">
      Import SVG symbol
      <input
        type="file"
        accept=".svg,image/svg+xml"
        aria-label="Import SVG symbol"
        className="w-full text-xs"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          try {
            if (file.size > 200000) throw new Error('SVG must be smaller than 200 KB.')
            const customSvg = sanitizeSvg(await file.text())
            commitAction(() =>
              useProjectStore
                .getState()
                .updateLayer(layer.id, { symbol: 'custom', customSvg, fill: layer.color })
            )
            setError('')
          } catch (error) {
            setError(error instanceof Error ? error.message : String(error))
          }
        }}
      />
      {error && <span role="alert">{error}</span>}
      <span className="text-[10px]">
        Vector shapes are recolored to match this symbol. Convert text to paths before importing.
      </span>
    </label>
  )
}

function GroupEditor({ layer, onEdit }: { layer: GroupLayer; onEdit: (id: string) => void }) {
  const update = useProjectStore((s) => s.updateLayer)
  return (
    <>
      <div className="px-3 flex flex-col gap-2">
        <ArtworkNumber
          layer={layer}
          field="repeatCount"
          label="Copies"
          value={layer.repeatCount}
          min={1}
          max={36}
        />
        {layer.repeatCount > 1 && (
          <>
            <ArtworkNumber
              layer={layer}
              field="repeatRadius"
              label="Distance from center"
              value={layer.repeatRadius}
              max={2000}
            />
            <ArtworkNumber
              layer={layer}
              field="startAngle"
              label="Initial angle"
              value={layer.startAngle}
              min={-360}
              max={360}
            />
            <ArtworkSelect
              layer={layer}
              field="orientation"
              label="Copy orientation"
              value={layer.orientation}
              options={[
                ['upright', 'Keep upright'],
                ['radial', 'Rotate around center'],
                ['tangent', 'Face along circle'],
              ]}
            />
          </>
        )}
        <p className="text-[10px]">
          Build the emblem around the group center, then increase Copies to repeat it.
        </p>
        <SectionHeading>Group members</SectionHeading>
        {layer.children.map((item, index) => (
          <div key={item.id} className="flex gap-1 items-center">
            <button
              className="text-xs flex-1 text-left truncate rounded p-1"
              style={controlStyle}
              onClick={() => onEdit(item.id)}
            >
              {item.name}
            </button>
            <button
              aria-label={`Move ${item.name} up`}
              title="Move forward"
              disabled={index === layer.children.length - 1}
              onClick={() =>
                commitAction(() => {
                  const children = [...layer.children]
                  ;[children[index], children[index + 1]] = [children[index + 1], children[index]]
                  update(layer.id, { children })
                })
              }
            >
              ↑
            </button>
            <button
              aria-label={`Remove ${item.name} from group`}
              title="Remove member"
              onClick={() =>
                commitAction(() => useProjectStore.getState().removeGroupChild(layer.id, item.id))
              }
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-1" role="group" aria-label="Add group member">
          {[
            ['Ring', () => createRingLayer({ radius: 50, strokeWidth: 2 })],
            ['Star', () => ({ ...createShapeLayer(), radius: 40, innerRadius: 20 })],
            ['Symbol', createSymbolLayer],
            ['Text', () => ({ ...createTextLayer(), radius: 60, fontSize: 10 })],
            ['Lines', () => createRadialLinesLayer({ innerRadius: 40, outerRadius: 50 })],
          ].map(([name, factory]) => (
            <button
              key={String(name)}
              className="rounded p-1 text-xs"
              style={controlStyle}
              onClick={() =>
                commitAction(() =>
                  useProjectStore.getState().addGroupChild(layer.id, (factory as () => Layer)())
                )
              }
            >
              + {String(name)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function AdvancedInspector({
  layer,
  onEdit = () => {},
}: {
  layer: Exclude<Layer, { type: 'ring' | 'radial-lines' }>
  onEdit?: (id: string) => void
}) {
  const update = useProjectStore((s) => s.updateLayer)
  return (
    <>
      <SectionHeading>
        {layer.type === 'shape'
          ? 'Star / Polygon'
          : layer.type === 'circular-text'
            ? 'Circular Text'
            : layer.type === 'group'
              ? 'Group / Repeat'
              : 'Symbol'}
      </SectionHeading>
      {layer.type === 'group' ? (
        <GroupEditor layer={layer} onEdit={onEdit} />
      ) : (
        <div className="px-3 flex flex-col gap-2 pb-3">
          {layer.type === 'shape' && (
            <>
              <ArtworkSelect
                layer={layer}
                field="shape"
                label="Shape"
                value={layer.shape}
                options={[
                  ['star', 'Star'],
                  ['polygon', 'Polygon'],
                ]}
              />
              <ArtworkNumber
                layer={layer}
                field="points"
                label="Points / sides"
                value={layer.points}
                min={3}
                max={64}
              />
            </>
          )}
          <ArtworkNumber
            layer={layer}
            field="radius"
            label="Radius"
            value={layer.radius}
            min={layer.type === 'shape' ? Math.max(0.1, layer.innerRadius) : 0.1}
          />
          {layer.type === 'shape' && layer.shape === 'star' && (
            <ArtworkSelect
              layer={layer}
              field="starMode"
              label="Star style"
              value={layer.starMode ?? 'outline'}
              options={[
                ['outline', 'Pointed outline'],
                ['interlaced', 'Interlaced'],
              ]}
            />
          )}
          {layer.type === 'shape' && layer.shape === 'star' && layer.starMode === 'interlaced' && (
            <ArtworkNumber
              layer={layer}
              field="skip"
              label="Vertex step"
              value={Math.min(layer.skip ?? 2, layer.points - 1)}
              min={2}
              max={Math.min(31, layer.points - 1)}
            />
          )}
          {layer.type === 'shape' && layer.shape === 'star' && layer.starMode !== 'interlaced' && (
            <ArtworkNumber
              layer={layer}
              field="innerRadius"
              label="Inner radius"
              value={layer.innerRadius}
              max={layer.radius}
            />
          )}
          {layer.type === 'circular-text' && (
            <>
              <label className="flex gap-2 items-center text-xs">
                <input
                  type="checkbox"
                  checked={layer.fitToCircle ?? false}
                  onChange={(event) =>
                    commitAction(() => update(layer.id, { fitToCircle: event.target.checked }))
                  }
                />
                Fit text to circle
              </label>
              <label className="flex flex-col text-xs gap-1">
                Text
                <textarea
                  aria-label="Text"
                  value={layer.text}
                  maxLength={2000}
                  style={controlStyle}
                  className="rounded p-2 resize-y"
                  onFocus={() => useHistoryStore.getState().beginInspectorEdit()}
                  onBlur={() => useHistoryStore.getState().commitInspectorEdit()}
                  onChange={(event) => update(layer.id, { text: event.target.value })}
                />
              </label>
              <ArtworkSelect
                layer={layer}
                field="fontFamily"
                label="Font"
                value={layer.fontFamily}
                options={[
                  ['serif', 'Serif'],
                  ['sans-serif', 'Sans serif'],
                  ['monospace', 'Monospace'],
                ]}
              />
              <ArtworkNumber
                layer={layer}
                field="fontSize"
                label="Font size"
                value={layer.fontSize}
                min={1}
                max={300}
              />
              <ArtworkNumber
                layer={layer}
                field="letterSpacing"
                label="Letter spacing"
                value={layer.letterSpacing}
                min={-10}
                max={100}
                step={0.5}
              />
              <ArtworkNumber
                layer={layer}
                field="startAngle"
                label="Initial angle"
                value={layer.startAngle}
                min={-360}
                max={360}
              />
              <ArtworkSelect
                layer={layer}
                field="direction"
                label="Direction"
                value={layer.direction}
                options={[
                  ['clockwise', 'Clockwise'],
                  ['counterclockwise', 'Counterclockwise'],
                ]}
              />
            </>
          )}
          {layer.type === 'symbol' && (
            <>
              <ArtworkSelect
                layer={layer}
                field="symbol"
                label="Symbol"
                value={layer.symbol}
                options={[
                  ['sun', 'Sun'],
                  ['moon', 'Crescent moon'],
                  ['cross', 'Cross'],
                  ['rune', 'Rune'],
                  ['diamond', 'Diamond'],
                  ...(layer.customSvg ? [['custom', 'Imported SVG'] as [string, string]] : []),
                ]}
              />
              <SymbolImport layer={layer} />
            </>
          )}
          <ArtworkColor layer={layer} field="color" label="Color" value={layer.color} />
          <ArtworkNumber
            layer={layer}
            field="strokeWidth"
            label="Thickness"
            value={layer.strokeWidth}
            min={layer.type === 'circular-text' ? 0 : 0.1}
            step={0.5}
          />
        </div>
      )}
      <SectionHeading>Transform</SectionHeading>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        {(['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const).map((key) => (
          <NumericField
            key={key}
            label={
              { x: 'X', y: 'Y', rotation: 'Rotation', scaleX: 'Scale X', scaleY: 'Scale Y' }[key]
            }
            value={layer.transform[key]}
            step={key.startsWith('scale') ? 0.01 : 1}
            onBeginEdit={() => useHistoryStore.getState().beginInspectorEdit()}
            onCommitEdit={() => useHistoryStore.getState().commitInspectorEdit()}
            onChange={(value) =>
              useProjectStore.getState().updateLayerTransform(layer.id, { [key]: value })
            }
          />
        ))}
        <ArtworkNumber
          layer={layer}
          field="opacity"
          label="Opacity (0–1)"
          value={layer.opacity}
          max={1}
          step={0.05}
        />
      </div>
    </>
  )
}

function GroupLayerInspector({ layer }: { layer: GroupLayer }) {
  const [childId, setChildId] = useState<string | null>(null)
  const child = layer.children.find((item) => item.id === childId)
  if (child)
    return (
      <fieldset disabled={layer.locked} className="min-w-0">
        <button
          style={controlStyle}
          className="rounded p-2 text-xs m-2"
          onClick={() => setChildId(null)}
        >
          Back to group
        </button>
        <p className="text-xs px-3">Editing {child.name}. All repeated copies update together.</p>
        <LayerInspector key={child.id} layer={child} />
      </fieldset>
    )
  return (
    <fieldset
      disabled={layer.locked}
      className="min-w-0"
      style={{ color: 'var(--rw-text-secondary)' }}
    >
      <AdvancedInspector layer={layer} onEdit={setChildId} />
      <FinishInspector layer={layer} />
    </fieldset>
  )
}

export function LayerInspector({ layer }: { layer: Layer }) {
  if (layer.type === 'group') return <GroupLayerInspector layer={layer} />
  return (
    <fieldset
      disabled={layer.locked}
      className="min-w-0"
      style={{ color: 'var(--rw-text-secondary)' }}
    >
      {layer.type === 'ring' ? (
        <RingInspector layer={layer} />
      ) : layer.type === 'radial-lines' ? (
        <RadialLinesInspector layer={layer} />
      ) : (
        <AdvancedInspector layer={layer} />
      )}
      <FinishInspector layer={layer} />
    </fieldset>
  )
}
