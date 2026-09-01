/**
 * Phase 9 E2E — Radial-Lines Layer
 *
 * Covers: creation, inspector edits, canvas transforms, precision nudge,
 * layer management, mixed-layer stacking, shortcuts/history, viewport,
 * and regression against Ring functionality.
 */

import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addRL(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Radial Lines' }).click()
  await page.waitForTimeout(50)
}

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function getRLId(page: Parameters<typeof test>[1]['page'], index = 0) {
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="radial-lines-layer-"]')).map((el) =>
      el.getAttribute('data-layer-id')
    )
  )
  return ids[index] ?? null
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

async function openLayers(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('tab', { name: 'Layers' }).click()
  await page.waitForTimeout(30)
}

// Returns screen position of the MIDPOINT of the first visible radial line.
// Midpoint radius ≈ (innerRadius + outerRadius) / 2, which is inside the
// SelectionOverlay move-target circle's stroke (at r = outerRadius ± strokeWidth/2).
// Clicking here hits the artwork hit-target, not the overlay move-target.
async function getRLLineMidPos(page: Parameters<typeof test>[1]['page'], layerId: string) {
  return page.evaluate((id) => {
    const rlGroup = document.querySelector(`[data-testid="radial-lines-layer-${id}"]`)
    const svg = document.querySelector('[data-testid="svg-viewport"]') as SVGSVGElement
    if (!rlGroup || !svg) return null
    const line = rlGroup.querySelector('line')
    if (!line) return null
    const x1 = parseFloat(line.getAttribute('x1') || '0')
    const y1 = parseFloat(line.getAttribute('y1') || '0')
    const x2 = parseFloat(line.getAttribute('x2') || '0')
    const y2 = parseFloat(line.getAttribute('y2') || '0')
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const ctm = (rlGroup as SVGGraphicsElement).getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = midX
    pt.y = midY
    const screenPt = pt.matrixTransform(ctm)
    return { x: screenPt.x, y: screenPt.y }
  }, layerId)
}

// Returns screen position of the OUTER ENDPOINT of the first visible radial line.
// Outer endpoint is at r = outerRadius, which coincides with the SelectionOverlay
// move-target circle stroke — useful for overlay-drag tests.
async function getRLLinePos(page: Parameters<typeof test>[1]['page'], layerId: string) {
  return page.evaluate((id) => {
    const rlGroup = document.querySelector(`[data-testid="radial-lines-layer-${id}"]`)
    const svg = document.querySelector('[data-testid="svg-viewport"]') as SVGSVGElement
    if (!rlGroup || !svg) return null
    const line = rlGroup.querySelector('line')
    if (!line) return null
    const x2 = parseFloat(line.getAttribute('x2') || '0')
    const y2 = parseFloat(line.getAttribute('y2') || '0')
    // Use outer endpoint so the click lands on the SelectionOverlay move target circle
    const midX = x2
    const midY = y2
    const ctm = (rlGroup as SVGGraphicsElement).getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = midX
    pt.y = midY
    const screenPt = pt.matrixTransform(ctm)
    return { x: screenPt.x, y: screenPt.y }
  }, layerId)
}

async function getSvgTransform(page: Parameters<typeof test>[1]['page'], layerId: string) {
  return page.evaluate((id) => {
    return document.querySelector(`[data-layer-id="${id}"]`)?.getAttribute('transform')
  }, layerId)
}

function undoBtn(page: Parameters<typeof test>[1]['page']) {
  return page.getByRole('button', { name: 'Undo' })
}

// ─── A. CREATION ──────────────────────────────────────────────────────────────

test('Add Radial Lines button is enabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add Radial Lines' })).not.toBeDisabled()
})

test('clicking Add Radial Lines creates a layer in the SVG artwork', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const count = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(count).toBe(1)
})

test('Radial Lines layer appears in the Layers panel', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const names = await getLayerNames(page)
  expect(names).toContain('Radial Lines')
})

test('Radial Lines layer is auto-selected after adding', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await expect(page.getByTestId('selection-overlay')).toBeVisible()
})

test('Radial Lines inspector appears when layer is selected', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  await expect(page.getByTestId('radial-lines-inspector')).toBeVisible()
})

test('SVG contains line elements after adding Radial Lines', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)
  expect(id).not.toBeNull()
  const lineCount = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    return g?.querySelectorAll('line').length ?? 0
  }, id)
  expect(lineCount).toBeGreaterThan(0)
})

test('Undo removes the Radial Lines layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  expect(await getLayerCount(page)).toBe(1)
  await undoBtn(page).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

// ─── B. INSPECTOR ─────────────────────────────────────────────────────────────

test('inspector shows Count, Inner Radius, Outer Radius, Start Angle fields', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  await expect(page.getByRole('spinbutton', { name: 'Count' })).toBeVisible()
  await expect(page.getByLabel('Inner Radius')).toBeVisible()
  await expect(page.getByLabel('Outer Radius')).toBeVisible()
  await expect(page.getByLabel('Start Angle')).toBeVisible()
})

test('editing Count changes the number of radial lines in the SVG', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const countInput = page.getByRole('spinbutton', { name: 'Count' })
  await countInput.fill('12')
  await countInput.press('Tab')
  await page.waitForTimeout(50)

  const lineCount = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    // Only visible lines (not transparent hit targets)
    return Array.from(g?.querySelectorAll('line') ?? []).filter(
      (l) => l.getAttribute('stroke') !== 'transparent'
    ).length
  }, id)
  expect(lineCount).toBe(12)
})

test('editing Inner Radius updates the SVG line start coordinates', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const lineBefore = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    const line = g?.querySelector('line')
    return { y1: line?.getAttribute('y1') }
  }, id)

  const input = page.getByLabel('Inner Radius')
  await input.fill('50')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const lineAfter = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    const line = g?.querySelector('line')
    return { y1: line?.getAttribute('y1') }
  }, id)

  expect(lineAfter.y1).not.toBe(lineBefore.y1)
})

test('editing Outer Radius updates the SVG line end coordinates', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const lineBefore = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    const line = g?.querySelector('line')
    return { y2: line?.getAttribute('y2') }
  }, id)

  const input = page.getByLabel('Outer Radius')
  await input.fill('500')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const lineAfter = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    const line = g?.querySelector('line')
    return { y2: line?.getAttribute('y2') }
  }, id)

  expect(lineAfter.y2).not.toBe(lineBefore.y2)
})

test('editing Start Angle rotates the first line', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const before = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    const line = g?.querySelector('line')
    return { x1: line?.getAttribute('x1'), y1: line?.getAttribute('y1') }
  }, id)

  const input = page.getByLabel('Start Angle')
  await input.fill('45')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const after = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    const line = g?.querySelector('line')
    return { x1: line?.getAttribute('x1'), y1: line?.getAttribute('y1') }
  }, id)

  expect(after.x1).not.toBe(before.x1)
  expect(after.y1).not.toBe(before.y1)
})

test('editing Thickness changes the stroke-width in SVG', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const swBefore = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    return g?.querySelector('line')?.getAttribute('stroke-width') ?? null
  }, id)

  const input = page.getByLabel('Thickness')
  await input.fill('8')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const swAfter = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-testid="radial-lines-layer-${layerId}"]`)
    return g?.querySelector('line')?.getAttribute('stroke-width') ?? null
  }, id)

  expect(swAfter).not.toBe(swBefore)
  expect(parseFloat(swAfter ?? '0')).toBeCloseTo(8, 0)
})

test('Opacity slider updates layer group opacity', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const slider = page.getByLabel('Opacity')
  await slider.fill('40')
  await page.waitForTimeout(50)

  const opacity = await page.evaluate((layerId) => {
    const g = document.querySelector(`[data-layer-id="${layerId}"]`)
    return g?.getAttribute('opacity')
  }, id)
  expect(parseFloat(opacity ?? '1')).toBeCloseTo(0.4, 1)
})

test('Count change is undoable', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const countInput = page.getByRole('spinbutton', { name: 'Count' })
  const originalCount = await countInput.inputValue()

  await countInput.fill('16')
  await countInput.press('Tab')
  await page.waitForTimeout(50)

  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(30)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  await openLayers(page)
  const names = await getLayerNames(page)
  await selectLayerByName(page, names[0])
  await openProperties(page)
  await expect(page.getByRole('spinbutton', { name: 'Count' })).toHaveValue(originalCount)
})

test('Count change is redoable', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const countInput = page.getByRole('spinbutton', { name: 'Count' })
  await countInput.fill('16')
  await countInput.press('Tab')
  await page.waitForTimeout(50)

  await page.getByRole('main', { name: 'Canvas workspace' }).click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(30)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(50)

  await openLayers(page)
  const names = await getLayerNames(page)
  await selectLayerByName(page, names[0])
  await openProperties(page)
  await expect(page.getByRole('spinbutton', { name: 'Count' })).toHaveValue('16')
})

// ─── C. CANVAS TRANSFORMS ─────────────────────────────────────────────────────

test('X inspector field updates the SVG transform', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const input = page.getByRole('spinbutton', { name: 'X', exact: true })
  await input.fill('100')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await getSvgTransform(page, id!)
  expect(transform).toContain('translate(100,')
})

test('Y inspector field updates the SVG transform', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const input = page.getByRole('spinbutton', { name: 'Y', exact: true })
  await input.fill('50')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await getSvgTransform(page, id!)
  expect(transform).toContain(', 50)')
})

test('Rotation field updates the SVG transform', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const input = page.getByLabel('Rotation')
  await input.fill('45')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await getSvgTransform(page, id!)
  expect(transform).toContain('rotate(45)')
})

test('Scale X field updates the SVG transform', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)
  const id = await getRLId(page)

  const input = page.getByLabel('Scale X')
  await input.fill('2')
  await input.press('Tab')
  await page.waitForTimeout(50)

  const transform = await getSvgTransform(page, id!)
  expect(transform).toContain('scale(2,')
})

test('move via canvas drag changes the transform', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)
  const transformBefore = await getSvgTransform(page, id!)

  const pos = await getRLLinePos(page, id!)
  if (!pos) throw new Error('Could not determine RL line position')

  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y + 40, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).not.toBe(transformBefore)
})

test('move is undoable via Ctrl+Z', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)
  const transformBefore = await getSvgTransform(page, id!)

  const pos = await getRLLinePos(page, id!)
  if (!pos) throw new Error('Could not determine RL line position')
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y + 40, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).toBe(transformBefore)
})

test('move is redoable via Ctrl+Y', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)

  const pos = await getRLLinePos(page, id!)
  if (!pos) throw new Error('Could not determine RL line position')
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y + 40, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfterMove = await getSvgTransform(page, id!)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(50)

  const transformAfterRedo = await getSvgTransform(page, id!)
  expect(transformAfterRedo).toBe(transformAfterMove)
})

test('rotation handle exists when Radial Lines is selected', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await expect(page.locator('[data-testid="rotation-handle"]')).toBeVisible()
})

test('rotate gesture changes Rotation inspector value', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const rotBefore = await page.getByRole('spinbutton', { name: 'Rotation' }).inputValue()

  const rotHandle = page.locator('[data-testid="rotation-handle"]')
  const rotBox = await rotHandle.boundingBox()
  if (!rotBox) throw new Error('No rotation handle')

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

test('rotate is undoable', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const rotBefore = await page.getByRole('spinbutton', { name: 'Rotation' }).inputValue()

  const rotHandle = page.locator('[data-testid="rotation-handle"]')
  const rotBox = await rotHandle.boundingBox()
  if (!rotBox) throw new Error('No rotation handle')

  await page.mouse.move(rotBox.x + rotBox.width / 2, rotBox.y + rotBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(rotBox.x + rotBox.width / 2 + 100, rotBox.y + rotBox.height / 2, {
    steps: 5,
  })
  await page.mouse.up()
  await page.waitForTimeout(100)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  await expect(page.getByRole('spinbutton', { name: 'Rotation' })).toHaveValue(rotBefore)
})

test('scale handle exists when Radial Lines is selected', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await expect(page.locator('[data-testid="scale-handle-se"]')).toBeVisible()
})

test('scale handle drag changes Scale X/Y inspector values', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const sxBefore = await page.getByRole('spinbutton', { name: 'Scale X' }).inputValue()

  const handle = page.locator('[data-testid="scale-handle-se"]')
  const handleBox = await handle.boundingBox()
  if (!handleBox) throw new Error('No scale handle')

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 100,
    handleBox.y + handleBox.height / 2 + 100,
    { steps: 5 }
  )
  await page.mouse.up()
  await page.waitForTimeout(100)

  const sxAfter = await page.getByRole('spinbutton', { name: 'Scale X' }).inputValue()
  expect(Number(sxAfter)).not.toBe(Number(sxBefore))
})

test('scale is undoable', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const sxBefore = await page.getByRole('spinbutton', { name: 'Scale X' }).inputValue()

  const handle = page.locator('[data-testid="scale-handle-se"]')
  const handleBox = await handle.boundingBox()
  if (!handleBox) throw new Error('No scale handle')

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 100,
    handleBox.y + handleBox.height / 2 + 100,
    { steps: 5 }
  )
  await page.mouse.up()
  await page.waitForTimeout(100)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  await expect(page.getByRole('spinbutton', { name: 'Scale X' })).toHaveValue(sxBefore)
})

// ─── D. PRECISION ─────────────────────────────────────────────────────────────

test('ArrowRight nudges Radial Lines X by 1', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initial = await xInput.inputValue()

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)

  const after = await xInput.inputValue()
  expect(Number(after)).toBe(Number(initial) + 1)
})

test('Shift+ArrowRight nudges Radial Lines X by 10', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initial = await xInput.inputValue()

  await page.keyboard.press('Shift+ArrowRight')
  await page.waitForTimeout(50)

  const after = await xInput.inputValue()
  expect(Number(after)).toBe(Number(initial) + 10)
})

test('nudge is undoable with Ctrl+Z', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  const initial = await xInput.inputValue()

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  await expect(xInput).toHaveValue(initial)
})

test('Center button resets position to 0,0', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  // Move layer away from center
  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  await xInput.fill('150')
  await xInput.press('Tab')
  await page.waitForTimeout(50)

  // Center via action bar
  await openLayers(page)
  await page.getByRole('button', { name: 'Center selected layer on canvas' }).click()
  await page.waitForTimeout(50)

  await openProperties(page)
  await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('0')
  await expect(page.getByRole('spinbutton', { name: 'Y', exact: true })).toHaveValue('0')
})

test('Center is undoable', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await openProperties(page)

  const xInput = page.getByRole('spinbutton', { name: 'X', exact: true })
  await xInput.fill('200')
  await xInput.press('Tab')
  await page.waitForTimeout(50)

  await openLayers(page)
  await page.getByRole('button', { name: 'Center selected layer on canvas' }).click()
  await page.waitForTimeout(50)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  await openProperties(page)
  await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('200')
})

// ─── E. LAYER MANAGEMENT ──────────────────────────────────────────────────────

test('Duplicate creates an independent copy', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.getByRole('button', { name: 'Duplicate selected layer' }).click()
  await page.waitForTimeout(50)

  expect(await getLayerCount(page)).toBe(2)
  const names = await getLayerNames(page)
  expect(names.some((n) => n.startsWith('Copy of'))).toBe(true)
})

test('Rename updates the layer name in the Layers panel', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)

  await page.getByRole('button', { name: `Select layer ${name}` }).dblclick()
  await page.waitForTimeout(30)

  const input = page.getByTestId('layer-rename-input')
  await input.selectText()
  await input.fill('My Radial Lines')
  await input.press('Enter')
  await page.waitForTimeout(50)

  const updatedNames = await getLayerNames(page)
  expect(updatedNames).toContain('My Radial Lines')
})

test('visibility toggle hides the Radial Lines artwork', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)

  await page.getByLabel(/^Hide/).first().click()
  await page.waitForTimeout(50)

  const visible = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`) !== null,
    id
  )
  expect(visible).toBe(false)
})

test('showing the hidden layer restores artwork', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)

  await page.getByLabel(/^Hide/).first().click()
  await page.waitForTimeout(50)
  await page.getByLabel(/^Show/).first().click()
  await page.waitForTimeout(50)

  const visible = await page.evaluate(
    (layerId) => document.querySelector(`[data-layer-id="${layerId}"]`) !== null,
    id
  )
  expect(visible).toBe(true)
})

test('lock prevents transform via inspector', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  const id = await getRLId(page)
  const transformBefore = await getSvgTransform(page, id!)

  // Lock it
  await page.getByRole('button', { name: `Lock ${name}` }).click()
  await page.waitForTimeout(30)

  await openProperties(page)
  await page.getByRole('spinbutton', { name: 'X', exact: true }).fill('999')
  await page.getByRole('spinbutton', { name: 'X', exact: true }).press('Tab')
  await page.waitForTimeout(50)

  // Store rejects the change for a locked layer — SVG transform is unchanged
  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).toBe(transformBefore)
})

test('Delete removes the Radial Lines layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.getByRole('button', { name: 'Delete selected layer' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)
})

test('Delete is undoable — Undo restores the layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  expect(await getLayerCount(page)).toBe(1)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)
  await page.getByRole('button', { name: 'Delete selected layer' }).click()
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

// ─── F. MIXED LAYERS ──────────────────────────────────────────────────────────

test('Ring and Radial Lines both appear in artwork group', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRL(page)

  const count = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(count).toBe(2)
})

test('Tab cycles between Ring and Radial Lines', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRL(page)

  const idBefore = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(50)
  const idAfter = await page.getByTestId('selection-overlay').getAttribute('data-layer-id')

  expect(idAfter).not.toBe(idBefore)
})

test('SVG layer order changes after reorder via layers panel', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRL(page)

  const orderBefore = await page.evaluate(() => {
    const artwork = document.querySelector('[data-testid="artwork-group"]')
    return Array.from(artwork?.children ?? []).map((el) => el.getAttribute('data-testid'))
  })

  // Drag the top layer (Radial Lines, index 0) to below Ring (index 1)
  const layerItems = page.locator('[data-testid^="layer-name-"]')
  const topItem = layerItems.first()
  const bottomItem = layerItems.last()
  const topBox = await topItem.boundingBox()
  const bottomBox = await bottomItem.boundingBox()

  if (!topBox || !bottomBox) throw new Error('No layer items')
  await page.mouse.move(topBox.x + topBox.width / 2, topBox.y + topBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(bottomBox.x + bottomBox.width / 2, bottomBox.y + bottomBox.height + 5, {
    steps: 5,
  })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const orderAfter = await page.evaluate(() => {
    const artwork = document.querySelector('[data-testid="artwork-group"]')
    return Array.from(artwork?.children ?? []).map((el) => el.getAttribute('data-testid'))
  })

  // The stacking order in the SVG should have changed
  expect(orderAfter.join(',')).not.toBe(orderBefore.join(','))
})

// ─── G. SHORTCUTS / HISTORY ───────────────────────────────────────────────────

test('Ctrl+D duplicates Radial Lines layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)

  await page.keyboard.press('Control+d')
  await page.waitForTimeout(50)

  expect(await getLayerCount(page)).toBe(2)
})

test('Delete key removes selected Radial Lines layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const [name] = await getLayerNames(page)
  await selectLayerByName(page, name)

  await page.keyboard.press('Delete')
  await page.waitForTimeout(50)

  expect(await getLayerCount(page)).toBe(0)
})

test('Ctrl+Z undoes Radial Lines addition', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  expect(await getLayerCount(page)).toBe(1)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  expect(await getLayerCount(page)).toBe(0)
})

test('Ctrl+Shift+Z redoes after undo', async ({ page }) => {
  await page.goto('/')
  await addRL(page)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(0)

  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(50)
  expect(await getLayerCount(page)).toBe(1)
})

test('Ctrl+Y redoes after undo', async ({ page }) => {
  await page.goto('/')
  await addRL(page)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(50)

  expect(await getLayerCount(page)).toBe(1)
})

test('Delete key inside inspector field does not delete layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const countInput = page.getByRole('spinbutton', { name: 'Count' })
  await countInput.click()
  await page.keyboard.press('Delete')
  await page.waitForTimeout(50)

  expect(await getLayerCount(page)).toBe(1)
})

// ─── H. VIEWPORT ──────────────────────────────────────────────────────────────

test('Ctrl+0 Fit View remains functional with Radial Lines present', async ({ page }) => {
  await page.goto('/')
  await addRL(page)

  await page.keyboard.press('Control+0')
  await page.waitForTimeout(100)

  const zoomText = await page.getByLabel('Zoom level').textContent()
  expect(zoomText).toMatch(/^\d+%$/)
  await expect(page.getByTestId('artboard-border')).toBeVisible()
})

test('wheel zoom works with Radial Lines present', async ({ page }) => {
  await page.goto('/')
  await addRL(page)

  const svg = page.getByTestId('svg-viewport')
  const vbBefore = await svg.getAttribute('viewBox')

  await page.mouse.move(720, 450)
  await page.mouse.wheel(0, -300)
  await page.waitForTimeout(100)

  const vbAfter = await svg.getAttribute('viewBox')
  expect(vbAfter).not.toBe(vbBefore)
})

// ─── I. REGRESSION ────────────────────────────────────────────────────────────

test('Ring layer still works after adding Radial Lines', async ({ page }) => {
  await page.goto('/')
  await addRing(page)
  await addRL(page)

  // Switch to Ring selection
  const names = await getLayerNames(page)
  const ringName = names.find((n) => n === 'Ring' || !n.includes('Radial'))
  if (!ringName) throw new Error('Ring not found')
  await selectLayerByName(page, ringName)
  await openProperties(page)

  await expect(page.getByTestId('ring-inspector')).toBeVisible()
})

test('no console errors during Radial Lines workflow', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/')
  await addRL(page)
  await openProperties(page)

  const countInput = page.getByRole('spinbutton', { name: 'Count' })
  await countInput.fill('12')
  await countInput.press('Tab')
  await page.waitForTimeout(50)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(50)

  expect(errors).toHaveLength(0)
})

// ─── J. ARTWORK DRAG (line hit-target, not overlay move-target) ───────────────

test('drag directly on radial line artwork moves the layer', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)
  const transformBefore = await getSvgTransform(page, id!)

  // Use the midpoint of the first line — this is at r ≈ (innerRadius+outerRadius)/2,
  // well inside the SelectionOverlay move-target circle's stroke (at r = outerRadius).
  // So this gesture starts from the artwork hit-target, not the overlay.
  const pos = await getRLLineMidPos(page, id!)
  if (!pos) throw new Error('Could not determine mid-line position')

  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y + 60, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfter = await getSvgTransform(page, id!)
  expect(transformAfter).not.toBe(transformBefore)
})

test('Ctrl+Z undoes artwork drag and restores original position', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)
  const transformBefore = await getSvgTransform(page, id!)

  const pos = await getRLLineMidPos(page, id!)
  if (!pos) throw new Error('Could not determine mid-line position')

  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y + 60, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)

  const transformAfterUndo = await getSvgTransform(page, id!)
  expect(transformAfterUndo).toBe(transformBefore)
})

test('Ctrl+Y redoes artwork drag and restores dragged position', async ({ page }) => {
  await page.goto('/')
  await addRL(page)
  const id = await getRLId(page)

  const pos = await getRLLineMidPos(page, id!)
  if (!pos) throw new Error('Could not determine mid-line position')

  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.mouse.move(pos.x + 80, pos.y + 60, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(100)

  const transformAfterDrag = await getSvgTransform(page, id!)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(50)

  const transformAfterRedo = await getSvgTransform(page, id!)
  expect(transformAfterRedo).toBe(transformAfterDrag)
})
