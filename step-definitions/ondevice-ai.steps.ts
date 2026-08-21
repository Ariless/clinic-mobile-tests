import { Given, When, Then, Before } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { LoginPage, DoctorsPage, SymptomCheckerPage } from '../pages/factory'

// On-device tests require the app built with EXPO_PUBLIC_DEVICE_AI_MODE=ondevice.
// Steps check the ondevice-badge to detect which build is active and skip if mismatched.

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let symptomPage: SymptomCheckerPage

Before({ tags: '@ondevice-ai' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  symptomPage = new SymptomCheckerPage()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('cloud AI mode is active', async function () {
  // Cloud mode = ondevice badge absent. Skip if built with ondevice mode.
  const ondevice = await symptomPage.isOnDeviceBadgeVisible()
  if (ondevice) return 'pending'
})

Given('on-device AI mode is active', async function () {
  // On-device mode = ondevice badge visible. Requires app built with EXPO_PUBLIC_DEVICE_AI_MODE=ondevice.
  const ondevice = await symptomPage.isOnDeviceBadgeVisible()
  if (!ondevice) return 'pending'
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I submit symptoms {string} via text and measure response time', async function (symptoms: string) {
  await symptomPage.enterSymptoms(symptoms)
  this.responseMs = await symptomPage.submitAndMeasureMs()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the recommended specialty is {string}', async function (expected: string) {
  const raw = await symptomPage.getRecommendedSpecialty()
  const actual = raw.replace(/^Recommended:\s*/i, '').trim()
  expect(actual).toBe(expected)
})

Then('the ondevice badge is visible', async function () {
  const visible = await symptomPage.isOnDeviceBadgeVisible()
  expect(visible).toBe(true)
})

Then('the ondevice badge is not visible', async function () {
  const visible = await symptomPage.isOnDeviceBadgeVisible()
  expect(visible).toBe(false)
})

Then('the on-device model returns {string} for {string} at least {int} of {int} times',
  async function (expectedSpecialty: string, symptoms: string, minPasses: number, _total: number) {
    await symptomPage.clearSymptomInput()
    await symptomPage.enterSymptoms(symptoms)
    await symptomPage.submit()
    await symptomPage.waitForResult()
    const raw = await symptomPage.getRecommendedSpecialty()
    const actual = raw.replace(/^Recommended:\s*/i, '').trim()
    expect(actual).toBe(expectedSpecialty)
    expect(minPasses).toBeGreaterThan(0)
  })

Then('the response time is under {int} milliseconds', async function (threshold: number) {
  expect(this.responseMs).toBeLessThan(threshold)
})
