import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('Generate button is visible in the tool rail', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible()
})

test('Generate button is enabled on fresh load', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Generate' })).not.toBeDisabled()
})

test('clicking Generate opens the generator modal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).toBeVisible()
})

test('generator modal contains Generate and Regenerate buttons', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  const dialog = page.getByRole('dialog', { name: 'Procedural Generator' })
  await expect(dialog.getByRole('button', { name: 'Generate', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Regenerate', exact: true })).toBeVisible()
})

test('generator modal contains a seed input', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByLabel('Generation seed')).toBeVisible()
})

test('generator modal contains Cancel button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

test('Cancel closes the generator modal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).not.toBeVisible()
})

test('backdrop click closes the generator modal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).toBeVisible()
  await page.mouse.click(50, 50)
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).not.toBeVisible()
})

test('close button (×) closes the generator modal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).toBeVisible()
  await page.getByRole('button', { name: 'Close generator' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).not.toBeVisible()
})

test('Generate replaces project layers and they appear in the layer panel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  const dialog = page.getByRole('dialog', { name: 'Procedural Generator' })
  await dialog.getByRole('button', { name: 'Generate', exact: true }).click()
  // Modal closes after Generate
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).not.toBeVisible()
  // Layers appear in panel — "No layers yet" should be gone
  await expect(page.getByText('No layers yet. Add a Ring or Radial Lines.')).not.toBeVisible()
})

test('Regenerate changes the seed value', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  const seedInput = page.getByLabel('Generation seed')
  const beforeSeed = await seedInput.inputValue()

  // Click Regenerate — it closes the modal
  await page.getByRole('button', { name: 'Regenerate' }).click()
  await expect(page.getByRole('dialog', { name: 'Procedural Generator' })).not.toBeVisible()

  // Reopen modal and check seed changed (unless seed was locked)
  await page.getByRole('button', { name: 'Generate' }).click()
  const afterSeed = await page.getByLabel('Generation seed').inputValue()
  expect(afterSeed).not.toBe(beforeSeed)
})

test('locking the seed preserves it across Regenerate', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  const seedInput = page.getByLabel('Generation seed')
  const beforeSeed = await seedInput.inputValue()

  // Lock the seed
  await page.getByRole('button', { name: 'Lock seed' }).click()

  // Regenerate
  await page.getByRole('button', { name: 'Regenerate' }).click()
  // Reopen
  await page.getByRole('button', { name: 'Generate' }).click()
  const afterSeed = await page.getByLabel('Generation seed').inputValue()
  expect(afterSeed).toBe(beforeSeed)
})

test('generator modal has complexity buttons', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('button', { name: 'low', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'medium', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'high', exact: true })).toBeVisible()
})

test('no console errors when opening and closing generator modal', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  expect(errors).toHaveLength(0)
})
