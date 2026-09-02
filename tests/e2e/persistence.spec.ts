/**
 * Phase 10 E2E — Project Persistence and Import
 *
 * Covers: autosave, auto-restore, download project, open project, invalid
 * file handling, unknown layer types, dirty state confirmation, New Project
 * confirmation, and editor preferences persistence.
 */

import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOSAVE_KEY = 'magic-circle-editor:autosave'
const PREFERENCES_KEY = 'magic-circle-editor:preferences'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addRing(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Ring' }).click()
  await page.waitForTimeout(50)
}

async function addRL(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: 'Add Radial Lines' }).click()
  await page.waitForTimeout(50)
}

async function getLayerCount(page: Parameters<typeof test>[1]['page']) {
  return page.evaluate(() => document.querySelectorAll('[data-testid^="layer-name-"]').length)
}

async function getLayerNames(page: Parameters<typeof test>[1]['page']) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="layer-name-"]')).map(
      (el) => el.textContent?.trim() ?? ''
    )
  )
}

async function getLayerTypesFromCanvas(page: Parameters<typeof test>[1]['page']) {
  return page.evaluate(() => {
    const types: string[] = []
    if (document.querySelector('[data-testid^="ring-layer-"]')) types.push('ring')
    if (document.querySelector('[data-testid^="radial-lines-layer-"]')) types.push('radial-lines')
    return types
  })
}

async function waitForAutosave(page: Parameters<typeof test>[1]['page']) {
  // Wait for the 2s debounce to fire + 500ms buffer
  await page.waitForTimeout(2600)
}

async function getAutosaveData(page: Parameters<typeof test>[1]['page']) {
  return page.evaluate((key) => localStorage.getItem(key), AUTOSAVE_KEY)
}

async function setLocalStorage(
  page: Parameters<typeof test>[1]['page'],
  key: string,
  value: string
) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value])
}

async function clearLocalStorage(page: Parameters<typeof test>[1]['page']) {
  await page.evaluate(() => localStorage.clear())
}

// ─── Section A: Autosave ─────────────────────────────────────────────────────

test.describe('A — Autosave', () => {
  test('A1: adding a ring triggers autosave within 3 seconds', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)
    await waitForAutosave(page)
    const saved = await getAutosaveData(page)
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.__magic_circle__).toBe(true)
    expect(parsed.layers).toHaveLength(1)
    expect(parsed.layers[0].type).toBe('ring')
  })

  test('A2: auto-restore loads saved layers on page reload', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)
    await waitForAutosave(page)
    // Reload and verify restore
    await page.reload()
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    const count = await getLayerCount(page)
    expect(count).toBe(1)
    const names = await getLayerNames(page)
    expect(names[0]).toBe('Ring')
  })

  test('A3: autosave is valid JSON and passes schema criteria', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)
    await waitForAutosave(page)
    const saved = await getAutosaveData(page)
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.__magic_circle__).toBe(true)
    expect(typeof parsed.version).toBe('string')
    expect(parsed.meta).toBeDefined()
    expect(parsed.canvas).toBeDefined()
    expect(Array.isArray(parsed.layers)).toBe(true)
  })
})

// ─── Section B: Mixed autosave ────────────────────────────────────────────────

test.describe('B — Mixed autosave', () => {
  test('B1: ring + radial-lines both restored after reload', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)
    await addRL(page)
    await waitForAutosave(page)
    await page.reload()
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    const count = await getLayerCount(page)
    expect(count).toBe(2)
    const types = await getLayerTypesFromCanvas(page)
    expect(types).toContain('ring')
    expect(types).toContain('radial-lines')
  })
})

// ─── Section C: Download Project ─────────────────────────────────────────────

test.describe('C — Download Project', () => {
  test('C1: Save button triggers a file download', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.mce\.json$/)
  })

  test('C2: downloaded file contains valid project data', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save' }).click(),
    ])

    const content = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const text = Buffer.concat(chunks).toString('utf-8')
    const parsed = JSON.parse(text)
    expect(parsed.__magic_circle__).toBe(true)
    expect(parsed.version).toBe('1.0.0')
    expect(parsed.layers).toHaveLength(1)
    expect(parsed.layers[0].type).toBe('ring')
  })

  test('C3: Save clears dirty state (dot indicator disappears)', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    // Dirty dot should appear
    await expect(page.getByLabel('Current project')).toContainText('•')

    await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save' }).click(),
    ])

    // Dirty dot should be gone
    await expect(page.getByLabel('Current project')).not.toContainText('•')
  })
})

// ─── Section D: Open downloaded file ─────────────────────────────────────────

test.describe('D — Open downloaded file', () => {
  test('D1: opening a valid .mce.json file restores layers', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)
    await addRL(page)

    // Download the file
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save' }).click(),
    ])

    const content = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const fileBuffer = Buffer.concat(chunks)

    // Start fresh then open the downloaded file
    await page.getByRole('button', { name: 'New' }).click()
    // No confirm needed since we just saved (not dirty)
    await expect(page.getByTestId('editor-shell')).toBeVisible()

    // Use file chooser to open the downloaded file
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Open' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'project.mce.json',
      mimeType: 'application/json',
      buffer: fileBuffer,
    })

    await page.waitForTimeout(200)
    const count = await getLayerCount(page)
    expect(count).toBe(2)
  })
})

// ─── Section E: Invalid JSON ──────────────────────────────────────────────────

test.describe('E — Invalid JSON file', () => {
  test('E1: importing invalid JSON shows an error toast and keeps current project', async ({
    page,
  }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    // Empty project — no confirm dialog will appear

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Open' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('this is not json { bad'),
    })

    await page.waitForTimeout(200)
    await expect(page.getByTestId('toast-error')).toBeVisible()
    // Project unchanged — still 0 layers
    const count = await getLayerCount(page)
    expect(count).toBe(0)
  })
})

// ─── Section F: Structurally invalid JSON ─────────────────────────────────────

test.describe('F — Structurally invalid project file', () => {
  test('F1: valid JSON but missing magic marker shows error and keeps project', async ({
    page,
  }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    // Empty project — no confirm dialog

    const noMagic = JSON.stringify({ version: '1.0.0', layers: [], canvas: {}, meta: {} })
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Open' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(noMagic),
    })

    await page.waitForTimeout(200)
    await expect(page.getByTestId('toast-error')).toBeVisible()
    // Project unchanged — still 0 layers
    const count = await getLayerCount(page)
    expect(count).toBe(0)
  })
})

// ─── Section G: Future major version ─────────────────────────────────────────

test.describe('G — Future major version', () => {
  test('G1: file with major version 2.0.0 is rejected with error', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    // Empty project — no confirm dialog

    const futureVersion = JSON.stringify({
      __magic_circle__: true,
      version: '2.0.0',
      meta: {
        title: 'Future',
        created: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z',
      },
      canvas: { width: 1000, height: 1000 },
      layers: [],
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Open' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'future.mce.json',
      mimeType: 'application/json',
      buffer: Buffer.from(futureVersion),
    })

    await page.waitForTimeout(200)
    await expect(page.getByTestId('toast-error')).toBeVisible()
    // Project unchanged — still 0 layers
    const count = await getLayerCount(page)
    expect(count).toBe(0)
  })
})

// ─── Section H: Unknown layer type ───────────────────────────────────────────

test.describe('H — Unknown layer type', () => {
  test('H1: file with unknown layer type loads known layers and shows warning', async ({
    page,
  }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()

    const mixedFile = JSON.stringify({
      __magic_circle__: true,
      version: '1.0.0',
      meta: {
        title: 'Mixed',
        created: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z',
      },
      canvas: { width: 1000, height: 1000 },
      layers: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          type: 'ring',
          name: 'Known Ring',
          visible: true,
          locked: false,
          opacity: 1,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          radius: 300,
          strokeWidth: 4,
          color: '#ffffff',
        },
        {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          type: 'polygon',
          name: 'Unknown Polygon',
          visible: true,
          locked: false,
          opacity: 1,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        },
      ],
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Open' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'mixed.mce.json',
      mimeType: 'application/json',
      buffer: Buffer.from(mixedFile),
    })

    await page.waitForTimeout(200)
    // Warning shown for unknown layer
    await expect(page.getByTestId('toast-warning')).toBeVisible()
    // Known ring layer loaded
    const count = await getLayerCount(page)
    expect(count).toBe(1)
    const names = await getLayerNames(page)
    expect(names[0]).toBe('Known Ring')
  })
})

// ─── Section I: Dirty Open confirmation ──────────────────────────────────────

test.describe('I — Dirty Open confirmation', () => {
  test('I1: clicking Open when dirty shows confirm dialog before file chooser', async ({
    page,
  }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)
    // Project is now dirty (ring added, not saved)

    // Click Open — dirty + has layers → confirm dialog should appear (no file chooser yet)
    await page.getByRole('button', { name: 'Open' }).click()
    await page.waitForTimeout(100)
    await expect(page.getByTestId('confirm-dialog')).toBeVisible()
    // Ring still there
    const count = await getLayerCount(page)
    expect(count).toBe(1)
  })

  test('I2: cancelling the dirty open dialog keeps the current project', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    await page.getByRole('button', { name: 'Open' }).click()
    await page.waitForTimeout(100)
    await expect(page.getByTestId('confirm-dialog')).toBeVisible()

    await page.getByRole('button', { name: 'Keep Editing' }).click()
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible()
    // Original ring still present
    const count = await getLayerCount(page)
    expect(count).toBe(1)
  })

  test('I3: confirming the dirty open dialog triggers file chooser and replaces project', async ({
    page,
  }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    const emptyProject = JSON.stringify({
      __magic_circle__: true,
      version: '1.0.0',
      meta: {
        title: 'Replaced',
        created: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z',
      },
      canvas: { width: 1000, height: 1000 },
      layers: [],
    })

    // Click Open → confirm dialog appears
    await page.getByRole('button', { name: 'Open' }).click()
    await page.waitForTimeout(100)
    await expect(page.getByTestId('confirm-dialog')).toBeVisible()

    // Confirm → file chooser appears
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('confirm-dialog-confirm').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'project.mce.json',
      mimeType: 'application/json',
      buffer: Buffer.from(emptyProject),
    })

    await page.waitForTimeout(200)
    // Project replaced — no layers
    const count = await getLayerCount(page)
    expect(count).toBe(0)
  })
})

// ─── Section J: New Project confirmation ─────────────────────────────────────

test.describe('J — New Project confirmation', () => {
  test('J1: New Project with unsaved changes shows confirm dialog', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  })

  test('J2: cancelling New Project dialog keeps the current project', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.getByTestId('confirm-dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Keep Editing' }).click()
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible()
    const count = await getLayerCount(page)
    expect(count).toBe(1)
  })

  test('J3: confirming New Project resets to empty project', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    await addRing(page)

    await page.getByRole('button', { name: 'New' }).click()
    await page.getByTestId('confirm-dialog-confirm').click()
    await page.waitForTimeout(100)
    const count = await getLayerCount(page)
    expect(count).toBe(0)
  })

  test('J4: New Project without dirty state skips confirm dialog', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()
    // No layers — empty project is not dirty relative to a fresh project baseline

    await page.getByRole('button', { name: 'New' }).click()
    // No confirm dialog should appear
    await page.waitForTimeout(100)
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible()
  })
})

// ─── Section K: Preferences ───────────────────────────────────────────────────

test.describe('K — Preferences persistence', () => {
  test('K1: grid visibility persists across reload', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()

    // Enable grid via the toggle button
    await page.getByRole('button', { name: 'Toggle grid' }).click()
    await page.waitForTimeout(100)
    await expect(page.getByTestId('grid-overlay')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    await expect(page.getByTestId('grid-overlay')).toBeVisible()
  })

  test('K2: guide visibility persists across reload', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()

    await page.getByRole('button', { name: 'Toggle guides' }).click()
    await page.waitForTimeout(100)
    await expect(page.getByTestId('guides-overlay')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    await expect(page.getByTestId('guides-overlay')).toBeVisible()
  })

  test('K3: corrupt preferences are ignored and defaults are used', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await setLocalStorage(page, PREFERENCES_KEY, 'not-valid-json{')
    await page.reload()
    // Should load without error, use defaults (grid hidden)
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    await expect(page.getByTestId('grid-overlay')).not.toBeVisible()
  })
})

// ─── Section L: New Project history and DOM reset ─────────────────────────────

test.describe('L — New Project history and DOM reset', () => {
  test('L1: New Project resets Undo button to disabled', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()

    // Add a ring to create history
    await addRing(page)
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()

    // New Project
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByTestId('confirm-dialog-confirm').click()
    await page.waitForTimeout(100)

    // Undo should be disabled again (history cleared to single fresh baseline)
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  test('L2: New Project removes all artwork from the SVG', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()

    for (let i = 0; i < 5; i++) await addRing(page)
    const countBefore = await page.evaluate(
      () => document.getElementById('artwork')?.querySelectorAll('[data-layer-id]').length ?? 0
    )
    expect(countBefore).toBe(5)

    await page.getByRole('button', { name: 'New' }).click()
    await page.getByTestId('confirm-dialog-confirm').click()
    await page.waitForTimeout(100)

    const countAfter = await page.evaluate(
      () => document.getElementById('artwork')?.querySelectorAll('[data-layer-id]').length ?? 0
    )
    expect(countAfter).toBe(0)
  })

  test('L3: Redo is disabled after New Project', async ({ page }) => {
    await page.goto('/')
    await clearLocalStorage(page)
    await page.reload()

    await addRing(page)
    // Undo to create a redo branch
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(100)
    await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()

    // New Project
    await page.getByRole('button', { name: 'New' }).click()
    await page.waitForTimeout(100)
    // No confirm (no dirty state after undo cleared the ring)
    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })
})
