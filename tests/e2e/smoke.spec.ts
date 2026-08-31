import { expect, test } from '@playwright/test'

test('home page loads and shows the working title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Magic Circle Editor/)
  await expect(page.getByText('Magic Circle Editor')).toBeVisible()
})
