import { useState } from 'react'
import { controlStyle } from './inspectorActions'

const VFX_COLORS = [
  ['White', '#ffffff'],
  ['Black', '#000000'],
  ['Arcane', '#a78bfa'],
  ['Plasma', '#22d3ee'],
  ['Frost', '#93c5fd'],
  ['Fire', '#fb923c'],
  ['Gold', '#facc15'],
  ['Venom', '#4ade80'],
  ['Crimson', '#f43f5e'],
] as const

function normalizeHex(raw: string): string | null {
  const hex = raw.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex))
    return (
      '#' +
      [...hex]
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    )
  return /^[\da-f]{6}$/i.test(hex) ? '#' + hex.toLowerCase() : null
}

export default function ColorField({
  label = 'Color',
  value,
  onChange,
  onBeginEdit,
  onCommitEdit,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  onBeginEdit?: () => void
  onCommitEdit?: () => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const apply = (color: string) => {
    onBeginEdit?.()
    onChange(color)
    onCommitEdit?.()
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-wide"
        style={{ color: 'var(--rw-text-tertiary)' }}
      >
        {label}
      </span>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={label}
          value={normalizeHex(value) ?? '#ffffff'}
          className="w-9 h-8 rounded cursor-pointer"
          style={controlStyle}
          onFocus={onBeginEdit}
          onBlur={onCommitEdit}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          aria-label={`${label} hex value`}
          value={draft ?? value}
          spellCheck={false}
          className="min-w-0 w-full rounded px-2 text-xs font-mono"
          style={controlStyle}
          onFocus={() => {
            setDraft(value)
            onBeginEdit?.()
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            if (/^#?[\da-f]{6}$/i.test(e.target.value)) onChange(normalizeHex(e.target.value)!)
          }}
          onBlur={() => {
            const color = normalizeHex(draft ?? value)
            if (color) onChange(color)
            setDraft(null)
            onCommitEdit?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1" aria-label={`${label} swatches`}>
        {VFX_COLORS.map(([name, color]) => (
          <button
            key={name}
            type="button"
            title={`${name} ${color}`}
            aria-label={`${label}: ${name}`}
            aria-pressed={value.toLowerCase() === color}
            className="w-5 h-5 rounded border focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: color,
              borderColor: value.toLowerCase() === color ? 'var(--rw-text-primary)' : '#666',
            }}
            onClick={() => apply(color)}
          />
        ))}
      </div>
    </div>
  )
}
