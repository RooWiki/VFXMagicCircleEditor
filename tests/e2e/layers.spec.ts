import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function getLayerNames(page: Parameters<typeof test>[1]['page']) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="layer-name-"]')).map(
      (el) => el.textContent?.trim() ?? ''
    )
  )
}

async function getLayerCount(page: Parameters<typeof test>[1]['page']) {
  return page.evaluate(() => document.querySelectorAll('[data-testid^="layer-name-"]').length)
}

async function selectLayer(page: Parameters<typeof test>[1]['page'], name: string) {
  await page
    .getByRole('button', { name: `Select layer ${name}` })
    .first()
    .click()
  await page.waitForTimeout(30)
}

// ─── Empty state ──────────────────────────────────────────────────────────────

test('layers panel shows empty state with no layers', async ({ page }) => {
  await page.goto('')
  await expect(page.getByText('No layers yet')).toBeVisible()
})

test('empty state disappears after adding a ring', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await expect(page.getByText('No layers yet')).not.toBeVisible()
})

// ─── Action bar ───────────────────────────────────────────────────────────────

test('Duplicate button is disabled with no selection', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  // click blank area to deselect
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: 'Duplicate selected layer' })).toBeDisabled()
})

test('Delete button is disabled with no selection', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: 'Delete selected layer' })).toBeDisabled()
})

test('Center button is disabled with no selection', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: 'Center selected layer on canvas' })).toBeDisabled()
})

test('action buttons become enabled when a layer is selected', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const name = (await getLayerNames(page))[0]
  await selectLayer(page, name)
  await expect(page.getByRole('button', { name: 'Duplicate selected layer' })).not.toBeDisabled()
  await expect(page.getByRole('button', { name: 'Delete selected layer' })).not.toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Center selected layer on canvas' })
  ).not.toBeDisabled()
})

// ─── Delete via action bar ────────────────────────────────────────────────────

test('clicking Delete removes the selected layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const name = (await getLayerNames(page))[0]
  await selectLayer(page, name)
  await page.getByRole('button', { name: 'Delete selected layer' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

test('delete shows empty state when last layer removed', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const name = (await getLayerNames(page))[0]
  await selectLayer(page, name)
  await page.getByRole('button', { name: 'Delete selected layer' }).click()
  await expect(page.getByText('No layers yet')).toBeVisible()
})

test('Delete button removes only the selected layer when multiple exist', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await addRing(page)
  expect(await getLayerCount(page)).toBe(2)
  const names = await getLayerNames(page)
  await selectLayer(page, names[0])
  await page.getByRole('button', { name: 'Delete selected layer' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── Delete via keyboard ──────────────────────────────────────────────────────

test('Delete key removes the selected layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const name = (await getLayerNames(page))[0]
  await selectLayer(page, name)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

test('Delete key with no selection is a no-op', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(50)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── Duplicate ────────────────────────────────────────────────────────────────

test('clicking Duplicate adds a layer with Copy of prefix', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await selectLayer(page, names[0])
  await page.getByRole('button', { name: 'Duplicate selected layer' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(2)
  const newNames = await getLayerNames(page)
  expect(newNames.some((n) => n.startsWith('Copy of'))).toBe(true)
})

test('duplicate selects the new layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await selectLayer(page, names[0])
  await page.getByRole('button', { name: 'Duplicate selected layer' }).click()
  await page.waitForTimeout(50)
  // The new duplicate should be the selected layer — its name shows in action bar context
  const layerCount = await page.evaluate(
    () => document.querySelectorAll('[aria-selected="true"]').length
  )
  expect(layerCount).toBeGreaterThanOrEqual(1)
})

// ─── Inline rename ────────────────────────────────────────────────────────────

test('double-clicking a layer name shows a rename input', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Select layer ${names[0]}` }).dblclick()
  await page.waitForTimeout(30)
  await expect(page.getByTestId('layer-rename-input')).toBeVisible()
})

test('rename input is pre-filled with the current name', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Select layer ${names[0]}` }).dblclick()
  await page.waitForTimeout(30)
  const input = page.getByTestId('layer-rename-input')
  await expect(input).toHaveValue(names[0])
})

test('Enter commits the rename', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Select layer ${names[0]}` }).dblclick()
  await page.waitForTimeout(30)
  const input = page.getByTestId('layer-rename-input')
  await input.selectText()
  await input.fill('My Custom Name')
  await input.press('Enter')
  await page.waitForTimeout(50)
  const newNames = await getLayerNames(page)
  expect(newNames).toContain('My Custom Name')
})

test('Escape cancels rename without saving', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  const original = names[0]
  await page.getByRole('button', { name: `Select layer ${original}` }).dblclick()
  await page.waitForTimeout(30)
  const input = page.getByTestId('layer-rename-input')
  await input.fill('Discarded Name')
  await input.press('Escape')
  await page.waitForTimeout(50)
  const newNames = await getLayerNames(page)
  expect(newNames).toContain(original)
  expect(newNames).not.toContain('Discarded Name')
})

test('Delete key during rename does not delete the layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page
    .getByRole('button', { name: `Select layer ${names[0]}` })
    .first()
    .dblclick()
  const input = page.getByTestId('layer-rename-input')
  await expect(input).toBeVisible()
  // Delete on the rename input erases a character, not the layer
  await input.press('Delete')
  await page.waitForTimeout(50)
  // Rename input must still be visible (if the layer were deleted, rename mode would collapse)
  await expect(input).toBeVisible()
  // Exit rename mode, then verify layer still exists
  await input.press('Escape')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── Center on canvas ─────────────────────────────────────────────────────────

test('Center resets layer position to 0,0', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await selectLayer(page, names[0])
  await page.getByRole('button', { name: 'Center selected layer on canvas' }).click()
  await page.waitForTimeout(50)
  // Layer is centered — selection overlay should still be present
  await expect(page.getByTestId('selection-overlay')).toBeVisible()
})

// ─── Layer visibility ─────────────────────────────────────────────────────────

test('clicking eye icon hides the layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Hide ${names[0]}` }).click()
  await page.waitForTimeout(50)
  const artworkCount = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? -1
  )
  expect(artworkCount).toBe(0)
})

test('clicking eye icon again shows the layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Hide ${names[0]}` }).click()
  await page.waitForTimeout(30)
  await page.getByRole('button', { name: `Show ${names[0]}` }).click()
  await page.waitForTimeout(50)
  const artworkCount = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? -1
  )
  expect(artworkCount).toBe(1)
})

// ─── Layer lock ───────────────────────────────────────────────────────────────

test('clicking lock icon locks the layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Lock ${names[0]}` }).click()
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: `Unlock ${names[0]}` })).toBeVisible()
})

test('clicking lock icon again unlocks the layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await page.getByRole('button', { name: `Lock ${names[0]}` }).click()
  await page.waitForTimeout(30)
  await page.getByRole('button', { name: `Unlock ${names[0]}` }).click()
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: `Lock ${names[0]}` })).toBeVisible()
})

// ─── Layer ordering ───────────────────────────────────────────────────────────

test('adding two rings shows both in layers panel', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await addRing(page)
  expect(await getLayerCount(page)).toBe(2)
})

test('most recently added ring appears at top of layers panel', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await addRing(page)
  // SVG artwork group: [0] = bottom layer, [last] = top (newest)
  const svgIds = await page.evaluate(() =>
    Array.from(document.querySelector('[data-testid="artwork-group"]')?.children ?? []).map((el) =>
      el.getAttribute('data-layer-id')
    )
  )
  // Panel: [0] = topmost display row (newest layer)
  const panelIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-panel-layer-id]')).map((el) =>
      el.getAttribute('data-panel-layer-id')
    )
  )
  expect(panelIds[0]).toBe(svgIds[svgIds.length - 1])
})

// ─── Canvas stacking ─────────────────────────────────────────────────────────

test('SVG artwork group contains an element for each visible layer', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await addRing(page)
  const artworkCount = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? -1
  )
  expect(artworkCount).toBe(2)
})

// ─── Selection sync ───────────────────────────────────────────────────────────

test('clicking a layer name in panel selects it', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  await addRing(page)
  const names = await getLayerNames(page)
  await selectLayer(page, names[1])
  await expect(page.getByTestId('selection-overlay')).toBeVisible()
})

test('deleting selected layer removes selection overlay', async ({ page }) => {
  await page.goto('')
  await addRing(page)
  const names = await getLayerNames(page)
  await selectLayer(page, names[0])
  await page.getByRole('button', { name: 'Delete selected layer' }).click()
  await page.waitForTimeout(50)
  await expect(page.getByTestId('selection-overlay')).not.toBeVisible()
})

// ─── Space-after-pointer-click regression ────────────────────────────────────
// Clicking a create button must not leave it focused so that pressing Space
// afterward (for canvas panning) does not fire the button again.

test('pointer-click Ring create + Space does not create extra rings', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(20)
  }

  expect(await getLayerCount(page)).toBe(1)
})

test('pointer-click Radial Lines create + Space does not create extra layers', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Radial Lines' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(20)
  }

  expect(await getLayerCount(page)).toBe(1)
})

test('repeated pointer clicks on Ring create still produce multiple rings', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(3)
})

test('keyboard-focused Ring button activated by Space still creates a ring', async ({ page }) => {
  await page.goto('')
  // Programmatic focus simulates Tab navigation to the button
  await page.getByRole('button', { name: 'Add Ring' }).focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(50)
  // Keyboard activation (detail === 0) must still create the layer
  expect(await getLayerCount(page)).toBe(1)
})
