import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

// This suite only runs through the dedicated in-memory QA host on 5187.
// The production Vite proxy and development API/database are never used.
const ownNotes = 'MPMS E2E temporary record'
const runtimeErrors = new WeakMap<Page, string[]>()
async function capturePortfolioScreenshot(page: Page, name: string) {
  if (process.env.MPMS_CAPTURE_SCREENSHOTS !== 'true') return
  await mkdir('../docs/screenshots', { recursive: true })
  const size = test.info().project.name.startsWith('desktop') ? 'desktop' : 'mobile'
  await page.screenshot({ path: `../docs/screenshots/${name}-${size}.png`, fullPage: true })
}
const format = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
const percent = (value: number | null) => value === null ? 'N/A' : `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value)}%`

async function dashboardValues(request: APIRequestContext, query = '') {
  return (await request.get(`/api/dashboard/summary${query}`)).json()
}

async function expectDashboard(page: Page, request: APIRequestContext, query = '') {
  const summary = await dashboardValues(request, query)
  await expect(page.locator('.kpi-value')).toHaveText([`${format(summary.totalProduction)}units`, percent(summary.targetAchievement), percent(summary.defectRate), `${format(summary.totalDowntimeMinutes)}min`])
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
  return summary
}

async function logsReady(page: Page) {
  await expect(page.getByRole('heading', { name: 'Production Logs', exact: true })).toBeVisible()
  await expect(page.locator('.logs-data-card')).toHaveAttribute('aria-busy', 'false')
}

async function fillRecord(page: Page) {
  await page.getByLabel('Production Date', { exact: false }).fill('2026-11-11')
  await page.locator('#record-productionLine').selectOption('Line C')
  await page.locator('#record-shift').selectOption('Morning')
  for (const [field, value] of Object.entries({ targetUnits: '2000', actualUnits: '1900', defectUnits: '19', downtimeMinutes: '5', notes: ownNotes })) await page.locator(`#record-${field}`).fill(value)
}

test.beforeEach(async ({ page, request }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  const health = await (await request.get('http://127.0.0.1:5187/__qa/health')).json()
  expect(health).toEqual({ testOnly: true, inMemory: true })
})

test.afterEach(async ({ page, request }) => {
  const records = await (await request.get('/api/productionlogs')).json()
  for (const record of records) {
    if (record.notes?.startsWith(ownNotes)) expect((await request.delete(`/api/productionlogs/${record.id}`)).ok()).toBeTruthy()
  }
  expect(runtimeErrors.get(page)).toEqual([])
})

test('create, edit, cancel and confirm delete persist and refresh dashboard statistics', async ({ page, request }) => {
  const baseline = await dashboardValues(request)
  await page.goto('/production-logs')
  await logsReady(page)
  await page.getByRole('button', { name: 'Add Production Record', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Add Production Record' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Save Record' }).click()
  await expect(drawer.locator('.field-error')).toHaveCount(7)
  await fillRecord(page)
  await page.locator('#record-defectUnits').fill('1901')
  await drawer.getByRole('button', { name: 'Save Record' }).click()
  await expect(page.getByText('Defect units cannot exceed actual units.', { exact: true })).toBeVisible()
  await page.locator('#record-defectUnits').fill('19')
  await drawer.getByRole('button', { name: 'Save Record' }).click()
  await expect(drawer).toHaveCount(0)
  await logsReady(page)
  const created = (await (await request.get('/api/productionlogs')).json()).find((record: { notes: string }) => record.notes === ownNotes)
  expect(created).toBeTruthy()
  await expect(page.locator('.saved-record')).toContainText('95.0%')
  await expect(page.locator('.saved-record')).toContainText('At Risk')
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  const afterCreate = await expectDashboard(page, request)
  expect(afterCreate.totalProduction).toBe(baseline.totalProduction + 1900)

  await page.getByRole('link', { name: 'Production Logs', exact: true }).click()
  await logsReady(page)
  await page.getByRole('button', { name: `Edit record #${created.id}`, exact: true }).click()
  await expect(page.locator('#record-actualUnits')).toHaveValue('1900')
  await page.locator('#record-actualUnits').fill('2100')
  await page.locator('#record-notes').fill(`${ownNotes} <script>window.mpmsUnsafe=true</script>`)
  await page.getByRole('button', { name: 'Save Record', exact: true }).click()
  await logsReady(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.saved-record')).toContainText('105.0%')
  await expect(page.locator('.saved-record')).toContainText('On Target')
  expect(await page.evaluate(() => Object.hasOwn(window, 'mpmsUnsafe'))).toBe(false)
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  expect((await expectDashboard(page, request)).totalProduction).toBe(baseline.totalProduction + 2100)

  await page.getByRole('link', { name: 'Production Logs', exact: true }).click()
  await logsReady(page)
  await page.getByRole('button', { name: `Delete record #${created.id}`, exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Delete production record?' })
  await expect(confirmation).toContainText(`#${created.id}`)
  await expect(confirmation).toContainText('cannot be undone')
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await request.get(`/api/productionlogs/${created.id}`)).status()).toBe(200)
  await page.getByRole('button', { name: `Delete record #${created.id}`, exact: true }).click()
  await confirmation.getByRole('button', { name: 'Delete Record', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await logsReady(page)
  expect((await request.get(`/api/productionlogs/${created.id}`)).status()).toBe(404)
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  expect((await expectDashboard(page, request)).totalProduction).toBe(baseline.totalProduction)
})

test('logs search, inclusive dates, production line, shift, pagination and clear filters', async ({ page }) => {
  await page.goto('/production-logs')
  await logsReady(page)
  await expect(page.locator('.logs-table tbody tr')).toHaveCount(10)
  await expect(page.locator('.simulation-notice')).toContainText('84')
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByLabel('Search records').fill('#1')
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByLabel('Search records').fill('NO MATCH')
  await expect(page.getByRole('heading', { name: 'No matching production records' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear Filters', exact: true }).first().click()
  await page.getByLabel('From date').fill('2026-11-01')
  await page.getByLabel('To date').fill('2026-11-07')
  await page.getByLabel('Production line', { exact: true }).selectOption('Line B')
  await page.getByLabel('Shift', { exact: true }).selectOption('Afternoon')
  await expect(page.locator('.logs-table tbody tr')).toHaveCount(7)
  await expect(page.locator('.logs-table tbody tr').first()).toContainText('Nov 7, 2026')
  await expect(page.locator('.logs-table tbody tr').last()).toContainText('Nov 1, 2026')
  await page.getByRole('button', { name: 'Clear Filters', exact: true }).click()
  await expect(page.locator('.logs-table tbody tr')).toHaveCount(10)
  for (const input of await page.locator('.filters-grid input, .filters-grid select').all()) await expect(input).toHaveValue('')
  for (let index = 0; index < 8; index++) await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.locator('.logs-table tbody tr')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
})

test('dashboard filters use matching API values and handle empty and invalid ranges', async ({ page, request }) => {
  await page.goto('/')
  await expectDashboard(page, request)
  await expect(page.locator('.recharts-surface')).toHaveCount(3)
  await page.getByLabel('Start Date', { exact: true }).fill('2026-11-01')
  await page.getByLabel('End Date', { exact: true }).fill('2026-11-07')
  await page.getByLabel('Production Line', { exact: true }).selectOption('Line C')
  const query = '?startDate=2026-11-01&endDate=2026-11-07&productionLine=Line%20C'
  expect((await expectDashboard(page, request, query)).recordCount).toBe(14)
  await expect(page.locator('.performance-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.performance-table tbody')).toContainText('Line C')
  await expect(page.locator('.defect-legend li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expectDashboard(page, request, query)
  await page.getByRole('button', { name: 'Clear Filters', exact: true }).click()
  await expectDashboard(page, request)
  await page.getByLabel('Start Date', { exact: true }).fill('2026-11-11')
  await page.getByLabel('End Date', { exact: true }).fill('2026-11-12')
  await expect(page.getByRole('heading', { name: 'No production records match these filters' })).toBeVisible()
  await expect(page.locator('.kpi-value').nth(2)).toHaveText('N/A')
  await expect(page.locator('.recharts-surface')).toHaveCount(0)
  await page.getByLabel('End Date', { exact: true }).fill('2026-11-10')
  await expect(page.locator('#dashboard-filter-error')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled()
})

test('loading and API errors retain data on failed refresh and Retry recovers', async ({ page, request }) => {
  let release: () => void = () => {}
  const hold = new Promise<void>((done) => { release = done })
  await page.route('**/api/dashboard/**', async (route) => { await hold; await route.continue() })
  await page.goto('/')
  await expect(page.locator('.skeleton').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refreshing…', exact: true })).toBeDisabled()
  release()
  await expectDashboard(page, request)
  const values = await page.locator('.kpi-value').allTextContents()
  await page.unrouteAll({ behavior: 'wait' })
  await page.route('**/api/dashboard/summary*', (route) => route.fulfill({ status: 503, json: { message: 'Unavailable' } }))
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Refresh failed')
  await expect(page.locator('.kpi-value')).toHaveText(values)
  await page.unrouteAll({ behavior: 'wait' })
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expectDashboard(page, request)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.route('**/api/productionlogs', (route) => route.fulfill({ status: 500, json: {} }))
  await page.goto('/production-logs')
  await expect(page.getByRole('alert')).toContainText('Unable to load production records')
  await expect(page.locator('.logs-table')).toHaveCount(0)
  await page.unrouteAll({ behavior: 'wait' })
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await logsReady(page)
  await expect(page.locator('.logs-table tbody tr')).toHaveCount(10)
  await page.route('**/api/productionlogs', (route) => route.fulfill({ status: 200, json: [] }))
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No production records yet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Production Record', exact: true })).toBeEnabled()
})

test('submission disables controls, blocks duplicate saves and Escape, and preserves input on failure', async ({ page }) => {
  await page.goto('/production-logs')
  await logsReady(page)
  await page.getByRole('button', { name: 'Add Production Record', exact: true }).click()
  await fillRecord(page)
  let release: () => void = () => {}
  const hold = new Promise<void>((done) => { release = done })
  let submissions = 0
  await page.route('**/api/productionlogs', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    submissions++
    await hold
    await route.fulfill({ status: 503, json: { message: 'Save unavailable' } })
  })
  await page.getByRole('button', { name: 'Save Record', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Close production record drawer' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(submissions).toBe(1)
  release()
  await expect(page.getByRole('alert')).toContainText('Save unavailable')
  await expect(page.locator('#record-notes')).toHaveValue(ownNotes)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})

test('save and delete errors preserve user input and records; modals restore focus', async ({ page }) => {
  await page.goto('/production-logs')
  await logsReady(page)
  const add = page.getByRole('button', { name: 'Add Production Record', exact: true })
  await add.click()
  await fillRecord(page)
  await page.route('**/api/productionlogs', (route) => route.request().method() === 'POST' ? route.fulfill({ status: 400, json: { title: 'Validation failed', errors: { Notes: ['Notes rejected by test API.'] } } }) : route.continue())
  await page.getByRole('button', { name: 'Save Record', exact: true }).click()
  await expect(page.locator('#record-notes-error')).toHaveText('Notes rejected by test API.')
  await expect(page.locator('#record-notes')).toHaveValue(ownNotes)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(add).toBeFocused()
  await page.unrouteAll({ behavior: 'wait' })
  const deleteButton = page.getByRole('button', { name: 'Delete record #84', exact: true })
  await deleteButton.click()
  await page.route('**/api/productionlogs/84', (route) => route.request().method() === 'DELETE' ? route.fulfill({ status: 500, json: { message: 'Deletion unavailable' } }) : route.continue())
  await page.getByRole('button', { name: 'Delete Record', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Deletion unavailable')
  await expect(page.locator('.logs-table tbody tr')).toHaveCount(10)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(deleteButton).toBeFocused()
})

test('desktop and mobile fit the viewport and keep wide tables scrollable', async ({ page, request }) => {
  await page.goto('/')
  await expectDashboard(page, request)
  await expect(page.locator('.recharts-surface')).toHaveCount(3)
  await capturePortfolioScreenshot(page, 'dashboard')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Production Logs', exact: true }).click()
  await logsReady(page)
  await capturePortfolioScreenshot(page, 'production-logs')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const region = page.getByRole('region', { name: 'Production records table' })
  await expect(region).toBeVisible()
  await region.evaluate((element) => { element.scrollLeft = element.scrollWidth })
  await page.getByRole('button', { name: 'Add Production Record', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await capturePortfolioScreenshot(page, 'production-record-drawer')
  expect(await page.getByRole('dialog').evaluate((element) => element.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})
