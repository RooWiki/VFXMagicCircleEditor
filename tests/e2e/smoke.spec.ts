import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('application loads with editor shell visible', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Magic Circle Editor/)
  await expect(page.getByText('Magic Circle Editor').first()).toBeVisible()
})

test('top bar is visible with all controls', async ({ page }) => {
  await page.goto('/')
  const header = page.getByRole('banner')
  await expect(header).toBeVisible()
  await expect(header.getByText('Magic Circle Editor')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()
})

test('Phase 11 toolbar actions: file/export enabled, Undo/Redo disabled on fresh load', async ({
  page,
}) => {
  await page.goto('/')
  // Phase 10: New, Open, Save are implemented and enabled
  await expect(page.getByRole('button', { name: 'New' })).not.toBeDisabled()
  await expect(page.getByRole('button', { name: 'Open' })).not.toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  // Undo/Redo disabled on fresh load (empty history)
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled()
  // Phase 11: Export is now enabled
  await expect(page.getByRole('button', { name: 'Export' })).not.toBeDisabled()
})

test('tool rail is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Tools' })).toBeVisible()
})

test('canvas workspace is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('main', { name: 'Canvas workspace' })).toBeVisible()
})

test('right sidebar is visible with tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('complementary', { name: 'Layers and Properties' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Layers' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Properties' })).toBeVisible()
})

test('status bar is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('switching between Layers and Properties tabs works', async ({ page }) => {
  await page.goto('/')
  // Layers tab is selected by default
  await expect(page.getByRole('tab', { name: 'Layers' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('No layers yet')).toBeVisible()

  // Switch to Properties
  await page.getByRole('tab', { name: 'Properties' }).click()
  await expect(page.getByRole('tab', { name: 'Properties' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(page.getByText('Select a layer to edit its properties.')).toBeVisible()
})

test('no console errors on load', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(errors).toHaveLength(0)
})

test('no unexpected horizontal scrolling at 1280x720', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test('no unexpected horizontal scrolling at 1920x1080', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test('shell regions meet minimum dimensions at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const topBarBox = await page.getByRole('banner').boundingBox()
  const toolRailBox = await page.getByRole('navigation', { name: 'Tools' }).boundingBox()
  const sidebarBox = await page
    .getByRole('complementary', { name: 'Layers and Properties' })
    .boundingBox()
  const statusBarBox = await page.getByRole('contentinfo').boundingBox()
  const workspaceBox = await page.getByRole('main', { name: 'Canvas workspace' }).boundingBox()

  expect(topBarBox).not.toBeNull()
  expect(toolRailBox).not.toBeNull()
  expect(sidebarBox).not.toBeNull()
  expect(statusBarBox).not.toBeNull()
  expect(workspaceBox).not.toBeNull()

  expect(topBarBox!.height).toBeGreaterThanOrEqual(40)
  expect(toolRailBox!.width).toBeGreaterThanOrEqual(48)
  expect(sidebarBox!.width).toBeGreaterThanOrEqual(288)
  expect(statusBarBox!.height).toBeGreaterThanOrEqual(24)
})

test('shell regions do not overlap at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const topBarBox = await page.getByRole('banner').boundingBox()
  const workspaceBox = await page.getByRole('main', { name: 'Canvas workspace' }).boundingBox()
  const statusBarBox = await page.getByRole('contentinfo').boundingBox()

  expect(topBarBox).not.toBeNull()
  expect(workspaceBox).not.toBeNull()
  expect(statusBarBox).not.toBeNull()

  // Top bar ends before workspace begins
  expect(topBarBox!.y + topBarBox!.height).toBeLessThanOrEqual(workspaceBox!.y + 1)
  // Workspace ends before status bar begins
  expect(workspaceBox!.y + workspaceBox!.height).toBeLessThanOrEqual(statusBarBox!.y + 1)
})

test('no unexpected vertical scrolling at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const hasVerticalOverflow = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight
  )
  expect(hasVerticalOverflow).toBe(false)
})
