import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── helpers ──────────────────────────────────────────────────────────────────

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function openAnimationPanel(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('tab', { name: 'Animation' }).click()
}

// ─── Play / Pause / Reset controls ────────────────────────────────────────────

test('Play button is visible and enabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).not.toBeDisabled()
})

test('Reset button is visible and enabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset' })).not.toBeDisabled()
})

test('clicking Play changes button label to Pause', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).not.toBeVisible()
})

test('clicking Pause after Play restores Play button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('Reset button stops playback', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

// ─── Animation panel ──────────────────────────────────────────────────────────

test('animation panel is not shown when no layer is selected', async ({ page }) => {
  await page.goto('/')
  await openAnimationPanel(page)
  await expect(page.getByTestId('animation-panel')).not.toBeVisible()
})

test('animation panel appears when a layer is selected', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()
  await openAnimationPanel(page)
  await expect(page.getByTestId('animation-panel')).toBeVisible()
})

test('animation panel shows Spin Speed, Pulse Speed, Pulse Amplitude fields', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()
  await openAnimationPanel(page)
  await expect(page.getByLabel('Spin Speed')).toBeVisible()
  await expect(page.getByLabel('Pulse Speed')).toBeVisible()
  await expect(page.getByLabel('Pulse Amplitude')).toBeVisible()
})

test('animation panel defaults: spin speed is 0', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()
  await openAnimationPanel(page)
  await expect(page.getByLabel('Spin Speed')).toHaveValue('0')
})

test('animation panel defaults: pulse speed is 0', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()
  await openAnimationPanel(page)
  await expect(page.getByLabel('Pulse Speed')).toHaveValue('0')
})

test('animation panel defaults: pulse amplitude is 0', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()
  await openAnimationPanel(page)
  await expect(page.getByLabel('Pulse Amplitude')).toHaveValue('0')
})

// ─── Animation does not affect SVG base transform ─────────────────────────────

test('base transform in project store is unchanged after animation plays', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Record initial transform in the SVG artwork
  const layerId = await page.evaluate(() =>
    document.querySelector('[data-testid^="ring-layer-"]')?.getAttribute('data-layer-id')
  )

  const initialTransform = await page.evaluate((id) => {
    const g = document.querySelector(`[data-layer-id="${id}"]`)
    return g?.getAttribute('transform') ?? ''
  }, layerId)

  // Play and wait a bit
  await page.getByRole('button', { name: 'Play' }).click()
  await page.waitForTimeout(200)

  // The SVG transform will have changed visually (animated), but after Reset
  // it should go back to the original
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.waitForTimeout(50)

  const resetTransform = await page.evaluate((id) => {
    const g = document.querySelector(`[data-layer-id="${id}"]`)
    return g?.getAttribute('transform') ?? ''
  }, layerId)

  expect(resetTransform).toBe(initialTransform)
})

// ─── Rotation animates the SVG transform ──────────────────────────────────────

test('setting spin speed and playing causes animated transform change', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()
  await openAnimationPanel(page)

  const layerId = await page.evaluate(() =>
    document.querySelector('[data-testid^="ring-layer-"]')?.getAttribute('data-layer-id')
  )

  // Set rotation speed to 360°/s
  const rotField = page.getByLabel('Spin Speed')
  await rotField.fill('360')
  await rotField.press('Enter')

  const initialTransform = await page.evaluate((id) => {
    const g = document.querySelector(`[data-layer-id="${id}"]`)
    return g?.getAttribute('transform') ?? ''
  }, layerId)

  // Play and wait for animation to produce a different transform
  await page.getByRole('button', { name: 'Play' }).click()
  await page.waitForTimeout(200)

  const animatedTransform = await page.evaluate((id) => {
    const g = document.querySelector(`[data-layer-id="${id}"]`)
    return g?.getAttribute('transform') ?? ''
  }, layerId)

  expect(animatedTransform).not.toBe(initialTransform)
})

// ─── Project replacement resets animation ─────────────────────────────────────

test('New Project stops and clears animation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()

  await page.getByRole('button', { name: 'New' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

// ─── No console errors ────────────────────────────────────────────────────────

test('no console errors during animation play/pause/reset flow', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/')
  await addRing(page)
  await page.getByRole('button', { name: 'Play' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()

  expect(errors).toHaveLength(0)
})
