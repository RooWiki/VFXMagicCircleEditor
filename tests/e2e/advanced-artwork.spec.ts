import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({ viewport: { width: 1440, height: 1000 } })

async function exportPixels(page: Page, kind: 'cutout' | 'effects' | 'text' | 'symbol' | 'group') {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (kind) => {
    const factoriesPath = '/circleeditor/src/utils/factories.ts'
    const exporterPath = '/circleeditor/src/utils/export.ts'
    const pngPath = '/circleeditor/src/utils/exportPng.ts'
    const sanitizePath = '/circleeditor/src/utils/sanitizeSvg.ts'
    const f = await import(factoriesPath)
    const { buildExportSvgString } = await import(exporterPath)
    const { exportToPng } = await import(pngPath)
    const { sanitizeSvg } = await import(sanitizePath)
    const project = f.createDefaultProject()
    project.canvas = { width: 256, height: 256 }
    if (kind === 'cutout')
      project.layers = [
        f.createRingLayer({ radius: 100, fill: '#ff0000', color: '#ff0000' }),
        f.createRingLayer({ radius: 50, knockout: true, color: '#ffffff' }),
      ]
    if (kind === 'effects')
      project.layers = [
        f.createRingLayer({
          radius: 30,
          strokeWidth: 4,
          color: '#ff0000',
          outlineWidth: 5,
          outlineColor: '#0000ff',
          glowBlur: 6,
          glowColor: '#00ff00',
          shadowX: 25,
          shadowY: 0,
          shadowBlur: 2,
          shadowColor: '#ffffff',
        }),
      ]
    if (kind === 'text')
      project.layers = [
        {
          ...f.createTextLayer(),
          radius: 60,
          fontSize: 18,
          text: 'SOL LUNA STELLA',
          color: '#ff0000',
        },
      ]
    if (kind === 'symbol')
      project.layers = [
        {
          ...f.createSymbolLayer(),
          radius: 50,
          symbol: 'custom',
          color: '#ff0000',
          fill: '#ff0000',
          customSvg: sanitizeSvg(
            '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>'
          ),
        },
      ]
    if (kind === 'group') {
      const group = f.createGroupLayer([
        f.createRingLayer({ radius: 20, knockout: true, color: '#ffffff' }),
      ])
      group.repeatCount = 2
      group.repeatRadius = 60
      project.layers = [
        f.createRingLayer({ radius: 100, fill: '#ff0000', color: '#ff0000' }),
        group,
      ]
    }
    await exportToPng(
      buildExportSvgString(project, {
        widthPx: 256,
        heightPx: 256,
        backgroundColor: null,
        marginPercent: 0,
        selectedLayerId: null,
      }),
      256,
      256,
      `${kind}.png`
    )
  }, kind)
  const download = await downloadPromise
  const path = await download.path()
  const bytes = await readFile(path!)
  return page.evaluate(
    async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data
      let painted = 0
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted++
      return {
        width: image.width,
        height: image.height,
        center: pixel(128, 128),
        outside: pixel(218, 128),
        top: pixel(128, 68),
        bottom: pixel(128, 188),
        outline: pixel(162, 128),
        glow: pixel(128, 87),
        shadow: pixel(184, 128),
        painted,
      }
    },
    `data:image/png;base64,${bytes.toString('base64')}`
  )
}

test('new artwork tools expose editable geometry and text controls', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Star / Polygon', exact: true }).click()
  await page.getByLabel('Points / sides').fill('7')
  await page.getByLabel('Points / sides').press('Tab')
  const star = page.locator('[data-testid^="shape-layer-"] polygon')
  await expect(star).toHaveAttribute('points', /.+/)
  expect((await star.getAttribute('points'))!.split(' ')).toHaveLength(14)
  await page.getByLabel('Shape', { exact: true }).selectOption('polygon')
  expect((await star.getAttribute('points'))!.split(' ')).toHaveLength(7)
  await page.getByLabel('Shape', { exact: true }).selectOption('star')
  await page.getByLabel('Star style').selectOption('interlaced')
  await expect(page.locator('[data-testid^="shape-layer-"] path')).toHaveAttribute('d', /M.*L.*Z/)
  await page.getByLabel('Vertex step').fill('3')
  await page.getByLabel('Vertex step').press('Tab')
  await page.getByRole('button', { name: 'Add Circular Text', exact: true }).click()
  await page.getByLabel('Text', { exact: true }).fill('LUNA & SOL')
  await page.getByLabel('Direction', { exact: true }).selectOption('counterclockwise')
  await expect(page.locator('textPath')).toHaveText('LUNA & SOL')
  await page.getByLabel('Fit text to circle').check()
  await expect(page.locator('textPath')).toHaveAttribute('lengthAdjust', 'spacingAndGlyphs')
  await page.getByLabel('Font', { exact: true }).selectOption('monospace')
  await page.getByLabel('Font size', { exact: true }).fill('40')
  await page.getByLabel('Font size', { exact: true }).press('Tab')
  await expect(page.locator('[data-testid^="circular-text-layer-"] text')).toHaveAttribute(
    'font-size',
    '40'
  )
})

test('SVG symbol import strips active content and can be saved and restored', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Symbol', exact: true }).click()
  await page.getByLabel('Import SVG symbol', { exact: true }).setInputFiles({
    name: 'symbol.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg viewBox="0 0 100 100" onload="alert(1)"><script>alert(1)</script><path d="M10 90 L50 10 L90 90 Z"/></svg>'
    ),
  })
  await expect(page.getByLabel('Symbol', { exact: true })).toHaveValue('custom')
  await expect(page.locator('[data-testid^="symbol-layer-"] path')).toHaveCount(1)
  await expect(page.locator('[data-testid^="symbol-layer-"] script')).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() => Object.values(localStorage).some((value) => value.includes('customSvg')))
    )
    .toBe(true)
  await page.reload()
  await expect(page.locator('[data-testid^="symbol-layer-"] path')).toHaveCount(1)
})

test('groups selected artwork, repeats it and updates all copies through member editing', async ({
  page,
}) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ring', exact: true }).click()
  await page.getByLabel('Radius', { exact: true }).fill('50')
  await page.getByLabel('Radius', { exact: true }).press('Tab')
  await page.getByRole('button', { name: 'Add Symbol', exact: true }).click()
  await page
    .getByRole('button', { name: 'Select layer Ring', exact: true })
    .click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Group selected layers', exact: true }).click()
  await page.getByLabel('Copies', { exact: true }).fill('5')
  await page.getByLabel('Copies', { exact: true }).press('Tab')
  const group = page.locator('[data-testid^="group-layer-"]')
  await expect(group.locator('circle')).toHaveCount(5)
  await page.getByRole('button', { name: 'Ring', exact: true }).click()
  await page.getByLabel('Radius', { exact: true }).fill('60')
  await page.getByLabel('Radius', { exact: true }).press('Tab')
  await expect(group.locator('circle[r="60"]')).toHaveCount(5)
  await page.getByRole('button', { name: 'Back to group', exact: true }).click()
  await page.getByLabel('Copy orientation', { exact: true }).selectOption('radial')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.values(localStorage).some((value) => value.includes('"orientation":"radial"'))
      )
    )
    .toBe(true)
  await page.reload()
  await expect(group.locator('circle[r="60"]')).toHaveCount(5)
})

test('PNG export preserves true cutouts, repeated cutouts, text, imported symbols and effects', async ({
  page,
}) => {
  await page.goto('')
  const cutout = await exportPixels(page, 'cutout')
  expect(cutout.width).toBe(256)
  expect(cutout.center[3]).toBe(0)
  expect(cutout.outside).toEqual([255, 0, 0, 255])
  const group = await exportPixels(page, 'group')
  expect(group.top[3]).toBe(0)
  expect(group.bottom[3]).toBe(0)
  expect(group.center).toEqual([255, 0, 0, 255])
  const effects = await exportPixels(page, 'effects')
  expect(effects.outline[2]).toBeGreaterThan(150)
  expect(effects.glow[1]).toBeGreaterThan(0)
  expect(effects.glow[3]).toBeGreaterThan(0)
  expect(effects.shadow[3]).toBeGreaterThan(100)
  const text = await exportPixels(page, 'text')
  expect(text.painted).toBeGreaterThan(100)
  const symbol = await exportPixels(page, 'symbol')
  expect(symbol.center).toEqual([255, 0, 0, 255])
})

test('editable example renders, saves and exports', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ornamental Seal', exact: true }).click()
  await expect(page.locator('textPath')).toHaveCount(2)
  await expect(page.locator('[data-testid^="group-layer-"] polygon')).toHaveCount(1)
  await page.getByRole('button', { name: 'Five medallions', exact: true }).click()
  await expect(page.getByLabel('Copies', { exact: true })).toHaveValue('5')
  await page.getByRole('button', { name: 'Back to group', exact: true }).click()
  await page.screenshot({ path: '/tmp/ornamental-seal-editor.png' })
  const path = '/circleeditor/src/store/project.ts'
  const project = await page.evaluate(async (path) => {
    const { useProjectStore } = await import(path)
    return useProjectStore.getState().project
  }, path)
  expect(project.layers[0].children.length).toBeGreaterThan(10)
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async () => {
    const ioPath = '/circleeditor/src/persistence/projectIO.ts'
    const { downloadProject } = await import(ioPath)
    downloadProject()
  })
  await (await downloadPromise).saveAs('/tmp/ornamental-seal.mce.json')
})

test('advanced artwork transforms and finish controls support undo', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Star / Polygon', exact: true }).click()
  const artwork = page.locator('[data-testid^="shape-layer-"]')
  await page.getByLabel('X', { exact: true }).fill('80')
  await page.getByLabel('X', { exact: true }).press('Tab')
  await expect(artwork).toHaveAttribute('transform', /translate\(80, 0\)/)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(artwork).toHaveAttribute('transform', /translate\(0, 0\)/)
  await page.getByLabel('Rotation', { exact: true }).fill('45')
  await page.getByLabel('Rotation', { exact: true }).press('Tab')
  await expect(artwork).toHaveAttribute('transform', /rotate\(45\)/)
  await page.getByLabel('Scale X', { exact: true }).fill('1.5')
  await page.getByLabel('Scale X', { exact: true }).press('Tab')
  await expect(artwork).toHaveAttribute('transform', /scale\(1.5, 1\)/)
  await page.getByLabel('Solid fill', { exact: true }).check()
  await expect(artwork.locator('polygon')).toHaveAttribute('fill', '#1c1c1e')
  await page.getByLabel('Glow', { exact: true }).fill('4')
  await page.getByLabel('Glow', { exact: true }).press('Tab')
  await expect(artwork.locator('feGaussianBlur')).toHaveAttribute('stdDeviation', '4')
  const handle = page.getByTestId('move-target')
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  await expect(artwork).not.toHaveAttribute('transform', /translate\(0, 0\)/)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(artwork).toHaveAttribute('transform', /translate\(0, 0\)/)
})
