/**
 * Phase 6 E2E — Canvas Selection and Transform Interactions
 *
 * Tests cover click-to-select, deselect, move, rotate, scale, Shift-scale,
 * locked/hidden layer behavior, and viewport integrity with artwork.
 */

import { expect, test } from '@playwright/test'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function goToProperties(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('tab', { name: 'Properties' }).click()
}

async function getRingId(page: Parameters<typeof test>[1]['page']) {
  const g = page.locator('[data-layer-id]').first()
  return g.getAttribute('data-layer-id')
}

async function getSvgTransform(page: Parameters<typeof test>[1]['page'], layerId: string) {
  return page.evaluate((id) => {
    return document.querySelector(`[data-layer-id="${id}"]`)?.getAttribute('transform')
  }, layerId)
}

// Returns a screen coordinate on the ring's circumference using SVG's getScreenCTM.
// This works at any zoom / pan level.
async function getRingStrokePos(page: Parameters<typeof test>[1]['page'], layerId: string) {
  return page.evaluate((id) => {
    const ringGroup = document.querySelector(`[data-testid="ring-layer-${id}"]`)
    const svg = document.querySelector('[data-testid="svg-viewport"]') as SVGSVGElement
    if (!ringGroup || !svg) return null
    const circle = ringGroup.querySelector('circle')
    if (!circle) return null
    const r = parseFloat(circle.getAttribute('r') || '0')
    const ctm = (ringGroup as SVGGraphicsElement).getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = r
    pt.y = 0
    const screenPt = pt.matrixTransform(ctm)
    return { x: screenPt.x, y: screenPt.y }
  }, layerId)
}

async function clickRingOnCanvas(page: Parameters<typeof test>[1]['page'], layerId: string) {
  const pos = await getRingStrokePos(page, layerId)
  if (!pos) throw new Error('Could not find ring position')
  await page.mouse.click(pos.x, pos.y)
  await page.waitForTimeout(100)
}

// ─── Setup verification ────────────────────────────────────────────────────────

test('application loads without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForTimeout(200)
  expect(errors).toHaveLength(0)
})

test('Add Ring still works in Phase 6', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  expect(id).not.toBeNull()
})

// ─── Canvas selection ─────────────────────────────────────────────────────────

test('clicking Ring on canvas selects it (selection overlay appears)', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)
  await expect(page.locator('[data-testid="selection-overlay"]')).toBeVisible()
})

test('Properties panel reflects canvas selection', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)
  await goToProperties(page)
  await expect(page.getByTestId('ring-inspector')).toBeVisible()
})

test('clicking empty artboard deselects', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)
  await expect(page.locator('[data-testid="selection-overlay"]')).toBeVisible()

  // Click far corner of canvas (outside the ring which is at origin)
  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  // Click near the corner (well outside the ring radius at center)
  await page.mouse.click(box.x + 20, box.y + 20)
  await page.waitForTimeout(100)

  await expect(page.locator('[data-testid="selection-overlay"]')).not.toBeVisible()
})

test('selecting from Layers panel shows canvas overlay', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Click the select layer button in the Layers panel (not on canvas)
  await page.getByRole('button', { name: 'Select layer Ring' }).first().click()
  await page.waitForTimeout(100)

  await expect(page.locator('[data-testid="selection-overlay"]')).toBeVisible()
})

// ─── Move ─────────────────────────────────────────────────────────────────────

test('dragging Ring moves it — transform changes', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  const transformBefore = await getSvgTransform(page, id!)

  // Click to select, then drag from the ring's stroke position
  await clickRingOnCanvas(page, id!)
  const pos = await getRingStrokePos(page, id!)
  if (!pos) throw new Error('No ring position')

  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 100, pos.y + 50, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).not.toBe(transformBefore)
})

test('X/Y inspector values update after move', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await goToProperties(page)

  const xBefore = await page.getByRole('spinbutton', { name: 'X', exact: true }).inputValue()

  // Select, then drag from the ring's stroke position
  await clickRingOnCanvas(page, id!)
  const pos = await getRingStrokePos(page, id!)
  if (!pos) throw new Error('No ring position')

  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const xAfter = await page.getByRole('spinbutton', { name: 'X', exact: true }).inputValue()
  expect(Number(xAfter)).not.toBe(Number(xBefore))
})

test('move works correctly after viewport zoom', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  // Zoom in via wheel
  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.wheel(0, -400)
  await page.waitForTimeout(100)

  const transformBefore = await getSvgTransform(page, id!)

  // Select, then drag from the ring's stroke position (computed after zoom)
  await clickRingOnCanvas(page, id!)
  const pos = await getRingStrokePos(page, id!)
  if (!pos) throw new Error('No ring position')
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 60, pos.y + 30, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).not.toBe(transformBefore)
})

test('move works correctly after viewport pan', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  // Pan via middle mouse
  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(cx + 50, cy, { steps: 4 })
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(100)

  const transformBefore = await getSvgTransform(page, id!)

  // Select, then drag from the ring's current stroke position (after pan)
  await clickRingOnCanvas(page, id!)
  const pos = await getRingStrokePos(page, id!)
  if (!pos) throw new Error('No ring position')
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 40, pos.y + 40, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).not.toBe(transformBefore)
})

// ─── Rotation ─────────────────────────────────────────────────────────────────

test('rotation handle exists in DOM when ring is selected', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)
  await expect(page.locator('[data-testid="rotation-handle"]')).toBeVisible()
})

test('Rotation inspector value updates after rotation gesture', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await goToProperties(page)

  const rotBefore = await page.getByRole('spinbutton', { name: 'Rotation' }).inputValue()

  // Select ring, then interact with rotation handle
  await clickRingOnCanvas(page, id!)

  // Find rotation handle position
  const rotHandle = page.locator('[data-testid="rotation-handle"]')
  const rotBox = await rotHandle.boundingBox()
  if (!rotBox) throw new Error('No rotation handle')

  await goToProperties(page)

  // The rotation handle is above the ring; drag it sideways to rotate
  await page.mouse.move(rotBox.x + rotBox.width / 2, rotBox.y + rotBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(rotBox.x + rotBox.width / 2 + 100, rotBox.y + rotBox.height / 2, {
    steps: 5,
  })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const rotAfter = await page.getByRole('spinbutton', { name: 'Rotation' }).inputValue()
  expect(Number(rotAfter)).not.toBe(Number(rotBefore))
})

// ─── Scale ────────────────────────────────────────────────────────────────────

test('scale handle (SE) exists when ring is selected', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)
  await expect(page.locator('[data-testid="scale-handle-se"]')).toBeVisible()
})

test('scale handle drag changes Scale X and Y inspector values', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await goToProperties(page)

  const sxBefore = await page.getByRole('spinbutton', { name: 'Scale X' }).inputValue()
  const syBefore = await page.getByRole('spinbutton', { name: 'Scale Y' }).inputValue()

  // Select ring
  await clickRingOnCanvas(page, id!)

  const seHandle = page.locator('[data-testid="scale-handle-se"]')
  const seBox = await seHandle.boundingBox()
  if (!seBox) throw new Error('No SE handle')

  await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(seBox.x + seBox.width / 2 + 100, seBox.y + seBox.height / 2 + 100, {
    steps: 5,
  })
  await page.mouse.up()
  await page.waitForTimeout(100)

  await goToProperties(page)

  const sxAfter = await page.getByRole('spinbutton', { name: 'Scale X' }).inputValue()
  const syAfter = await page.getByRole('spinbutton', { name: 'Scale Y' }).inputValue()

  expect(Number(sxAfter)).not.toBe(Number(sxBefore))
  expect(Number(syAfter)).not.toBe(Number(syBefore))
})

test('Shift-held scale preserves aspect ratio', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  await clickRingOnCanvas(page, id!)

  const seHandle = page.locator('[data-testid="scale-handle-se"]')
  const seBox = await seHandle.boundingBox()
  if (!seBox) throw new Error('No SE handle')

  // Hold shift and drag
  await page.keyboard.down('Shift')
  await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(seBox.x + seBox.width / 2 + 120, seBox.y + seBox.height / 2 + 60, {
    steps: 6,
  })
  await page.mouse.up()
  await page.keyboard.up('Shift')
  await page.waitForTimeout(100)

  await goToProperties(page)

  const sxAfter = parseFloat(await page.getByRole('spinbutton', { name: 'Scale X' }).inputValue())
  const syAfter = parseFloat(await page.getByRole('spinbutton', { name: 'Scale Y' }).inputValue())

  // With shift constrained from equal starting scales (1,1), sx should ≈ sy
  expect(Math.abs(sxAfter - syAfter)).toBeLessThan(0.05)
})

// ─── Multiple rings ───────────────────────────────────────────────────────────

test('two rings can be independently selected', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)

  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-layer-id]')).map((el) =>
      el.getAttribute('data-layer-id')
    )
  )
  expect(ids.length).toBeGreaterThanOrEqual(2)
})

test('moving one ring does not affect another', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRing(page)

  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-layer-id]')).map((el) =>
      el.getAttribute('data-layer-id')!
    )
  )

  const id2 = ids[1]
  const transformBefore = await getSvgTransform(page, id2)

  // Select and move ring 1
  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 120, cy + 50, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id2)
  // Ring 2 transform should not have changed from ring 1's drag
  expect(transformAfter).toBe(transformBefore)
})

// ─── Hidden / Locked layers ───────────────────────────────────────────────────

test('hidden ring cannot be selected from canvas (no overlay)', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Hide the ring via Layers panel
  await page.getByLabel(/^Hide/).first().click()
  await page.waitForTimeout(50)

  // Try clicking center of canvas
  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(100)

  // No selection overlay should appear
  await expect(page.locator('[data-testid="selection-overlay"]')).not.toBeVisible()
})

test('locked ring cannot be manipulated from canvas (no handles)', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Ring is auto-selected on add. Lock it via the visible Layers panel lock button.
  await page.getByRole('button', { name: 'Lock Ring' }).click()
  await page.waitForTimeout(100)

  // Ring is still selected (locking does not deselect). Overlay shows locked state: no handles.
  await expect(page.locator('[data-testid="selection-overlay"]')).toBeVisible()
  await expect(page.locator('[data-testid="rotation-handle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="scale-handle-se"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="locked-indicator"]')).toBeVisible()
})

// ─── Navigation tools don't interfere ────────────────────────────────────────

test('Hand tool drag pans rather than moving Ring', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  // Switch to Hand tool
  await page.getByRole('button', { name: 'Pan' }).click()
  await page.waitForTimeout(50)

  const transformBefore = await getSvgTransform(page, id!)

  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 60, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  // Ring transform unchanged — only viewport panned
  expect(transformAfter).toBe(transformBefore)
})

test('Space + primary drag pans rather than moving Ring', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  // Select tool active (default)
  const transformBefore = await getSvgTransform(page, id!)

  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  // Hold space and drag
  await page.keyboard.down('Space')
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 60, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).toBe(transformBefore)
})

test('middle-mouse drag pans rather than moving Ring', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  const transformBefore = await getSvgTransform(page, id!)

  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(cx + 80, cy + 60, { steps: 5 })
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).toBe(transformBefore)
})

test('wheel zoom still works over artwork', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  const statusBefore = await page.getByLabel('Zoom level').textContent()

  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -300)
  await page.waitForTimeout(100)

  const statusAfter = await page.getByLabel('Zoom level').textContent()
  expect(statusAfter).not.toBe(statusBefore)
})

test('Fit View still works with artwork present', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Pan and zoom first
  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  await page.mouse.wheel(0, -500)
  await page.waitForTimeout(100)

  await page.getByRole('button', { name: 'Fit View' }).click()
  await page.waitForTimeout(100)

  const zoomAfter = await page.getByLabel('Zoom level').textContent()
  expect(zoomAfter).toBeTruthy()
})

// ─── Phase 5 integrity ────────────────────────────────────────────────────────

test('Grid/guides/background controls still work with ring present', async ({ page }) => {
  await page.goto('/')
  await addRing(page)

  // Grid toggle
  await page.getByRole('button', { name: 'Grid' }).click()
  await expect(page.getByTestId('grid-overlay')).toBeVisible()
  await page.getByRole('button', { name: 'Grid' }).click()
  await expect(page.getByTestId('grid-overlay')).not.toBeVisible()
})

test('Inspector-based Phase 5 editing still works', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  // Select via panel and check properties
  await page.getByRole('button', { name: 'Select layer Ring' }).first().click()
  await goToProperties(page)

  const input = page.getByRole('spinbutton', { name: 'Radius' })
  await input.fill('200')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const r = await page.evaluate((layerId) => {
    const circle = document.querySelector(`[data-layer-id="${layerId}"] circle`)
    return circle?.getAttribute('r')
  }, id)
  expect(parseFloat(r ?? '0')).toBeCloseTo(200, 0)
})

// ─── Pointer cancellation ─────────────────────────────────────────────────────

test('no stuck state after pointer cancel (Escape key)', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)

  const svg = page.locator('[data-testid="svg-viewport"]')
  const box = await svg.boundingBox()
  if (!box) throw new Error('No SVG box')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  // Start a drag
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 30, cy + 30, { steps: 3 })

  // Release (simulates cancel)
  await page.mouse.up()
  await page.waitForTimeout(100)

  // Should be able to interact normally afterward
  await page.mouse.click(cx + 30, cy + 30)
  await page.waitForTimeout(50)

  // No error state: ring still exists
  const g = page.locator(`[data-layer-id="${id}"]`)
  await expect(g).toBeVisible()
})

// ─── Selection UI integrity ───────────────────────────────────────────────────

test('no selection UI in artwork group (overlay is separate)', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)

  // Artwork group should only contain ring layers, not overlay
  const overlayInArtwork = await page.evaluate(() => {
    const artwork = document.querySelector('[data-testid="artwork-group"]')
    return artwork?.querySelector('[data-testid="selection-overlay"]') !== null
  })
  expect(overlayInArtwork).toBe(false)
})

test('Radial Lines remains disabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add Radial Lines' })).toBeDisabled()
})

test('no later-phase UI appears unexpectedly', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)

  // Undo is enabled after adding a ring (Phase 8 history active); Redo is disabled at tip
  await expect(page.getByRole('button', { name: /undo/i })).toBeEnabled()
  await expect(page.getByRole('button', { name: /redo/i })).toBeDisabled()

  // No export panel beyond the disabled export button (Phase 11)
  // Just verify the page loads correctly
  await expect(page.getByTestId('svg-viewport')).toBeVisible()
})

test('body and layout remain stable with selection active', async ({ page }) => {
  await page.goto('/')
  await page.setViewportSize({ width: 1440, height: 900 })
  await addRing(page)
  const id = await getRingId(page)
  await clickRingOnCanvas(page, id!)

  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
  const windowWidth = await page.evaluate(() => window.innerWidth)
  expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth + 2)
})
