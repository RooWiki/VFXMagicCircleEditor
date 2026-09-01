import { useEffect, useRef, useState } from 'react'

// ─── NumericField ─────────────────────────────────────────────────────────────

export interface NumericFieldProps {
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

export function NumericField({
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

// ─── SectionHeading ───────────────────────────────────────────────────────────

export function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest px-3 pt-3 pb-1">
      {children}
    </h3>
  )
}
