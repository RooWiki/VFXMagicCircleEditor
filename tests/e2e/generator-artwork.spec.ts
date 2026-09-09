import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 1000 } })

test('ornamental zoom reuses artwork and restores sharp vectors after navigation', async ({
  page,
}) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ornamental Seal', exact: true }).click()
  const group = page.locator('[data-testid^="group-layer-"]')
  await expect(group).toHaveAttribute('data-preview-ready', 'true')
  const mutations = await page.evaluate(async () => {
    let count = 0
    const observer = new MutationObserver((records) => {
      count += records.length
    })
    observer.observe(document.querySelector('#artwork')!, {
      subtree: true,
      childList: true,
      attributes: true,
    })
    const path = '/circleeditor/src/store/viewport.ts'
    const { useViewportStore } = await import(path)
    for (let i = 0; i < 5; i++) {
      useViewportStore.getState().zoomAtPoint(1 + i * 0.2, 400, 400)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    observer.disconnect()
    return count
  })
  expect(mutations).toBe(0)
  await page
    .getByTestId('svg-viewport')
    .dispatchEvent('wheel', { deltaY: -50, clientX: 600, clientY: 400 })
  await expect(group.locator('[data-navigation-preview]')).toHaveCount(1)
  await expect(group.locator('textPath')).toHaveCount(2)
  await expect(group.locator('[data-navigation-preview]')).toHaveCount(0)
})

test('styles generate rich editable compositions and repeated append keeps every ID unique', async ({
  page,
}) => {
  await page.goto('')
  for (const designStyle of ['arcane', 'celestial', 'mechanical']) {
    await page.evaluate(async (designStyle) => {
      const path = '/circleeditor/src/store/generatorStore.ts'
      const { useGeneratorStore } = await import(path)
      useGeneratorStore.getState().setSeed('astral-gate')
      useGeneratorStore
        .getState()
        .setParams({ designStyle, complexity: 'high', ringCount: 4, symmetry: 6 })
    }, designStyle)
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await page.getByRole('button', { name: 'Generate', exact: true }).last().click()
    await expect(page.locator('[data-testid^="shape-layer-"]')).toHaveCount(2)
    await expect(page.locator('textPath')).toHaveCount(1)
    await expect(page.locator('[data-testid^="group-layer-"]')).toHaveCount(2)
    await page.screenshot({ path: `/tmp/circle-generator-${designStyle}.png` })
  }
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await page.getByLabel('Apply result').selectOption('append')
    await page.getByRole('button', { name: 'Generate', exact: true }).last().click()
  }
  const valid = await page.evaluate(async () => {
    const storePath = '/circleeditor/src/store/project.ts'
    const schemaPath = '/circleeditor/src/schema/project.ts'
    const { useProjectStore } = await import(storePath)
    const { parseProjectFileStrict } = await import(schemaPath)
    return parseProjectFileStrict(useProjectStore.getState().project).ok
  })
  expect(valid).toBe(true)
})
