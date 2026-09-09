import { useEffect, useState } from 'react'
import { artworkRadius } from '../../utils/layerTree'
import type { Layer } from '../../types/layer'

/** Cache expensive group effects once per edit; use the bitmap only during navigation. */
export function useNavigationPreview(layer: Layer, markup: string) {
  const [cache, setCache] = useState<{ markup: string; url: string; extent: number } | null>(null)
  const expensive =
    layer.type === 'group' &&
    !!(layer.outlineWidth || layer.glowBlur || layer.shadowBlur || layer.shadowX || layer.shadowY)
  const extent = expensive ? artworkRadius(layer) : 0
  useEffect(() => {
    if (!expensive) return
    let cancelled = false
    const size = 1536
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-extent} ${-extent} ${extent * 2} ${extent * 2}">${markup}</svg>`
    const sourceUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }))
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl)
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) return
        context.drawImage(image, 0, 0)
        canvas.toBlob((blob) => {
          if (cancelled || !blob) return
          setCache({ markup, url: URL.createObjectURL(blob), extent })
        })
      } catch {
        /* Keep vector rendering if this browser cannot rasterize the SVG. */
      }
    }
    image.onerror = () => URL.revokeObjectURL(sourceUrl)
    image.src = sourceUrl
    return () => {
      cancelled = true
      URL.revokeObjectURL(sourceUrl)
    }
  }, [expensive, extent, markup])
  useEffect(
    () => () => {
      if (cache) URL.revokeObjectURL(cache.url)
    },
    [cache]
  )
  return expensive && cache?.markup === markup ? cache : null
}
