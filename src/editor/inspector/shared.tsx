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
      <span
        className="text-[10px] uppercase tracking-wide"
        style={{ color: 'var(--rw-text-tertiary)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={draft}
          step={step}
          min={min}
          max={max}
          aria-label={label}
          onFocus={(e) => {
            focusedRef.current = true
            e.currentTarget.style.borderColor = 'var(--rw-active-border)'
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
            e.currentTarget.style.borderColor = 'var(--rw-border-default)'
            commit(e.target.value)
            onCommitEdit?.()
          }}
          className="w-full rounded px-2 py-1 text-xs tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          style={{
            background: 'var(--rw-bg-control)',
            border: '1px solid var(--rw-border-default)',
            color: 'var(--rw-text-primary)',
          }}
        />
        {unit && (
          <span className="text-[10px] shrink-0" style={{ color: 'var(--rw-text-tertiary)' }}>
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

export function SectionHeading({ children }: { children: string }) {
  return (
    <h3
      className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-3 pb-1"
      style={{ color: 'var(--rw-text-tertiary)' }}
    >
      {children}
    </h3>
  )
}
