import { Given, When, Then, Before } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { LoginPage, DoctorsPage } from '../pages/factory'

// Biometric behaviour is controlled by EXPO_PUBLIC_TEST_BIOMETRIC env var
// set before the test run (baked into the Expo bundle at startup):
//   EXPO_PUBLIC_TEST_BIOMETRIC=success   → biometric succeeds immediately
//   EXPO_PUBLIC_TEST_BIOMETRIC=fail      → biometric fails (tracks failures in component state)
//   EXPO_PUBLIC_TEST_BIOMETRIC=unavailable → biometric button hidden
//
// Run specific scenarios:
//   EXPO_PUBLIC_TEST_BIOMETRIC=success  TAGS="@biometric-success" npm test
//   EXPO_PUBLIC_TEST_BIOMETRIC=fail     TAGS="@biometric-fail"    npm test

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

let loginPage: LoginPage
let doctorsPage: DoctorsPage

Before({ tags: '@biometrics' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('a patient has previously logged in with credentials', async function () {
  // Full login: stores token in AsyncStorage so biometric option appears next launch
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  // Restart so login screen shows again with biometric button
  ADB.forceStop(APP_PACKAGE)
  ADB.openApp(APP_PACKAGE)
  await browser.pause(3000)
  await loginPage.waitForVisible()
})

Given('biometric authentication is available on the device', async function () {
  // Verified by presence of biometric-login-button — driven by EXPO_PUBLIC_TEST_BIOMETRIC=success|fail
  const btn = $('//*[@resource-id="biometric-login-button"]')
  await btn.waitForDisplayed({ timeout: 5000 })
})

Given('biometric authentication is not available on the device', async function () {
  // EXPO_PUBLIC_TEST_BIOMETRIC=unavailable — button should not render
  await browser.pause(1000)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the patient taps the biometric login button', async function () {
  const btn = $('//*[@resource-id="biometric-login-button"]')
  await btn.waitForDisplayed({ timeout: 8000 })
  await btn.click()
})

When('biometric authentication succeeds', async function () {
  // EXPO_PUBLIC_TEST_BIOMETRIC=success — handled synchronously in LoginScreen, no extra action
  await browser.pause(500)
})

When('the patient fails biometric authentication 3 times', async function () {
  // EXPO_PUBLIC_TEST_BIOMETRIC=fail — each tap increments failure counter
  for (let i = 0; i < 3; i++) {
    const btn = $('//*[@resource-id="biometric-login-button"]')
    if (!(await btn.isDisplayed().catch(() => false))) break
    await btn.click()
    await browser.pause(500)
  }
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the patient sees the doctors list', async function () {
  await doctorsPage.waitForDoctorList()
})

Then('the biometric login button is no longer visible', async function () {
  const btn = $('//*[@resource-id="biometric-login-button"]')
  const visible = await btn.isDisplayed().catch(() => false)
  expect(visible).toBe(false)
})

Then('the password login form is shown', async function () {
  await $('//*[@resource-id="login-submit-button"]').waitForDisplayed({ timeout: 5000 })
})

Then('the biometric login button is not shown', async function () {
  const btn = $('//*[@resource-id="biometric-login-button"]')
  const exists = await btn.isExisting()
  expect(exists).toBe(false)
})

Then('the login form is visible', async function () {
  await $('//*[@resource-id="login-email-input"]').waitForDisplayed({ timeout: 5000 })
})
