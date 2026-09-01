import { useEffect, useRef, useState } from 'react'
import { useHistoryStore } from '../../store/history'
import { useProjectStore } from '../../store/project'
import type { RingLayer } from '../../types/layer'

// ─── shared primitive ────────────────────────────────────────────────────────

interface NumericFieldProps {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  onBeginEdit?: () => void
  onCommitEdit?: () => void
}

function NumericField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  onBeginEdit,
  onCommitEdit,
}: NumericFieldProps) {
  const [draft, setDraft] = useState(String(value))
  const focusedRef = useRef(false)

  // Sync draft when external value changes (e.g. canvas drag updates the store)
  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value))
    }
  }, [value])

  const commit = (raw: string) => {
    const n = parseFloat(raw)
    if (Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) {
      if (n !== value) onChange(n)
      setDraft(String(n))
    } else {
      setDraft(String(value))
    }
  }

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={draft}
          step={step}
          min={min}
          max={max}
          aria-label={label}
          onFocus={() => {
            focusedRef.current = true
            onBeginEdit?.()
          }}
          onChange={(e) => {
            const raw = e.target.value
            setDraft(raw)
            const n = parseFloat(raw)
            if (
              Number.isFinite(n) &&
              (min === undefined || n >= min) &&
              (max === undefined || n <= max)
            ) {
              onChange(n)
            }
          }}
          onBlur={(e) => {
            focusedRef.current = false
            commit(e.target.value)
            onCommitEdit?.()
          }}
          className={[
            'w-full rounded bg-neutral-800 border border-neutral-700 px-2 py-1',
            'text-xs text-neutral-200 tabular-nums',
            'focus:outline-none focus:border-violet-500',
            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
          ].join(' ')}
        />
        {unit && <span className="text-[10px] text-neutral-500 shrink-0">{unit}</span>}
      </div>
    </label>
  )
}

// ─── section heading ─────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest px-3 pt-3 pb-1">
      {children}
    </h3>
  )
}

// ─── inspector ───────────────────────────────────────────────────────────────

interface Props {
  layer: RingLayer
}

export default function RingInspector({ layer }: Props) {
  const updateRingLayer = useProjectStore((s) => s.updateRingLayer)
  const updateLayerTransform = useProjectStore((s) => s.updateLayerTransform)

  const historyBegin = () => useHistoryStore.getState().beginInspectorEdit()
  const historyCommit = () => useHistoryStore.getState().commitInspectorEdit()

  return (
    <div className="flex flex-col" data-testid="ring-inspector">
      {/* Layer name */}
      <div className="px-3 pt-3 pb-2 border-b border-neutral-800">
        <p className="text-xs font-medium text-neutral-200 truncate">{layer.name}</p>
        <p className="text-[10px] text-neutral-500 mt-0.5">Ring</p>
      </div>

      {/* ── Artwork ────────────────────────────────────────────────────────── */}
      <SectionHeading>Ring</SectionHeading>

      <div className="flex flex-col gap-2 px-3 pb-3">
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

        {/* Color */}
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.color}
              aria-label="Color"
              onFocus={historyBegin}
              onChange={(e) => updateRingLayer(layer.id, { color: e.target.value })}
              onBlur={historyCommit}
              className="w-8 h-7 rounded border border-neutral-700 bg-neutral-800 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={layer.color}
              aria-label="Color hex value"
              maxLength={7}
              onFocus={historyBegin}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    updateRingLayer(layer.id, { color: v })
                  }
                }
              }}
              onBlur={historyCommit}
              className={[
                'flex-1 rounded bg-neutral-800 border border-neutral-700 px-2 py-1',
                'text-xs text-neutral-200 font-mono',
                'focus:outline-none focus:border-violet-500',
              ].join(' ')}
            />
          </div>
        </label>

        {/* Opacity */}
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Opacity</span>
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
              className="flex-1 accent-violet-500"
            />
            <span className="text-xs text-neutral-400 tabular-nums w-9 text-right">
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>
        </label>
      </div>

      <div aria-hidden="true" className="mx-3 h-px bg-neutral-800" />

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
