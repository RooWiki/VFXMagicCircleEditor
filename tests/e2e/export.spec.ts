import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('Export button is enabled', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('button', { name: 'Export' })).not.toBeDisabled()
})

test('clicking Export opens the export modal', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('dialog', { name: 'Export PNG' })).toBeVisible()
})

test('export modal contains resolution presets', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('button', { name: '512' })).toBeVisible()
  await expect(page.getByRole('button', { name: '1024' })).toBeVisible()
  await expect(page.getByRole('button', { name: '2048' })).toBeVisible()
  await expect(page.getByRole('button', { name: '4096' })).toBeVisible()
})

test('export modal contains Export PNG and Cancel buttons', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('button', { name: 'Export PNG' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

test('Cancel closes the export modal', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('dialog', { name: 'Export PNG' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog', { name: 'Export PNG' })).not.toBeVisible()
})

test('backdrop click closes the export modal', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('dialog', { name: 'Export PNG' })).toBeVisible()
  // Click the backdrop (outside the dialog panel)
  await page.mouse.click(100, 100)
  await expect(page.getByRole('dialog', { name: 'Export PNG' })).not.toBeVisible()
})

test('custom resolution input appears when Custom is selected', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('button', { name: 'Custom' }).click()
  await expect(page.getByLabel('Custom resolution in pixels')).toBeVisible()
})

test('Export modal: Transparent background is the default', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  const transparentBtn = page.getByRole('button', { name: 'Transparent' })
  await expect(transparentBtn).toBeVisible()
  // The Transparent button should be active (selected state) by default
  await expect(transparentBtn).toHaveClass(/rw-active/)
})

test('Export modal: selecting Color background reveals color picker', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('button', { name: 'Color' }).click()
  await expect(page.getByLabel('Background color')).toBeVisible()
})

test('Export modal: margin slider is visible', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByLabel('Export margin percentage')).toBeVisible()
})

test('"Export selected layer only" option not shown with no selection', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  // No layer selected — option should not be visible
  const checkbox = page.getByText('Export selected layer only')
  await expect(checkbox).not.toBeVisible()
})

test('"Export selected layer only" option appears when a layer is selected', async ({ page }) => {
  await page.goto('')
  // Add a ring and select it
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByText('Export selected layer only')).toBeVisible()
})

test('no console errors when opening and closing export modal', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  expect(errors).toHaveLength(0)
})
