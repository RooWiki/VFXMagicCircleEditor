import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── application load ──────────────────────────────────────────────────────

test('application loads without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('')
  await page.waitForLoadState('networkidle')
  expect(errors).toHaveLength(0)
})

// ─── SVG viewport existence ────────────────────────────────────────────────

test('SVG viewport element exists', async ({ page }) => {
  await page.goto('')
  await expect(page.getByTestId('svg-viewport')).toBeVisible()
})

test('SVG viewBox has four finite numeric values', async ({ page }) => {
  await page.goto('')
  const svg = page.getByTestId('svg-viewport')
  const vb = await svg.getAttribute('viewBox')
  expect(vb).toBeTruthy()
  const parts = (vb ?? '').split(' ').map(Number)
  expect(parts).toHaveLength(4)
  parts.forEach((v) => expect(isFinite(v)).toBe(true))
})

// ─── initial artboard fit ──────────────────────────────────────────────────

test('artboard background is visible after initial fit-to-view', async ({ page }) => {
  await page.goto('')
  await expect(page.getByTestId('artboard-background')).toBeVisible()
})

test('artboard border is visible after initial fit-to-view', async ({ page }) => {
  await page.goto('')
  await expect(page.getByTestId('artboard-border')).toBeVisible()
})

test('artboard fits within workspace bounds', async ({ page }) => {
  await page.goto('')

  const workspaceBox = await page.getByRole('main', { name: 'Canvas workspace' }).boundingBox()
  const artboardBox = await page.getByTestId('artboard-border').boundingBox()

  expect(workspaceBox).not.toBeNull()
  expect(artboardBox).not.toBeNull()

  // Artboard should be inside the workspace
  expect(artboardBox!.x).toBeGreaterThanOrEqual(workspaceBox!.x - 1)
  expect(artboardBox!.y).toBeGreaterThanOrEqual(workspaceBox!.y - 1)
  expect(artboardBox!.x + artboardBox!.width).toBeLessThanOrEqual(
    workspaceBox!.x + workspaceBox!.width + 1
  )
})

// ─── wheel zoom ────────────────────────────────────────────────────────────

test('wheel zoom changes the viewBox and status percentage', async ({ page }) => {
  await page.goto('')

  const svg = page.getByTestId('svg-viewport')
  const zoomLabel = page.getByLabel('Zoom level')

  const viewBoxBefore = await svg.getAttribute('viewBox')
  const zoomBefore = await zoomLabel.textContent()

  // Scroll to zoom in
  await page.mouse.move(720, 450)
  await page.mouse.wheel(0, -300)
  await page.waitForTimeout(100)

  const viewBoxAfter = await svg.getAttribute('viewBox')
  const zoomAfter = await zoomLabel.textContent()

  expect(viewBoxAfter).not.toBe(viewBoxBefore)
  expect(zoomAfter).not.toBe(zoomBefore)
  // Zoomed in → percentage should be higher
  const pctBefore = parseInt(zoomBefore?.replace('%', '') ?? '0', 10)
  const pctAfter = parseInt(zoomAfter?.replace('%', '') ?? '0', 10)
  expect(pctAfter).toBeGreaterThan(pctBefore)
})

test('body does not scroll while zooming', async ({ page }) => {
  await page.goto('')
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.move(720, 450)
  await page.mouse.wheel(0, -500)
  await page.waitForTimeout(100)
  const scrollAfter = await page.evaluate(() => window.scrollY)
  expect(scrollAfter).toBe(scrollBefore)
})

test('zoom around pointer keeps the logical point approximately anchored', async ({ page }) => {
  await page.goto('')

  const svg = page.getByTestId('svg-viewport')

  const parseVb = async () => {
    const vb = (await svg.getAttribute('viewBox')) ?? ''
    const [x, y, w, h] = vb.split(' ').map(Number)
    return { x, y, w, h }
  }

  const svgBox = await svg.boundingBox()
  expect(svgBox).not.toBeNull()
  const vw = svgBox!.width
  const vh = svgBox!.height

  // Use page coordinates at roughly 1/3 from the top-left of the SVG
  const pageX = svgBox!.x + vw * 0.33
  const pageY = svgBox!.y + vh * 0.33
  // SVG-local coordinates (what the component sees)
  const svgLocalX = pageX - svgBox!.x
  const svgLocalY = pageY - svgBox!.y

  const toWorldLocal = (
    sx: number,
    sy: number,
    vb: { x: number; y: number; w: number; h: number }
  ) => ({
    wx: vb.x + (sx / vw) * vb.w,
    wy: vb.y + (sy / vh) * vb.h,
  })

  const vb1 = await parseVb()
  const world1 = toWorldLocal(svgLocalX, svgLocalY, vb1)

  await page.mouse.move(pageX, pageY)
  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(100)

  const vb2 = await parseVb()
  const world2 = toWorldLocal(svgLocalX, svgLocalY, vb2)

  // The world point under the cursor should be approximately the same
  // Tolerance of 3 logical units accounts for floating-point rounding
  expect(Math.abs(world2.wx - world1.wx)).toBeLessThan(3)
  expect(Math.abs(world2.wy - world1.wy)).toBeLessThan(3)
})

// ─── middle-mouse panning ──────────────────────────────────────────────────

test('middle-mouse drag changes the viewBox center', async ({ page }) => {
  await page.goto('')

  const svg = page.getByTestId('svg-viewport')
  const viewBoxBefore = await svg.getAttribute('viewBox')

  // Middle-mouse drag
  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(820, 450)
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(50)

  const viewBoxAfter = await svg.getAttribute('viewBox')
  expect(viewBoxAfter).not.toBe(viewBoxBefore)
})

test('body does not scroll while middle-mouse panning', async ({ page }) => {
  await page.goto('')
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(720, 650)
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(50)
  const scrollAfter = await page.evaluate(() => window.scrollY)
  expect(scrollAfter).toBe(scrollBefore)
})

// ─── hand tool panning ─────────────────────────────────────────────────────

test('Hand-tool primary drag pans the canvas', async ({ page }) => {
  await page.goto('')

  // Activate hand tool
  await page.getByRole('button', { name: 'Pan' }).click()

  const svg = page.getByTestId('svg-viewport')
  const viewBoxBefore = await svg.getAttribute('viewBox')

  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(820, 450)
  await page.mouse.up({ button: 'left' })
  await page.waitForTimeout(50)

  const viewBoxAfter = await svg.getAttribute('viewBox')
  expect(viewBoxAfter).not.toBe(viewBoxBefore)
})

// ─── Space + drag panning ──────────────────────────────────────────────────

test('Space + primary drag pans the canvas', async ({ page }) => {
  await page.goto('')

  // Focus workspace first
  await page.getByTestId('svg-viewport').click()

  const svg = page.getByTestId('svg-viewport')
  const viewBoxBefore = await svg.getAttribute('viewBox')

  await page.keyboard.down('Space')
  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(820, 450)
  await page.mouse.up({ button: 'left' })
  await page.keyboard.up('Space')
  await page.waitForTimeout(50)

  const viewBoxAfter = await svg.getAttribute('viewBox')
  expect(viewBoxAfter).not.toBe(viewBoxBefore)
})

// ─── Fit View ─────────────────────────────────────────────────────────────

test('Fit View restores the centered artboard after panning', async ({ page }) => {
  await page.goto('')

  // Pan away
  await page.getByRole('button', { name: 'Pan' }).click()
  await page.mouse.move(720, 450)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(1020, 750)
  await page.mouse.up({ button: 'left' })
  await page.waitForTimeout(50)

  // Fit View
  await page.getByRole('button', { name: 'Fit View' }).click()
  await page.waitForTimeout(100)

  // Status bar zoom should be updated
  const zoomText = await page.getByLabel('Zoom level').textContent()
  expect(zoomText).toMatch(/^\d+%$/)

  // Artboard should still be visible
  await expect(page.getByTestId('artboard-border')).toBeVisible()
})

// ─── grid and guides ──────────────────────────────────────────────────────

test('Grid toggle shows and hides the grid overlay', async ({ page }) => {
  await page.goto('')

  // Grid is off by default
  await expect(page.getByTestId('grid-overlay')).not.toBeVisible()

  // Enable grid via ViewControls
  await page.getByRole('button', { name: 'Toggle grid' }).click()
  await expect(page.getByTestId('grid-overlay')).toBeVisible()

  // Disable grid
  await page.getByRole('button', { name: 'Toggle grid' }).click()
  await expect(page.getByTestId('grid-overlay')).not.toBeVisible()
})

test('Guide toggle shows and hides the guides overlay', async ({ page }) => {
  await page.goto('')

  await expect(page.getByTestId('guides-overlay')).not.toBeVisible()

  await page.getByRole('button', { name: 'Toggle guides' }).click()
  await expect(page.getByTestId('guides-overlay')).toBeVisible()

  await page.getByRole('button', { name: 'Toggle guides' }).click()
  await expect(page.getByTestId('guides-overlay')).not.toBeVisible()
})

// ─── preview background ────────────────────────────────────────────────────

test('Preview background buttons are visible', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('button', { name: 'Preview background: Dark' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview background: Light' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview background: Checker' })).toBeVisible()
})

test('Switching to light background changes artboard fill', async ({ page }) => {
  await page.goto('')

  const artboard = page.getByTestId('artboard-background')
  const fillBefore = await artboard.getAttribute('fill')

  await page.getByRole('button', { name: 'Preview background: Light' }).click()

  const fillAfter = await artboard.getAttribute('fill')
  expect(fillAfter).not.toBe(fillBefore)
})

test('Switching to transparent background sets checkerboard fill', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Preview background: Checker' }).click()
  const fill = await page.getByTestId('artboard-background').getAttribute('fill')
  expect(fill).toMatch(/^url\(#/)
})

// ─── layout integrity ─────────────────────────────────────────────────────

test('existing layout regions do not overlap', async ({ page }) => {
  await page.goto('')
  const topBarBox = await page.getByRole('banner').boundingBox()
  const workspaceBox = await page.getByRole('main', { name: 'Canvas workspace' }).boundingBox()
  const statusBarBox = await page.getByRole('contentinfo').boundingBox()

  expect(topBarBox).not.toBeNull()
  expect(workspaceBox).not.toBeNull()
  expect(statusBarBox).not.toBeNull()

  expect(topBarBox!.y + topBarBox!.height).toBeLessThanOrEqual(workspaceBox!.y + 1)
  expect(workspaceBox!.y + workspaceBox!.height).toBeLessThanOrEqual(statusBarBox!.y + 1)
})

test('inspector and animation tabs work with SVG viewport active', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('tab', { name: 'Inspector' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await page.getByRole('tab', { name: 'Animation' }).click()
  await expect(page.getByRole('tab', { name: 'Animation' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(page.getByText('Select a layer to configure animation.')).toBeVisible()
})

// ─── Radial Lines is now enabled (Phase 9) ────────────────────────────────

test('Radial Lines tool button is enabled', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('button', { name: 'Add Radial Lines' })).not.toBeDisabled()
})

// ─── Add Ring, Hand and Fit View are enabled ──────────────────────────────

test('Add Ring, Hand tool and Fit View buttons are enabled', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('button', { name: 'Add Ring' })).not.toBeDisabled()
  await expect(page.getByRole('button', { name: 'Pan' })).not.toBeDisabled()
  await expect(page.getByRole('button', { name: 'Fit View' })).not.toBeDisabled()
})
