import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function getLayerNames(page: Parameters<typeof test>[1]['page']): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="layer-name-"]')).map(
      (el) => el.textContent?.trim() ?? ''
    )
  )
}

async function getLayerCount(page: Parameters<typeof test>[1]['page']): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('[data-testid^="layer-name-"]').length)
}

async function selectLayerByName(page: Parameters<typeof test>[1]['page'], name: string) {
  await page
    .getByRole('button', { name: `Select layer ${name}` })
    .first()
    .click()
  await page.waitForTimeout(30)
}

async function openProperties(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('tab', { name: 'Properties' }).click()
  await page.waitForTimeout(30)
}

function undoBtn(page: Parameters<typeof test>[1]['page']) {
  return page.getByRole('button', { name: 'Undo' })
}

function redoBtn(page: Parameters<typeof test>[1]['page']) {
  return page.getByRole('button', { name: 'Redo' })
}

// ─── Toolbar disabled states ───────────────────────────────────────────────────

test('Undo button is disabled on fresh load', async ({ page }) => {
  await page.goto('/')
  await expect(undoBtn(page)).toBeDisabled()
})

test('Redo button is disabled on fresh load', async ({ page }) => {
  await page.goto('/')
  await expect(redoBtn(page)).toBeDisabled()
})

test('Undo button becomes enabled after adding a ring', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await expect(undoBtn(page)).toBeEnabled()
})

test('Redo button remains disabled after adding a ring', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await expect(redoBtn(page)).toBeDisabled()
})

test('Redo button becomes enabled after undo', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await undoBtn(page).click()
  await expect(redoBtn(page)).toBeEnabled()
})

test('Undo button becomes disabled after undoing all actions', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await undoBtn(page).click()
  await expect(undoBtn(page)).toBeDisabled()
})

// ─── Add ring undo/redo ────────────────────────────────────────────────────────

test('Ctrl+Z undoes ring addition', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  expect(await getLayerCount(page)).toBe(1)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

test('Ctrl+Shift+Z redoes ring addition after undo', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

test('Ctrl+Y redoes ring addition after undo', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

test('toolbar Undo button click undoes ring addition', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await undoBtn(page).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

test('toolbar Redo button click redoes ring addition', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await undoBtn(page).click()
  await page.waitForTimeout(50)
  await redoBtn(page).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── Ctrl+D history ────────────────────────────────────────────────────────────

test('Ctrl+D duplicate is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.keyboard.press('Control+d')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(2)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

test('Ctrl+D with no selection is a no-op', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  // Deselect by clicking empty area
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+d')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── Delete / Backspace ────────────────────────────────────────────────────────

test('Delete key removes selected layer', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

test('Delete is undoable via Ctrl+Z', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

test('Backspace key removes selected layer', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

// ─── Rename undo/redo ─────────────────────────────────────────────────────────

test('rename is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [originalName] = await getLayerNames(page)
  await page.getByRole('button', { name: `Select layer ${originalName}` }).dblclick()
  await page.waitForTimeout(30)
  const input = page.getByTestId('layer-rename-input')
  await input.fill('My Circle')
  await input.press('Enter')
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: 'Select layer My Circle' })).toBeVisible()
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: `Select layer ${originalName}` })).toBeVisible()
})

// ─── Visibility / Lock undo/redo ──────────────────────────────────────────────

test('visibility hide is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await page.getByRole('button', { name: `Hide ${name}` }).click()
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: `Hide ${name}` })).toBeVisible()
})

test('lock is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await page.getByRole('button', { name: `Lock ${name}` }).click()
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await expect(page.getByRole('button', { name: `Lock ${name}` })).toBeVisible()
})

// ─── Center undo/redo ─────────────────────────────────────────────────────────

test('center action is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  // Set X to a non-zero value via inspector
  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  await xInput.fill('200')
  await xInput.press('Tab')
  await page.waitForTimeout(50)

  // Center it
  await page.getByRole('tab', { name: 'Layers' }).click()
  await page.getByRole('button', { name: 'Center selected layer on canvas' }).click()
  await page.waitForTimeout(50)

  // Verify centered
  await openProperties(page)
  await expect(xInput).toHaveValue('0')

  // Undo center
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  // After undo, X should be back to 200
  await expect(xInput).toHaveValue('200')
})

// ─── Arrow nudge ──────────────────────────────────────────────────────────────

test('ArrowRight nudges X by 1', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initialValue = await xInput.inputValue()

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)

  const newValue = await xInput.inputValue()
  expect(Number(newValue)).toBe(Number(initialValue) + 1)
})

test('Shift+ArrowRight nudges X by 10', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initialValue = await xInput.inputValue()

  await page.keyboard.press('Shift+ArrowRight')
  await page.waitForTimeout(50)

  const newValue = await xInput.inputValue()
  expect(Number(newValue)).toBe(Number(initialValue) + 10)
})

test('nudge is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initialValue = await xInput.inputValue()

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  await expect(xInput).toHaveValue(initialValue)
})

test('locked layer cannot be nudged', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initialValue = await xInput.inputValue()

  await page.getByRole('tab', { name: 'Layers' }).click()
  await page.getByRole('button', { name: `Lock ${name}` }).click()
  await page.waitForTimeout(30)

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)

  await openProperties(page)
  await expect(xInput).toHaveValue(initialValue)
})

// ─── Inspector history ────────────────────────────────────────────────────────

test('inspector radius change is undoable', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const radiusInput = page.getByRole('spinbutton', { name: 'Radius' })
  const originalValue = await radiusInput.inputValue()

  await radiusInput.fill('400')
  await radiusInput.press('Tab')
  await page.waitForTimeout(50)
  await expect(radiusInput).toHaveValue('400')

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await expect(radiusInput).toHaveValue(originalValue)
})

test('typing multiple characters in inspector creates one history entry per blur', async ({
  page,
}) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const radiusInput = page.getByRole('spinbutton', { name: 'Radius' })
  const originalValue = await radiusInput.inputValue()
  await radiusInput.fill('111')
  await radiusInput.press('Tab')
  await page.waitForTimeout(50)

  // Defocus inspector by clicking canvas so Ctrl+Z fires as project undo
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(30)

  // One undo should restore to original radius (exactly one entry for the whole blur)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  // Switch to Layers, reselect, open Properties to verify radius restored
  await page.getByRole('tab', { name: 'Layers' }).click()
  await selectLayerByName(page, name)
  await openProperties(page)
  await expect(radiusInput).toHaveValue(originalValue)

  // Defocus again, then second undo should undo the ring add
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(30)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

// ─── Branch truncation ────────────────────────────────────────────────────────

test('undo then new action truncates redo branch', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)
  // Two rings; undo removes second
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)

  // Redo should be enabled
  await expect(redoBtn(page)).toBeEnabled()

  // New action: add another ring
  await addRing(page)
  await page.waitForTimeout(50)

  // Redo should now be disabled (branch truncated)
  await expect(redoBtn(page)).toBeDisabled()
})

// ─── Tab cycling ──────────────────────────────────────────────────────────────

test('Tab selects a layer when nothing is selected', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  // Deselect
  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(50)
  // No selection overlay before Tab
  await expect(page.getByTestId('selection-overlay')).not.toBeVisible()

  await page.keyboard.press('Tab')
  await page.waitForTimeout(50)

  // Selection overlay should now appear
  await expect(page.getByTestId('selection-overlay')).toBeVisible()
})

test('Tab cycles to a different layer when two rings exist', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)
  // Select the first layer (auto-selected on second add)
  // Get current selection overlay layer id
  const beforeId = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  await page.keyboard.press('Tab')
  await page.waitForTimeout(50)

  // Selection should have moved to a different layer
  const afterId = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  expect(afterId).not.toBe(beforeId)
})

test('Tab wraps back to a layer after passing last', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  // With one ring, Tab should keep it selected (no other layer to go to → wraps to same)
  const beforeId = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  await page.keyboard.press('Tab')
  await page.waitForTimeout(50)

  const afterId = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  // With only one layer, Tab cycles back to it
  expect(afterId).toBe(beforeId)
})

test('Shift+Tab moves back to a different layer', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)
  const beforeId = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  await page.keyboard.press('Shift+Tab')
  await page.waitForTimeout(50)

  const afterId = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  expect(afterId).not.toBe(beforeId)
})

test('Tab with no layers is a safe no-op', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByText('No layers yet')).toBeVisible()
})

// ─── Ctrl+0 ───────────────────────────────────────────────────────────────────

test('Ctrl+0 fits the canvas to view without error', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+0')
  await page.waitForTimeout(100)
  const zoomLabel = page.getByLabel('Zoom level')
  await expect(zoomLabel).toBeVisible()
  const text = await zoomLabel.textContent()
  expect(text).toMatch(/^\d+%$/)
})

// ─── Guard: shortcuts ignored in inspector ────────────────────────────────────

test('Ctrl+Z while typing in inspector does not undo project', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const radiusInput = page.getByLabel('Radius')
  await radiusInput.fill('400')
  // Do NOT blur — input is still focused

  // Ctrl+Z should act as native text undo, not project undo
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  // Layer should still exist (no project undo happened)
  expect(await getLayerCount(page)).toBe(1)
})

test('Arrow keys do not nudge while inspector input is focused', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initialValue = await xInput.inputValue()

  // Focus the X input then press ArrowRight (browser moves cursor inside the number input)
  await xInput.click()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)

  // Blur without changing value — commit should not change the store
  await xInput.press('Tab')
  await page.waitForTimeout(50)

  // X should still equal the initial value (nudge guard blocked it)
  await expect(xInput).toHaveValue(initialValue)
})

// ─── Guard: shortcuts ignored in rename ───────────────────────────────────────

test('Delete does not delete layer while rename input is focused', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await page
    .getByRole('button', { name: `Select layer ${name}` })
    .first()
    .dblclick()
  await page.waitForTimeout(50)
  const renameInput = page.getByTestId('layer-rename-input')
  await expect(renameInput).toBeVisible()
  // Press Delete on the rename input itself — deletes a character, not the layer
  await renameInput.press('Delete')
  await page.waitForTimeout(50)
  await renameInput.press('Escape')
  await page.waitForTimeout(30)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── Radial Lines is now enabled (Phase 9) ────────────────────────────────────

test('Radial Lines tool is enabled in Phase 9', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add Radial Lines' })).not.toBeDisabled()
})

// ─── No console errors ────────────────────────────────────────────────────────

test('no console errors during undo/redo workflow', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/')
  await addRing(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+Shift+z')
  await page.keyboard.press('Control+d')
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(100)

  expect(errors).toHaveLength(0)
})
