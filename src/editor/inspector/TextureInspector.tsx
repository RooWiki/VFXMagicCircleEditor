import { useId, useMemo } from 'react'
import { TEXTURE_IDS, TEXTURE_LABELS } from '../../utils/textureCatalog'
import { applyLineTexture } from '../../utils/lineTexture'
import { useProjectStore } from '../../store/project'
import { commitAction } from './inspectorActions'
import type { Layer, RadialLinesLayer } from '../../types/layer'
import { ArtworkNumber, ArtworkSelect } from './FinishInspector'
import { SectionHeading } from './shared'

export default function TextureInspector({ layer }: { layer: Layer }) {
  const prefix = useId().replace(/:/g, '')
  const supportsThorns = layer.type === 'ring' || layer.type === 'radial-lines'
  const previews = useMemo(
    () =>
      TEXTURE_IDS.filter((id) => id !== 'thorns' || supportsThorns).map((id) => {
        const sample: RadialLinesLayer = {
          id: 'preview',
          name: 'Preview',
          type: 'radial-lines',
          visible: true,
          locked: false,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1,
          count: 1,
          innerRadius: 0,
          outerRadius: 100,
          startAngle: 90,
          color: '#a5f3fc',
          strokeWidth: 10,
          lineTexture: id,
          textureAmount: 100,
          textureScale: 6,
          textureSeed: 3,
        }
        return {
          id,
          html: applyLineTexture(
            sample,
            '<path d="M 0 0 L 100 0" stroke="#a5f3fc" stroke-width="10" fill="none" />',
            `${prefix}-${id}`
          ),
        }
      }),
    [prefix, supportsThorns]
  )
  return (
    <section>
      <SectionHeading>Line texture</SectionHeading>
      <div className="px-3 pb-3 flex flex-col gap-2">
        <ArtworkSelect
          layer={layer}
          field="lineTexture"
          label="Texture"
          value={layer.lineTexture ?? 'solid'}
          options={previews.map(({ id }) => [id, TEXTURE_LABELS[id]])}
        />
        <div className="grid grid-cols-2 gap-1.5" aria-label="Texture previews">
          {previews.map(({ id, html }) => (
            <button
              key={id}
              type="button"
              aria-label={`Use ${TEXTURE_LABELS[id]} texture`}
              aria-pressed={(layer.lineTexture ?? 'solid') === id}
              className="rounded border p-1 text-[10px] focus-visible:outline-2"
              style={{
                borderColor:
                  (layer.lineTexture ?? 'solid') === id
                    ? 'var(--rw-active-border)'
                    : 'var(--rw-border-default)',
                background:
                  (layer.lineTexture ?? 'solid') === id
                    ? 'var(--rw-active-bg)'
                    : 'var(--rw-bg-control)',
              }}
              onClick={() =>
                commitAction(() =>
                  useProjectStore.getState().updateLayer(layer.id, { lineTexture: id })
                )
              }
            >
              <svg
                viewBox="-5 -24 110 48"
                className="w-full h-10 rounded"
                style={{ background: '#15191e' }}
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <span>{TEXTURE_LABELS[id]}</span>
            </button>
          ))}
        </div>
        {layer.lineTexture && layer.lineTexture !== 'solid' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ArtworkNumber
                layer={layer}
                field="textureAmount"
                label="Texture strength"
                value={layer.textureAmount ?? 75}
                min={0}
                max={100}
              />
              <ArtworkNumber
                layer={layer}
                field="textureScale"
                label="Texture scale"
                value={layer.textureScale ?? 6}
                min={1}
                max={80}
                step={0.5}
              />
            </div>
            <ArtworkNumber
              layer={layer}
              field="textureSeed"
              label="Texture seed"
              value={layer.textureSeed ?? 1}
              min={0}
              max={9999}
            />
            <p className="text-[10px] leading-relaxed">
              {layer.lineTexture === 'thorns'
                ? 'Spikes follow the stroke. Strength controls their height; Scale controls spacing. Seed varies their shape.'
                : 'Breaks up the ink while keeping its color and transparency. Increase thickness to reveal fine detail. The same seed keeps the pattern stable.'}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
