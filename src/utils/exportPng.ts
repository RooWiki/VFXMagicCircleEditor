/**
 * Browser-side SVG → PNG rasterization pipeline.
 *
 * Pipeline: SVG string → Blob → object URL → Image → Canvas → toBlob → download.
 * All temporary object URLs are revoked after use.
 * Throws on any failure so callers can show an error notification.
 */
export async function exportToPng(
  svgString: string,
  widthPx: number,
  heightPx: number,
  filename: string
): Promise<void> {
  // 1. SVG string → Blob → object URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    // 2. Load into HTMLImageElement
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to load SVG into image element.'))
      image.src = svgUrl
    })

    // 3. Draw to HTMLCanvasElement at the target resolution
    const canvas = document.createElement('canvas')
    canvas.width = widthPx
    canvas.height = heightPx
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not obtain 2D rendering context.')
    ctx.drawImage(img, 0, 0, widthPx, heightPx)

    // 4. Export PNG
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    if (!pngBlob) throw new Error('canvas.toBlob returned null.')

    // 5. Trigger browser download
    const pngUrl = URL.createObjectURL(pngBlob)
    try {
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      URL.revokeObjectURL(pngUrl)
    }
  } finally {
    // Always revoke the SVG object URL
    URL.revokeObjectURL(svgUrl)
  }
}
