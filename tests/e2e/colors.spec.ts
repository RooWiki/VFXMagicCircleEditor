import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 1000 } })
test('VFX colors update artwork, undo and survive reload', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ring', exact: true }).click()
  await page.getByRole('button', { name: 'Color: Plasma', exact: true }).click()
  const circle = page.locator('[data-testid^="ring-layer-"] circle').first()
  await expect(circle).toHaveAttribute('stroke', '#22d3ee')
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await expect(circle).toHaveAttribute('stroke', '#ffffff')
  await page.keyboard.press('Control+z')
  await expect(circle).toHaveAttribute('stroke', '#22d3ee')
  const hex = page.getByLabel('Color hex value', { exact: true })
  await hex.fill('f80')
  await hex.press('Enter')
  await expect(circle).toHaveAttribute('stroke', '#ff8800')
  await page.getByRole('button', { name: 'Black', exact: true }).click()
  await expect(circle).toHaveAttribute('stroke', '#000000')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          localStorage.getItem('magic-circle-editor:autosave')?.includes('"color":"#000000"') ??
          false
      )
    )
    .toBe(true)
  await page.reload()
  await expect(circle).toHaveAttribute('stroke', '#000000')
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.screenshot({ path: '/tmp/circle-colors.png' })
})

test('left color adjustment tool changes palette and supports undo', async ({ page }) => {
  await page.goto('')
  const left = page.getByRole('complementary', { name: 'Layers', exact: true })
  await expect(left.getByText('Color adjustments', { exact: true })).toBeVisible()
  await expect(
    page.getByTestId('panel-properties').getByText('Color adjustments', { exact: true })
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Add Ring', exact: true }).click()
  await page.getByLabel('Color hex value', { exact: true }).fill('#ff0000')
  await page.getByLabel('Color hex value', { exact: true }).press('Enter')
  await left.getByLabel('Adjust hue', { exact: true }).fill('120')
  await left.getByRole('button', { name: 'Apply adjustments', exact: true }).click()
  const circle = page.locator('[data-testid^="ring-layer-"] circle').first()
  await expect(circle).toHaveAttribute('stroke', '#00ff00')
  await expect(left.getByLabel('Adjust hue', { exact: true })).toHaveValue('0')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(circle).toHaveAttribute('stroke', '#ff0000')
  await page.screenshot({ path: '/tmp/circle-left-color-adjustments.png' })
})
