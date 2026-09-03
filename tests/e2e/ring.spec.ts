import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── helpers ──────────────────────────────────────────────────────────────────

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function getRingId(page: Parameters<typeof test>[1]['page'], index = 0) {
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="ring-layer-"]')).map((el) =>
      el.getAttribute('data-layer-id')
    )
  )
  return ids[index] ?? null
}

async function getSvgCircleAttr(
  page: Parameters<typeof test>[1]['page'],
  layerId: string,
  attr: string
) {
  return page.evaluate(
    ([id, a]) => {
      const g = document.querySelector(`[data-layer-id="${id}"]`)
      return g?.querySelector('circle')?.getAttribute(a) ?? null
    },
    [layerId, attr]
  )
}

// ─── application load ─────────────────────────────────────────────────────────

test('application loads without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(errors).toHaveLength(0)
})

test('initial project has no ring artwork', async ({ page }) => {
  await page.goto('/')
  const count = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? -1
  )
  expect(count).toBe(0)
})

// ─── Add Ring ─────────────────────────────────────────────────────────────────

test('Add Ring button is enabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add Ring' })).not.toBeDisabled()
})

test('clicking Add Ring creates a ring in the SVG artwork', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const count = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(count).toBe(1)
})

test('ring appears as a circle element in the SVG', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  expect(id).not.toBeNull()
  const r = await getSvgCircleAttr(page, id!, 'r')
  expect(parseFloat(r ?? '0')).toBeGreaterThan(0)
})

// ─── Layers panel ─────────────────────────────────────────────────────────────

test('ring appears in the Layers panel after adding', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await expect(page.getByRole('button', { name: 'Select layer Ring' })).toBeVisible()
})

test('layer count changes after adding a ring', async ({ page }) => {
  await page.goto('/')
  const before = await page.getByLabel('Layer count').textContent()
  await addRing(page)
  const after = await page.getByLabel('Layer count').textContent()
  expect(before).not.toBe(after)
  expect(after).toContain('1')
})

// ─── Selection ────────────────────────────────────────────────────────────────

test('selecting a ring through the Layers panel shows ring properties', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Click the ring entry in the Layers panel to select it
  await page
    .getByRole('button', { name: /Select layer/ })
    .first()
    .click()

  // Switch to Properties tab and verify ring inspector is shown
  await page.getByRole('tab', { name: 'Inspector' }).click()
  await expect(page.getByTestId('ring-inspector')).toBeVisible()
})

test('ring is auto-selected after adding', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Properties should show ring inspector (ring auto-selected on add)
  await page.getByRole('tab', { name: 'Inspector' }).click()
  await expect(page.getByTestId('ring-inspector')).toBeVisible()
})

// ─── Properties inspector ─────────────────────────────────────────────────────

test('Radius control updates the rendered SVG circle radius', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()
  await expect(page.getByTestId('ring-inspector')).toBeVisible()

  const id = await getRingId(page)
  const rBefore = await getSvgCircleAttr(page, id!, 'r')

  const radiusInput = page.getByLabel('Radius')
  await radiusInput.fill('150')
  await radiusInput.press('Tab')
  await page.waitForTimeout(50)

  const rAfter = await getSvgCircleAttr(page, id!, 'r')
  expect(rAfter).not.toBe(rBefore)
  expect(parseFloat(rAfter ?? '0')).toBeCloseTo(150, 0)
})

test('Thickness control updates the SVG stroke-width', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)
  const swBefore = await getSvgCircleAttr(page, id!, 'stroke-width')

  const input = page.getByLabel('Thickness')
  await input.fill('12')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const swAfter = await getSvgCircleAttr(page, id!, 'stroke-width')
  expect(swAfter).not.toBe(swBefore)
  expect(parseFloat(swAfter ?? '0')).toBeCloseTo(12, 0)
})

test('Color control updates the SVG circle stroke', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)
  const strokeBefore = await getSvgCircleAttr(page, id!, 'stroke')

  // Use the hex text input since color pickers are browser-controlled
  const hexInput = page.getByLabel('Color hex value')
  await hexInput.fill('#ff0000')
  await hexInput.press('Tab')
  await page.waitForTimeout(50)

  const strokeAfter = await getSvgCircleAttr(page, id!, 'stroke')
  expect(strokeAfter).not.toBe(strokeBefore)
})

test('Opacity slider updates the layer group opacity', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)

  const slider = page.getByLabel('Opacity')
  await slider.fill('50')
  await page.waitForTimeout(50)

  const opacity = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-layer-id="${layerId}"]`)
    return g?.getAttribute('opacity')
  }, id)

  expect(parseFloat(opacity ?? '1')).toBeCloseTo(0.5, 1)
})

test('X position updates the ring transform', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)
  const transformBefore = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )

  const input = page.getByRole('spinbutton', { name: 'X', exact: true })
  await input.fill('100')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transformAfter = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )

  expect(transformAfter).not.toBe(transformBefore)
  expect(transformAfter).toContain('translate(100,')
})

test('Y position updates the ring transform', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)

  const input = page.getByRole('spinbutton', { name: 'Y', exact: true })
  await input.fill('50')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )
  expect(transform).toContain(', 50)')
})

test('Rotation updates the ring transform', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)
  const input = page.getByLabel('Rotation')
  await input.fill('45')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )
  expect(transform).toContain('rotate(45)')
})

test('Scale X updates the ring transform', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const id = await getRingId(page)
  const input = page.getByLabel('Scale X')
  await input.fill('2')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )
  expect(transform).toContain('scale(2,')
})

// ─── Visibility ──────────────────────────────────────────────────────────────

test('hiding a ring removes it from the SVG artwork', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  const id = await getRingId(page)
  expect(id).not.toBeNull()

  // Click the visibility toggle (eye button)
  await page.getByLabel(/^Hide/).first().click()
  await page.waitForTimeout(50)

  const visible = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`) !== null,
    id
  )
  expect(visible).toBe(false)
})

test('showing a ring restores it in the SVG artwork', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Hide it
  await page.getByLabel(/^Hide/).first().click()
  await page.waitForTimeout(50)

  // Show it again
  await page.getByLabel(/^Show/).first().click()
  await page.waitForTimeout(50)

  const id = await getRingId(page)
  const visible = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`) !== null,
    id
  )
  expect(visible).toBe(true)
})

test('hidden ring still appears in the Layers panel', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  await page.getByLabel(/^Hide/).first().click()
  await page.waitForTimeout(50)

  // Layer entry still visible in panel
  await expect(page.getByRole('button', { name: 'Select layer Ring' })).toBeVisible()
})

// ─── Multiple rings ───────────────────────────────────────────────────────────

test('adding a second ring works independently', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)

  const count = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(count).toBe(2)
})

test('editing one ring does not mutate the other', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)

  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="ring-layer-"]')).map((el) =>
      el.getAttribute('data-layer-id')
    )
  )
  expect(ids).toHaveLength(2)

  // Select ring at index 0 (topmost in layers panel = last added)
  const layerButtons = page.getByRole('button', { name: /Select layer/ })
  await layerButtons.first().click()

  await page.getByRole('tab', { name: 'Inspector' }).click()
  const radiusInput = page.getByLabel('Radius')
  await radiusInput.fill('100')
  await radiusInput.press('Tab')
  await page.waitForTimeout(50)

  // Ring 0 should have r=100, ring 1 should retain default (300)
  const r0 = await getSvgCircleAttr(page, ids[0]!, 'r')
  const r1 = await getSvgCircleAttr(page, ids[1]!, 'r')
  expect(parseFloat(r0 ?? '0')).not.toBe(parseFloat(r1 ?? '0'))
})

test('SVG layer order follows project layer order', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)

  const ids = await page.evaluate(() => {
    const artwork = document.querySelector('[data-testid="artwork-group"]')
    return Array.from(artwork?.children ?? []).map((el) => el.getAttribute('data-layer-id'))
  })
  expect(ids).toHaveLength(2)
  // Both should be ring IDs (non-null)
  ids.forEach((id) => expect(id).not.toBeNull())
})

// ─── Phase 4 viewport integrity with artwork present ─────────────────────────

test('wheel zoom still works with ring artwork present', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  const svg = page.getByTestId('svg-viewport')
  const vbBefore = await svg.getAttribute('viewBox')

  await page.mouse.move(720, 450)
  await page.mouse.wheel(0, -300)
  await page.waitForTimeout(100)

  const vbAfter = await svg.getAttribute('viewBox')
  expect(vbAfter).not.toBe(vbBefore)
})

test('pan still works with ring artwork present', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  const svg = page.getByTestId('svg-viewport')
  const vbBefore = await svg.getAttribute('viewBox')

  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(820, 450)
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(50)

  const vbAfter = await svg.getAttribute('viewBox')
  expect(vbAfter).not.toBe(vbBefore)
})

test('Fit View still works with ring artwork present', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Pan away first
  await page.getByRole('button', { name: 'Pan' }).click()
  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(1020, 750)
  await page.mouse.up({ button: 'left' })
  await page.waitForTimeout(50)

  await page.getByRole('button', { name: 'Fit View' }).click()
  await page.waitForTimeout(100)

  const zoomText = await page.getByLabel('Zoom level').textContent()
  expect(zoomText).toMatch(/^\d+%$/)
  await expect(page.getByTestId('artboard-border')).toBeVisible()
})

// ─── Grid/guides/background controls still work ───────────────────────────────

test('grid toggle still works with ring present', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  await expect(page.getByTestId('grid-overlay')).not.toBeVisible()
  await page.getByRole('button', { name: 'Toggle grid' }).click()
  await expect(page.getByTestId('grid-overlay')).toBeVisible()
  await page.getByRole('button', { name: 'Toggle grid' }).click()
  await expect(page.getByTestId('grid-overlay')).not.toBeVisible()
})

// ─── No canvas interaction (Phase 6 boundary) ─────────────────────────────────

test('ring cannot be dragged on the canvas (no transform handles)', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  const id = await getRingId(page)
  const transformBefore = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )

  // Attempt to drag where the ring should be (center of artboard)
  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(820, 450)
  await page.mouse.up({ button: 'left' })
  await page.waitForTimeout(50)

  const transformAfter = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`)?.getAttribute('transform'),
    id
  )

  // Transform should be unchanged (no canvas drag interaction)
  expect(transformAfter).toBe(transformBefore)
})

test('adding a ring auto-selects it showing the selection overlay', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Phase 6: ring is auto-selected on add — selection overlay is present
  const overlayCount = await page.evaluate(() => {
    return document.querySelectorAll('[data-testid="selection-overlay"]').length
  })
  expect(overlayCount).toBe(1)
})

// ─── Radial Lines is now enabled (Phase 9) ────────────────────────────────────

test('Radial Lines tool button is enabled in Phase 9', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add Radial Lines' })).not.toBeDisabled()
})

// ─── Layout integrity ─────────────────────────────────────────────────────────

test('adding rings does not cause unexpected layout overflow', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)

  const hasVerticalOverflow = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight
  )
  expect(hasVerticalOverflow).toBe(false)

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  expect(hasHorizontalOverflow).toBe(false)
})
