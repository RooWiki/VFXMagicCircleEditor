import { useEditorStore } from '../store/editor'
import { useGeneratorStore, type LockKey } from '../store/generatorStore'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import { generateCircle, type Complexity } from '../generators/generator'

// ─── Icons ────────────────────────────────────────────────────────────────────

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" aria-hidden="true">
      <rect x="3" y="8" width="10" height="7" rx="1" />
      {open ? (
        <path
          d="M5 8V5.5A3 3 0 0 1 10.2 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M5 8V5a3 3 0 0 1 6 0v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
      {children}
    </p>
  )
}

function LockButton({
  locked,
  onToggle,
  label,
}: {
  locked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
      title={locked ? `Unlock ${label}` : `Lock ${label}`}
      className={[
        'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500',
        locked
          ? 'text-violet-400 hover:text-violet-300'
          : 'text-neutral-600 hover:text-neutral-400',
      ].join(' ')}
    >
      <LockIcon open={!locked} />
    </button>
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  disabled,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  label: string
  disabled: boolean
  className?: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value)
        if (!Number.isNaN(v)) onChange(v)
      }}
      min={min}
      max={max}
      step={step}
      aria-label={label}
      disabled={disabled}
      className={[
        'w-16 px-2 py-1 text-[13px] rounded bg-neutral-800 border border-neutral-700',
        'text-neutral-200 focus:outline-none focus:ring-1 focus:ring-violet-500',
        'disabled:opacity-40 disabled:cursor-not-allowed tabular-nums',
        className,
      ].join(' ')}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GeneratorModal() {
  const { isOpen, close, seed, setSeed, params, setParams, locks, toggleLock, randomizeUnlocked } =
    useGeneratorStore()

  if (!isOpen) return null

  const isLocked = (k: LockKey) => locks[k]

  function applyGenerate(finalSeed: string, finalParams: typeof params) {
    const layers = generateCircle(finalParams, finalSeed)
    const current = useProjectStore.getState().project
    const newProject = { ...current, layers }
    useProjectStore.getState().setProject(newProject)
    useEditorStore.getState().clearSelection()
    useHistoryStore.getState().pushSnapshot(newProject)
  }

  function handleGenerate() {
    applyGenerate(seed, params)
    close()
  }

  function handleRegenerate() {
    randomizeUnlocked()
    // Read updated state from store after randomizeUnlocked
    const { seed: newSeed, params: newParams } = useGeneratorStore.getState()
    applyGenerate(newSeed, newParams)
    close()
  }

  function addColor() {
    if (params.colorPalette.length >= 5) return
    setParams({ colorPalette: [...params.colorPalette, '#ffffff'] })
  }

  function removeColor(idx: number) {
    if (params.colorPalette.length <= 1) return
    setParams({ colorPalette: params.colorPalette.filter((_, i) => i !== idx) })
  }

  function updateColor(idx: number, value: string) {
    const palette = [...params.colorPalette]
    palette[idx] = value
    setParams({ colorPalette: palette })
  }

  const complexityOptions: Complexity[] = ['low', 'medium', 'high']

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generator-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-[480px] rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="generator-modal-title" className="text-sm font-semibold text-neutral-100">
            Procedural Generator
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close generator"
            className="text-neutral-500 hover:text-neutral-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 rounded"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Seed ── */}
        <div>
          <SectionLabel>Seed</SectionLabel>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              aria-label="Generation seed"
              disabled={isLocked('seed')}
              placeholder="e.g. magic-circle"
              className="flex-1 px-2.5 py-1.5 text-[13px] rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <LockButton
              locked={isLocked('seed')}
              onToggle={() => toggleLock('seed')}
              label="seed"
            />
          </div>
        </div>

        {/* ── Rings ── */}
        <div>
          <SectionLabel>Rings</SectionLabel>
          <div className="flex flex-col gap-2">
            {/* Count */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400 w-28 shrink-0">Count</span>
              <NumberInput
                value={params.ringCount}
                onChange={(v) => setParams({ ringCount: Math.max(0, Math.min(10, Math.round(v))) })}
                min={0}
                max={10}
                label="Ring count"
                disabled={isLocked('ringCount')}
              />
              <div className="flex-1" />
              <LockButton
                locked={isLocked('ringCount')}
                onToggle={() => toggleLock('ringCount')}
                label="ring count"
              />
            </div>
            {/* Spacing */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400 w-28 shrink-0">Spacing</span>
              <NumberInput
                value={params.ringSpacingMin}
                onChange={(v) =>
                  setParams({
                    ringSpacingMin: Math.max(5, Math.round(v)),
                    ringSpacingMax: Math.max(Math.max(5, Math.round(v)), params.ringSpacingMax),
                  })
                }
                min={5}
                max={200}
                label="Ring spacing minimum"
                disabled={isLocked('ringSpacing')}
              />
              <span className="text-neutral-500 text-[13px]">—</span>
              <NumberInput
                value={params.ringSpacingMax}
                onChange={(v) =>
                  setParams({
                    ringSpacingMax: Math.max(params.ringSpacingMin, Math.max(5, Math.round(v))),
                  })
                }
                min={5}
                max={300}
                label="Ring spacing maximum"
                disabled={isLocked('ringSpacing')}
              />
              <div className="flex-1" />
              <LockButton
                locked={isLocked('ringSpacing')}
                onToggle={() => toggleLock('ringSpacing')}
                label="ring spacing"
              />
            </div>
            {/* Thickness */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400 w-28 shrink-0">Thickness</span>
              <NumberInput
                value={params.ringThicknessMin}
                onChange={(v) =>
                  setParams({
                    ringThicknessMin: Math.max(0.5, v),
                    ringThicknessMax: Math.max(Math.max(0.5, v), params.ringThicknessMax),
                  })
                }
                min={0.5}
                max={40}
                step={0.5}
                label="Ring thickness minimum"
                disabled={isLocked('ringThickness')}
              />
              <span className="text-neutral-500 text-[13px]">—</span>
              <NumberInput
                value={params.ringThicknessMax}
                onChange={(v) =>
                  setParams({
                    ringThicknessMax: Math.max(params.ringThicknessMin, Math.max(0.5, v)),
                  })
                }
                min={0.5}
                max={80}
                step={0.5}
                label="Ring thickness maximum"
                disabled={isLocked('ringThickness')}
              />
              <div className="flex-1" />
              <LockButton
                locked={isLocked('ringThickness')}
                onToggle={() => toggleLock('ringThickness')}
                label="ring thickness"
              />
            </div>
          </div>
        </div>

        {/* ── Radial Lines ── */}
        <div>
          <SectionLabel>Radial Lines</SectionLabel>
          <div className="flex flex-col gap-2">
            {/* Groups */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400 w-28 shrink-0">Groups</span>
              <NumberInput
                value={params.radialGroupCount}
                onChange={(v) =>
                  setParams({ radialGroupCount: Math.max(0, Math.min(8, Math.round(v))) })
                }
                min={0}
                max={8}
                label="Radial group count"
                disabled={isLocked('radialGroupCount')}
              />
              <div className="flex-1" />
              <LockButton
                locked={isLocked('radialGroupCount')}
                onToggle={() => toggleLock('radialGroupCount')}
                label="radial group count"
              />
            </div>
            {/* Line Count */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400 w-28 shrink-0">Line count</span>
              <NumberInput
                value={params.radialLineCountMin}
                onChange={(v) =>
                  setParams({
                    radialLineCountMin: Math.max(1, Math.round(v)),
                    radialLineCountMax: Math.max(
                      Math.max(1, Math.round(v)),
                      params.radialLineCountMax
                    ),
                  })
                }
                min={1}
                max={72}
                label="Radial line count minimum"
                disabled={isLocked('radialLineCount')}
              />
              <span className="text-neutral-500 text-[13px]">—</span>
              <NumberInput
                value={params.radialLineCountMax}
                onChange={(v) =>
                  setParams({
                    radialLineCountMax: Math.max(
                      params.radialLineCountMin,
                      Math.max(1, Math.round(v))
                    ),
                  })
                }
                min={1}
                max={144}
                label="Radial line count maximum"
                disabled={isLocked('radialLineCount')}
              />
              <div className="flex-1" />
              <LockButton
                locked={isLocked('radialLineCount')}
                onToggle={() => toggleLock('radialLineCount')}
                label="radial line count"
              />
            </div>
          </div>
        </div>

        {/* ── Color Palette ── */}
        <div>
          <SectionLabel>Color Palette</SectionLabel>
          <div className="flex items-center gap-2 flex-wrap">
            {params.colorPalette.map((c, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <label className="relative flex items-center">
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => updateColor(idx, e.target.value)}
                    aria-label={`Palette color ${idx + 1}`}
                    disabled={isLocked('colorPalette')}
                    className="w-8 h-8 rounded cursor-pointer border border-neutral-700 bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </label>
                {params.colorPalette.length > 1 && !isLocked('colorPalette') && (
                  <button
                    type="button"
                    onClick={() => removeColor(idx)}
                    aria-label={`Remove color ${idx + 1}`}
                    className="text-neutral-600 hover:text-neutral-400 text-[11px] leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {params.colorPalette.length < 5 && !isLocked('colorPalette') && (
              <button
                type="button"
                onClick={addColor}
                aria-label="Add palette color"
                className="w-8 h-8 rounded border border-dashed border-neutral-600 text-neutral-600 hover:border-neutral-400 hover:text-neutral-400 flex items-center justify-center text-[18px] leading-none transition-colors"
              >
                +
              </button>
            )}
            <div className="flex-1" />
            <LockButton
              locked={isLocked('colorPalette')}
              onToggle={() => toggleLock('colorPalette')}
              label="color palette"
            />
          </div>
        </div>

        {/* ── Complexity ── */}
        <div>
          <SectionLabel>Complexity</SectionLabel>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              {complexityOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => !isLocked('complexity') && setParams({ complexity: c })}
                  disabled={isLocked('complexity')}
                  aria-pressed={params.complexity === c}
                  className={[
                    'px-3 py-1 text-[13px] rounded border transition-colors capitalize',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    params.complexity === c
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
            <LockButton
              locked={isLocked('complexity')}
              onToggle={() => toggleLock('complexity')}
              label="complexity"
            />
          </div>
        </div>

        {/* ── Preview line ── */}
        <p className="text-[12px] text-neutral-500">
          Will generate {params.ringCount} ring{params.ringCount !== 1 ? 's' : ''} and{' '}
          {params.radialGroupCount} radial group{params.radialGroupCount !== 1 ? 's' : ''}
        </p>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-2 pt-1 border-t border-neutral-800">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 text-[13px] rounded text-neutral-300 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4 py-1.5 text-[13px] rounded bg-neutral-700 text-neutral-100 hover:bg-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-4 py-1.5 text-[13px] rounded bg-violet-600 text-white hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
