import { When, Then, Before, After } from '@wdio/cucumber-framework'
import * as os from 'os'
import * as path from 'path'
import { FoldablePage } from '../pages/factory'
import { ADB } from '../support/adb'
import { Claude } from '../support/claude'

// At Pixel 6 default density (420 dpi): dp = px × 160/420.
// To reach 600 dp breakpoint: 600 × 420/160 = 1575 px minimum.
// Using 1600×1000 to clear the threshold with headroom.
const LARGE_SCREEN_W = 1600
const LARGE_SCREEN_H = 1000
// Phone size that collapses back to single-panel
const PHONE_SCREEN_W = 400
const PHONE_SCREEN_H = 800

let foldablePage: FoldablePage
let screenshotPath: string

Before({ tags: '@foldable' }, async function () {
  foldablePage = new FoldablePage()
  screenshotPath = ''
  ADB.resetDisplaySize()
  await driver.activateApp(process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile')
})

After({ tags: '@foldable' }, async function () {
  ADB.resetDisplaySize()
})

// Given('I am logged in as a patient') — reuse from booking.steps.ts (duplicate removed)

When('the device is expanded to large-screen size', async function () {
  ADB.setDisplaySize(LARGE_SCREEN_W, LARGE_SCREEN_H)
  await foldablePage.waitForDualPanel()
})

When('the device is folded to phone size', async function () {
  ADB.setDisplaySize(PHONE_SCREEN_W, PHONE_SCREEN_H)
  await browser.pause(1000)
})

When('I select the first doctor in the large-screen panel', async function () {
  await foldablePage.selectFirstDoctorInPanel()
})

When('I take a screenshot of the large-screen layout', async function () {
  screenshotPath = path.join(os.tmpdir(), `foldable-layout-${Date.now()}.png`)
  await browser.saveScreenshot(screenshotPath)
})

Then('the dual-panel container is visible', async function () {
  const visible = await foldablePage.isDualPanelVisible()
  expect(visible).toBe(true)
})

Then('the dual-panel container is not visible', async function () {
  const visible = await foldablePage.isDualPanelVisible()
  expect(visible).toBe(false)
})

Then('the doctors panel is visible', async function () {
  const visible = await foldablePage.isDoctorsPanelVisible()
  expect(visible).toBe(true)
})

Then('the doctors panel is still visible', async function () {
  const visible = await foldablePage.isDoctorsPanelVisible()
  expect(visible).toBe(true)
})

Then('the booking placeholder is visible', async function () {
  const visible = await foldablePage.isBookingPlaceholderVisible()
  expect(visible).toBe(true)
})

Then('the booking panel is visible', async function () {
  const visible = await foldablePage.isBookingPanelVisible()
  expect(visible).toBe(true)
})

Then('the doctors list is visible', async function () {
  const visible = await $(
    process.env.PLATFORM === 'ios' ? '~doctors-list' : '//*[@resource-id="doctors-list"]'
  ).isDisplayed()
  expect(visible).toBe(true)
})

Then('Claude confirms the dual-panel layout is usable', async function () {
  if (!screenshotPath) throw new Error('No screenshot taken — run "When I take a screenshot of the large-screen layout" first')
  const result = await Claude.evaluateLayout(screenshotPath)
  expect(result.pass).toBe(true)
  if (!result.pass) {
    throw new Error(`Layout issues found: ${result.issues.join('; ')}`)
  }
})
