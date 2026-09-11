import { expect, test } from '@playwright/test'
import { EXTRA_SYMBOLS } from '../../src/utils/symbolCatalog'

test.use({ viewport: { width: 1440, height: 1000 } })
test('symbol gallery selects all new glyphs, supports undo and saves', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: 'Add Symbol', exact: true }).click()
  const picker = page.getByLabel('Symbol', { exact: true })
  for (const [id, symbol] of Object.entries(EXTRA_SYMBOLS)) {
    await page.getByRole('button', { name: `Use ${symbol.label} symbol`, exact: true }).click()
    await expect(picker).toHaveValue(id)
    await expect(page.locator('#artwork path').first()).toHaveAttribute('d', symbol.path)
  }
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(picker).toHaveValue('eclipse')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          localStorage.getItem('magic-circle-editor:autosave')?.includes('"symbol":"eclipse"') ??
          false
      )
    )
    .toBe(true)
  await page.reload()
  await expect(page.locator('#artwork path').first()).toHaveAttribute(
    'd',
    EXTRA_SYMBOLS.eclipse.path
  )
  await page.getByText('Symbol', { exact: true }).first().click()
  await page.screenshot({ path: '/tmp/circle-symbol-gallery.png' })
})
