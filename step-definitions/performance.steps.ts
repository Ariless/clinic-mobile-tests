import { Given, When, Then } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { LoginPage, DoctorsPage } from '../pages/factory'

const APP_PACKAGE = 'com.anonymous.clinicmobile'

let coldStartMs: number
let jankResult: { totalFrames: number; jankyFrames: number; jankRate: number }

// ── Given ────────────────────────────────────────────────────────────────────

Given('the app is fully stopped', async function () {
  ADB.forceStop(APP_PACKAGE)
  await driver.pause(1000)
})

Given('the patient is logged in and the doctors list is visible', async function () {
  const loginPage = new LoginPage()
  const doctorsPage = new DoctorsPage()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
})

Given('gfxinfo stats are reset', function () {
  ADB.resetGfxinfo(APP_PACKAGE)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the app is cold launched', function () {
  coldStartMs = ADB.coldStart(APP_PACKAGE)
})

When('the doctors list is scrolled {int} times', async function (times: number) {
  const doctorsList = $('//*[@resource-id="doctors-list"]')
  await doctorsList.waitForDisplayed({ timeout: 10000 })

  for (let i = 0; i < times; i++) {
    await driver.execute('mobile: swipe', {
      elementId: (await doctorsList).elementId,
      direction: 'up',
      percent: 0.7,
      speed: 800,
    })
    await driver.pause(300)
  }
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('total launch time is under {int} milliseconds', async function (threshold: number) {
  this.attach(
    JSON.stringify({ coldStartMs, thresholdMs: threshold }, null, 2),
    'application/json',
  )
  expect(coldStartMs).toBeLessThan(threshold)
})

Then('janky frame rate is under {int} percent', async function (thresholdPercent: number) {
  jankResult = ADB.parseJankRate(APP_PACKAGE)
  const thresholdRate = thresholdPercent / 100

  this.attach(
    JSON.stringify({
      totalFrames: jankResult.totalFrames,
      jankyFrames: jankResult.jankyFrames,
      jankRatePercent: (jankResult.jankRate * 100).toFixed(2),
      thresholdPercent,
    }, null, 2),
    'application/json',
  )

  expect(jankResult.jankRate).toBeLessThan(thresholdRate)
})
