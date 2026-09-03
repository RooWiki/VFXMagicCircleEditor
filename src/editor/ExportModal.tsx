import { useState } from 'react'
import { notify } from '../store/notifications'
import { useEditorStore } from '../store/editor'
import { useExportModalStore } from '../store/exportModal'
import { useProjectStore } from '../store/project'
import { buildExportSvgString, validateResolution } from '../utils/export'
import { exportToPng } from '../utils/exportPng'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [512, 1024, 2048, 4096] as const
type Preset = (typeof PRESETS)[number]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">{children}</p>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExportModal() {
  const { isOpen, close } = useExportModalStore()
  const project = useProjectStore((s) => s.project)
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds)

  // ── Local state ──────────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset | 'custom'>(1024)
  const [customRes, setCustomRes] = useState('1024')
  const [bgType, setBgType] = useState<'transparent' | 'color'>('transparent')
  const [bgColor, setBgColor] = useState('#000000')
  const [marginPercent, setMarginPercent] = useState(0)
  const [exportSelected, setExportSelected] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  // ── Derived state ────────────────────────────────────────────────────────────

  // Resolve actual pixel size
  const parsedCustom = preset === 'custom' ? Math.round(Number(customRes)) : (preset as number)
  const resolutionError = preset === 'custom' ? validateResolution(parsedCustom) : null
  const widthPx = resolutionError === null ? parsedCustom : 0
  const heightPx = widthPx

  // Determine if "Export selected layer only" is available
  const singleSelectedId = selectedLayerIds.length === 1 ? selectedLayerIds[0] : null
  const selectedLayer = singleSelectedId
    ? project.layers.find((l) => l.id === singleSelectedId)
    : undefined
  const canExportSelected = selectedLayer !== undefined && selectedLayer.visible

  const backgroundColor = bgType === 'color' ? bgColor : null

  const selectedLayerId = exportSelected && canExportSelected ? singleSelectedId : null

  const canExport = !isExporting && resolutionError === null && widthPx > 0

  // ── Filename ─────────────────────────────────────────────────────────────────

  function buildFilename(): string {
    const title =
      project.meta.title
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'untitled'
    const suffix = selectedLayerId ? `_layer_${widthPx}px` : `_${widthPx}px`
    return `${title}${suffix}.png`
  }

  // ── Export handler ────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!canExport) return
    setIsExporting(true)
    try {
      const svg = buildExportSvgString(project, {
        widthPx,
        heightPx,
        backgroundColor,
        marginPercent,
        selectedLayerId,
      })
      await exportToPng(svg, widthPx, heightPx, buildFilename())
      close()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed.'
      notify('error', `Export failed: ${msg}`)
    } finally {
      setIsExporting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-96 rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl p-5 flex flex-col gap-5">
        <h2 id="export-modal-title" className="text-sm font-semibold text-neutral-100">
          Export PNG
        </h2>

        {/* ── Resolution ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Resolution</SectionLabel>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={[
                  'px-3 py-1 text-[13px] rounded border transition-colors',
                  preset === p
                    ? 'bg-[var(--rw-active-bg)] border-[var(--rw-active-border)] text-[var(--rw-text-primary)]'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={[
                'px-3 py-1 text-[13px] rounded border transition-colors',
                preset === 'custom'
                  ? 'bg-[var(--rw-active-bg)] border-[var(--rw-active-border)] text-[var(--rw-text-primary)]'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600',
              ].join(' ')}
            >
              Custom
            </button>
          </div>
          {preset === 'custom' && (
            <div className="flex flex-col gap-1">
              <input
                type="number"
                value={customRes}
                onChange={(e) => setCustomRes(e.target.value)}
                min={1}
                max={4096}
                placeholder="e.g. 2048"
                aria-label="Custom resolution in pixels"
                className={[
                  'w-full px-2.5 py-1.5 text-[13px] rounded bg-neutral-800 border text-neutral-200',
                  'placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[var(--rw-focus)]',
                  resolutionError ? 'border-red-600' : 'border-neutral-700',
                ].join(' ')}
              />
              {resolutionError && <p className="text-[12px] text-red-400">{resolutionError}</p>}
              {!resolutionError && (
                <p className="text-[12px] text-neutral-500">
                  Square export — {parsedCustom} × {parsedCustom} px
                </p>
              )}
            </div>
          )}
          {preset !== 'custom' && (
            <p className="text-[12px] text-neutral-500">
              {preset} × {preset} px
            </p>
          )}
        </div>

        {/* ── Background ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Background</SectionLabel>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setBgType('transparent')}
              className={[
                'px-3 py-1 text-[13px] rounded border transition-colors',
                bgType === 'transparent'
                  ? 'bg-[var(--rw-active-bg)] border-[var(--rw-active-border)] text-[var(--rw-text-primary)]'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600',
              ].join(' ')}
            >
              Transparent
            </button>
            <button
              type="button"
              onClick={() => setBgType('color')}
              className={[
                'px-3 py-1 text-[13px] rounded border transition-colors',
                bgType === 'color'
                  ? 'bg-[var(--rw-active-bg)] border-[var(--rw-active-border)] text-[var(--rw-text-primary)]'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600',
              ].join(' ')}
            >
              Color
            </button>
            {bgType === 'color' && (
              <label className="flex items-center gap-1.5 cursor-pointer ml-1">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  aria-label="Background color"
                  className="w-7 h-7 rounded cursor-pointer border border-neutral-700 bg-neutral-800"
                />
                <span className="text-[13px] text-neutral-300">{bgColor}</span>
              </label>
            )}
          </div>
        </div>

        {/* ── Margin ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Margin</SectionLabel>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={marginPercent}
              onChange={(e) => setMarginPercent(Number(e.target.value))}
              aria-label="Export margin percentage"
              className="flex-1 accent-neutral-400"
            />
            <span className="text-[13px] text-neutral-300 w-8 text-right tabular-nums">
              {marginPercent}%
            </span>
          </div>
        </div>

        {/* ── Layer scope ── */}
        {canExportSelected && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Layer Scope</SectionLabel>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exportSelected}
                onChange={(e) => setExportSelected(e.target.checked)}
                className="accent-neutral-400 w-3.5 h-3.5"
              />
              <span className="text-[13px] text-neutral-200">
                Export selected layer only
                {selectedLayer ? (
                  <span className="text-neutral-500 ml-1">({selectedLayer.name})</span>
                ) : null}
              </span>
            </label>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            disabled={isExporting}
            className="px-3 py-1.5 text-[13px] rounded text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rw-focus)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={!canExport}
            className="px-4 py-1.5 text-[13px] rounded bg-[var(--rw-text-primary)] text-[var(--rw-bg-panel)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rw-focus)]"
          >
            {isExporting ? 'Exporting…' : 'Export PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
