import { promises as fs } from 'fs'
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── ARCHITECTURE.md § 15.2: Download + re-upload restores layers ─────────────

test('downloading and re-uploading a project restores the original layers', async ({ page }) => {
  await page.goto('/')

  // 1. Add a ring layer
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)

  const artworkCountBefore = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(artworkCountBefore).toBe(1)

  // 2. Download the project (Save button). waitForEvent captures the download.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save' }).click(),
  ])

  // 3. Read the downloaded file bytes from Playwright's temp path
  const savedPath = await download.path()
  expect(savedPath).not.toBeNull()
  const fileBuffer = await fs.readFile(savedPath!)

  // 4. Create a new empty project.
  //    After downloading, the project is "clean" (markProjectSaved was called),
  //    so no confirmation dialog appears.
  await page.getByRole('button', { name: 'New' }).click()
  await page.waitForTimeout(50)

  const artworkCountAfterNew = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(artworkCountAfterNew).toBe(0)

  // 5. Upload the saved project via the hidden file input
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'project.mce.json',
    mimeType: 'application/json',
    buffer: fileBuffer,
  })
  await page.waitForTimeout(150)

  // 6. Verify layers are restored
  const artworkCountAfterRestore = await page.evaluate(
    () => document.querySelector('[data-testid="artwork-group"]')?.children.length ?? 0
  )
  expect(artworkCountAfterRestore).toBe(1)
})

test('saving project produces a valid .mce.json file', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save' }).click(),
  ])

  const savedPath = await download.path()
  expect(savedPath).not.toBeNull()

  const content = await fs.readFile(savedPath!, 'utf-8')
  const parsed = JSON.parse(content) as unknown

  // Must match the project file format sentinel
  expect((parsed as Record<string, unknown>).__magic_circle__).toBe(true)
  expect(typeof (parsed as Record<string, unknown>).version).toBe('string')
  expect(Array.isArray((parsed as Record<string, unknown>).layers)).toBe(true)
})

test('downloading triggers a file download event', async ({ page }) => {
  await page.goto('/')

  let downloadFired = false
  page.on('download', () => {
    downloadFired = true
  })

  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(300)

  expect(downloadFired).toBe(true)
})
