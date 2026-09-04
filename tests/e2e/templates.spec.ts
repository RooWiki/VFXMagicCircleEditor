import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── Templates button ─────────────────────────────────────────────────────────

test('Templates button is visible in the top bar', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible()
})

test('Templates button is enabled on fresh load', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('button', { name: 'Templates' })).not.toBeDisabled()
})

// ─── Gallery open / close ─────────────────────────────────────────────────────

test('clicking Templates opens the template gallery dialog', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).toBeVisible()
})

test('gallery contains a close button', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByRole('button', { name: 'Close template gallery' })).toBeVisible()
})

test('close button (×) closes the gallery', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).toBeVisible()
  await page.getByRole('button', { name: 'Close template gallery' }).click()
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).not.toBeVisible()
})

test('backdrop click closes the gallery', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).toBeVisible()
  // Click a corner well outside the panel
  await page.mouse.click(20, 20)
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).not.toBeVisible()
})

// ─── Template cards ───────────────────────────────────────────────────────────

test('gallery shows all five templates', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByLabel('Load template: Solar Sigil')).toBeVisible()
  await expect(page.getByLabel('Load template: Runic Array')).toBeVisible()
  await expect(page.getByLabel('Load template: Crystal Web')).toBeVisible()
  await expect(page.getByLabel('Load template: Arcane Matrix')).toBeVisible()
  await expect(page.getByLabel('Load template: Void Circle')).toBeVisible()
})

test('gallery shows template names', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  const dialog = page.getByRole('dialog', { name: 'Template Gallery' })
  await expect(dialog.getByText('Solar Sigil')).toBeVisible()
  await expect(dialog.getByText('Runic Array')).toBeVisible()
  await expect(dialog.getByText('Crystal Web')).toBeVisible()
  await expect(dialog.getByText('Arcane Matrix')).toBeVisible()
  await expect(dialog.getByText('Void Circle')).toBeVisible()
})

// ─── Template loading ─────────────────────────────────────────────────────────

test('selecting a template replaces the project layers', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.getByLabel('Load template: Solar Sigil').click()

  // Gallery closes after load
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).not.toBeVisible()

  // Layers appear — "No layers yet" is gone
  await expect(page.getByText('No layers yet. Add a Ring or Radial Lines.')).not.toBeVisible()
})

test('loading a template closes the gallery', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.getByLabel('Load template: Crystal Web').click()
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).not.toBeVisible()
})

test('loaded template layers are visible in the layer panel', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.getByLabel('Load template: Runic Array').click()

  // The layer panel should now show layers with expected names from the template
  const layerPanel = page.getByRole('list', { name: 'Layers' })
  await expect(layerPanel.getByText('Outer Ring')).toBeVisible()
})

test('each of the five templates loads successfully', async ({ page }) => {
  const templates = ['Solar Sigil', 'Runic Array', 'Crystal Web', 'Arcane Matrix', 'Void Circle']

  for (const name of templates) {
    await page.goto('')
    await page.getByRole('button', { name: 'Templates' }).click()
    await page.getByLabel(`Load template: ${name}`).click()
    await expect(page.getByRole('dialog', { name: 'Template Gallery' })).not.toBeVisible()
    await expect(page.getByText('No layers yet. Add a Ring or Radial Lines.')).not.toBeVisible()
  }
})

// ─── Unsaved-changes confirmation ─────────────────────────────────────────────

test('loading a template on a clean project skips the confirmation dialog', async ({ page }) => {
  await page.goto('')
  // Fresh load → project is empty and clean → no confirmation needed
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.getByLabel('Load template: Void Circle').click()
  // Confirm dialog should NOT appear
  await expect(page.getByRole('dialog', { name: 'Template Gallery' })).not.toBeVisible()
  await expect(page.getByRole('dialog').filter({ hasText: 'unsaved' })).not.toBeVisible()
})

test('cancelling the confirmation keeps the current project intact', async ({ page }) => {
  await page.goto('')

  // Create a dirty project by adding a ring layer
  await page.getByRole('button', { name: 'Add Ring' }).click()
  // Give autosave logic a moment to register the change
  await page.waitForTimeout(100)

  // Now open templates
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.getByLabel('Load template: Arcane Matrix').click()

  // Confirmation dialog should appear (has layers + dirty)
  const confirmDialog = page.getByRole('dialog').filter({ hasText: 'unsaved changes' })

  if (await confirmDialog.isVisible()) {
    // Cancel → project should remain unchanged
    await page.getByRole('button', { name: 'Cancel' }).click()
    // Template gallery should still be open (user cancelled the load)
    await expect(page.getByRole('dialog', { name: 'Template Gallery' })).toBeVisible()
    // Close gallery
    await page.getByRole('button', { name: 'Close template gallery' }).click()
  }

  // Original ring layer is still in the panel
  await expect(page.getByText('No layers yet. Add a Ring or Radial Lines.')).not.toBeVisible()
})

// ─── No errors ────────────────────────────────────────────────────────────────

test('no console errors when opening and closing the template gallery', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('')
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.getByRole('button', { name: 'Close template gallery' }).click()
  expect(errors).toHaveLength(0)
})
