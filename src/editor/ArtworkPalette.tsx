import { useState } from 'react'
import { useProjectStore } from '../store/project'
import { recolorArtwork, mapArtworkColors, adjustColor } from '../utils/artworkColor'
import ColorField from './inspector/ColorField'
import { commitAction, controlStyle } from './inspector/inspectorActions'

export default function ArtworkPalette() {
  const [color, setColor] = useState('#a78bfa')
  const [adjustments, setAdjustments] = useState({ hue: 0, saturation: 0, lightness: 0 })
  const layers = useProjectStore((s) => s.project.layers)
  const apply = (value: string, grayscale = false) =>
    commitAction(() => {
      const { project, setProject } = useProjectStore.getState()
      setProject({ ...project, layers: recolorArtwork(project.layers, value, grayscale) })
    })
  return (
    <details
      className="border-t px-3 py-3"
      style={{ borderColor: 'var(--rw-border-default)', color: 'var(--rw-text-secondary)' }}
      open
    >
      <summary className="text-xs font-semibold cursor-pointer">Color adjustments</summary>
      <div className="mt-3 flex flex-col gap-2">
        {(['hue', 'saturation', 'lightness'] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-[10px]">
            <span className="flex justify-between">
              <span>
                {key === 'hue' ? 'Hue' : key === 'saturation' ? 'Saturation' : 'Lightness'}
              </span>
              <span>
                {adjustments[key]}
                {key === 'hue' ? '°' : '%'}
              </span>
            </span>
            <input
              type="range"
              aria-label={`Adjust ${key}`}
              min={key === 'hue' ? -180 : -100}
              max={key === 'hue' ? 180 : 100}
              value={adjustments[key]}
              onChange={(event) =>
                setAdjustments({ ...adjustments, [key]: Number(event.target.value) })
              }
              className="w-full accent-[var(--rw-active-border)]"
            />
          </label>
        ))}
        <div className="flex gap-1">
          <button
            type="button"
            style={controlStyle}
            className="flex-1 rounded py-1.5 text-xs disabled:opacity-40"
            disabled={!layers.length || !Object.values(adjustments).some(Boolean)}
            onClick={() => {
              commitAction(() => {
                const { project, setProject } = useProjectStore.getState()
                setProject({
                  ...project,
                  layers: mapArtworkColors(project.layers, (value) =>
                    adjustColor(
                      value,
                      adjustments.hue,
                      adjustments.saturation,
                      adjustments.lightness
                    )
                  ),
                })
              })
              setAdjustments({ hue: 0, saturation: 0, lightness: 0 })
            }}
          >
            Apply adjustments
          </button>
          <button
            type="button"
            style={controlStyle}
            className="rounded px-2 text-xs"
            aria-label="Reset color adjustments"
            onClick={() => setAdjustments({ hue: 0, saturation: 0, lightness: 0 })}
          >
            Reset
          </button>
        </div>
        <p className="text-[10px] leading-relaxed">
          Adjust all unlocked layers and effects. Apply to update the artwork; Undo restores it.
        </p>
        <ColorField label="VFX tint" value={color} onChange={setColor} />
        <button
          type="button"
          disabled={!layers.length}
          onClick={() => apply(color)}
          style={controlStyle}
          className="rounded py-1.5 text-xs disabled:opacity-40"
        >
          Apply color to circle
        </button>
        <div className="grid grid-cols-3 gap-1">
          {(['White', 'Black', 'Grayscale'] as const).map((label) => (
            <button
              key={label}
              type="button"
              disabled={!layers.length}
              onClick={() =>
                apply(label === 'Black' ? '#000000' : '#ffffff', label === 'Grayscale')
              }
              style={controlStyle}
              className="rounded py-1.5 text-xs disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] leading-relaxed">
          Tint replaces the palette. White creates a VFX mask for export on black or transparency.
        </p>
      </div>
    </details>
  )
}
