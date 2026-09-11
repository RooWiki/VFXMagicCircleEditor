import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 1000 } })

async function exportPixels(page: Page) {
  return page.evaluate(async () => {
    const projectPath = '/circleeditor/src/store/project.ts'
    const exportPath = '/circleeditor/src/utils/export.ts'
    const { useProjectStore } = await import(projectPath)
    const { buildExportSvgString } = await import(exportPath)
    const svg = buildExportSvgString(useProjectStore.getState().project, {
      widthPx: 512,
      heightPx: 512,
      backgroundColor: null,
      marginPercent: 0,
      selectedLayerId: null,
    })
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 512
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, 512, 512).data
      const sectors = Array<number>(8).fill(0)
      let alpha = 0,
        painted = 0,
        tinted = 0
      for (let i = 0; i < pixels.length; i += 4) {
        alpha += pixels[i + 3]
        const pixel = i / 4
        const angle = Math.atan2(Math.floor(pixel / 512) - 255.5, (pixel % 512) - 255.5) + Math.PI
        sectors[Math.min(7, Math.floor((angle / (2 * Math.PI)) * 8))] += pixels[i + 3]
        if (pixels[i + 3] > 30) {
          painted++
          if (pixels[i + 2] > pixels[i] && pixels[i + 1] > pixels[i]) tinted++
        }
      }
      return { alpha, painted, tinted, sectors, corner: pixels[3], png: canvas.toDataURL() }
    } finally {
      URL.revokeObjectURL(url)
    }
  })
}

for (const tool of ['Add Ring', 'Add Radial Lines']) {
  test(`${tool}: textures export transparent colored patterns, undo and persist`, async ({
    page,
  }) => {
    await page.goto('')
    await page.getByRole('button', { name: tool, exact: true }).click()
    await page.getByLabel('Thickness', { exact: true }).fill('24')
    await page.getByLabel('Thickness', { exact: true }).press('Enter')
    await page.getByRole('button', { name: 'Color: Plasma', exact: true }).click()
    const solid = await exportPixels(page)
    const texture = page.getByLabel('Texture', { exact: true })
    for (const name of [
      'grain',
      'worn',
      'fibers',
      'hatching',
      'crosshatch',
      'dots',
      'scales',
      'cracks',
    ]) {
      await texture.selectOption(name)
      const pixels = await exportPixels(page)
      expect(pixels.alpha, name).toBeLessThan(solid.alpha * 0.95)
      expect(pixels.painted).toBeGreaterThan(100)
      expect(pixels.tinted).toBe(pixels.painted)
      expect(pixels.corner).toBe(0)
      expect((await exportPixels(page)).png).toBe(pixels.png)
      await expect(
        page.locator('[data-layer-id] [filter], [data-layer-id] [mask]').first()
      ).toBeAttached()
    }
    await expect(page.getByRole('button', { name: /^Use .* texture$/ })).toHaveCount(10)
    await page.getByRole('button', { name: 'Use Thorns texture', exact: true }).click()
    await expect(texture).toHaveValue('thorns')
    await expect(page.locator('#artwork [data-thorns]')).toHaveCount(1)
    const thorns = await exportPixels(page)
    expect(thorns.alpha).toBeGreaterThan(solid.alpha)
    expect(thorns.corner).toBe(0)
    expect(thorns.tinted).toBe(thorns.painted)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(texture).toHaveValue('cracks')
    await page.getByRole('button', { name: 'Use Thorns texture', exact: true }).click()
    await page.getByLabel('Texture seed', { exact: true }).fill('42')
    await page.getByLabel('Texture seed', { exact: true }).press('Tab')
    const before = await exportPixels(page)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            localStorage.getItem('magic-circle-editor:autosave')?.includes('"textureSeed":42') ??
            false
        )
      )
      .toBe(true)
    await page.reload()
    expect((await exportPixels(page)).png).toBe(before.png)
  })
}

test('thin hatching follows the ring uniformly at every angle', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ring', exact: true }).click()
  await page.getByLabel('Thickness', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Use Hatching texture', exact: true }).click()
  await page.getByLabel('Texture strength', { exact: true }).fill('100')
  await page.getByLabel('Texture scale', { exact: true }).fill('12')
  await page.getByLabel('Texture scale', { exact: true }).press('Tab')
  const pixels = await exportPixels(page)
  expect(Math.min(...pixels.sectors) / Math.max(...pixels.sectors)).toBeGreaterThan(0.85)
  await page.getByLabel('Texture', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/circle-following-hatching.png' })
})
