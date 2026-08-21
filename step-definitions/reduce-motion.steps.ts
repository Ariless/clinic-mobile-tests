import { Given, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { XCRun } from '../support/xcrun'
import { LoginPage, DoctorsPage, AppointmentsPage } from '../pages/factory'

const PLATFORM = process.env.PLATFORM ?? 'android'
const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.clinicmobile'

// booking.steps.ts untagged Before restarts the app first;
// this tagged Before sets Reduce Motion and restarts again so the setting is active from launch.
Before({ tags: '@reduce-motion' }, async function () {
  if (PLATFORM === 'android') {
    ADB.setReduceMotion()
    try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
    try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
    await browser.pause(5000)
  } else {
    XCRun.setReduceMotion(true)
    try { XCRun.forceStop(IOS_BUNDLE_ID) } catch { /* best-effort */ }
    XCRun.openApp(IOS_BUNDLE_ID)
    await browser.pause(3000)
  }
})

After({ tags: '@reduce-motion' }, function () {
  if (PLATFORM === 'android') {
    ADB.resetReduceMotion()
  } else {
    try { XCRun.resetReduceMotion() } catch { /* best-effort */ }
  }
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('Reduce Motion is enabled on the device', function () {
  // applied in the @reduce-motion Before hook; this step documents the precondition
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the booking confirmation shows text and a visual indicator', async function () {
  const icon = $('//*[@resource-id="booking-success-icon"]')
  await icon.waitForDisplayed({ timeout: 15000 })
  const message = $('//*[@resource-id="booking-success-message"]')
  await message.waitForDisplayed({ timeout: 5000 })
  const text = await message.getText()
  expect(text).toBeTruthy()
  this.attach(JSON.stringify({ icon: true, message: text }, null, 2), 'application/json')
})

Then('doctor cards are visible and interactive', async function () {
  const doctorsPage = new DoctorsPage()
  await doctorsPage.waitForDoctorList()
  const cards = $$('android=new UiSelector().resourceIdMatches("doctor-item-.*")')
  const count = await cards.length
  expect(count).toBeGreaterThan(0)
})

Then('the appointments list is visible', async function () {
  const appointmentsPage = new AppointmentsPage()
  await appointmentsPage.waitForList()
})
