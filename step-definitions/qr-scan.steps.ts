import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'

// QR codes contain clinic://appointment/{id} — the same deep link scheme.
// Tests tap "Scan QR" to confirm the scanner screen appears, then fire
// the deep link via ADB to simulate what happens after a real camera scan.

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

let patientToken: string
let appointmentId: number | undefined

Before({ tags: '@qr' }, async function () {
  appointmentId = undefined
})

After({ tags: '@qr' }, async function () {
  ADB.enableWifi()
  if (appointmentId && patientToken) {
    try { await ApiClient.cancelAppointment(appointmentId, patientToken) } catch { /* best-effort */ }
  }
})

// ── Given ────────────────────────────────────────────────────────────────────

// "Given I am logged in as a patient" — reused from booking.steps.ts

Given('I have a pending appointment for QR scanning', async function () {
  patientToken = await ApiClient.loginAsPatient()
  const doctorToken = await ApiClient.loginAsDoctor()
  const slots = await ApiClient.getAvailableSlots(1, doctorToken)
  if (slots.length === 0) throw new Error('No available slots')
  const appt = await ApiClient.bookAppointment(slots[0].id, patientToken)
  appointmentId = appt.id
})

Given('the appointment has been cancelled via API', async function () {
  if (!appointmentId || !patientToken) throw new Error('No appointment to cancel')
  await ApiClient.cancelAppointment(appointmentId, patientToken)
})

Given('the device is offline', function () {
  ADB.disableWifi()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I open the QR scanner with a valid appointment QR', async function () {
  if (!appointmentId) throw new Error('No appointment ID')
  // Navigate to My Visits tab first
  const myVisitsTab = $('//*[@resource-id="tab-appointments"]')
  if (await myVisitsTab.isExisting()) await myVisitsTab.click()

  const scanButton = $('//*[@resource-id="qr-scan-button"]')
  await scanButton.waitForDisplayed({ timeout: 8000 })
  await scanButton.click()

  // Confirm QR scanner screen is open
  await $('//*[@resource-id="qr-scanner-screen"]').waitForDisplayed({ timeout: 5000 })

  // Simulate scan result via ADB deep link — same handler as real camera scan
  ADB.openDeepLink(`clinic://appointment/${appointmentId}`)
})

When('I open the QR scanner with that appointment QR', async function () {
  if (!appointmentId) throw new Error('No appointment ID')

  const myVisitsTab = $('//*[@resource-id="tab-appointments"]')
  if (await myVisitsTab.isExisting()) await myVisitsTab.click()

  const scanButton = $('//*[@resource-id="qr-scan-button"]')
  await scanButton.waitForDisplayed({ timeout: 8000 })
  await scanButton.click()

  await $('//*[@resource-id="qr-scanner-screen"]').waitForDisplayed({ timeout: 5000 })
  ADB.openDeepLink(`clinic://appointment/${appointmentId}`)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the appointment detail screen is shown', async function () {
  await $('//*[@resource-id="deep-link-screen"]').waitForDisplayed({ timeout: 10000 })
})

Then('the appointment detail loads without error', async function () {
  const notFound = $('//*[@resource-id="deep-link-not-found"]')
  const exists = await notFound.isExisting()
  expect(exists).toBe(false)
})

Then('a patient-appropriate error is shown on the detail screen', async function () {
  await $('//*[@resource-id="deep-link-not-found"]').waitForDisplayed({ timeout: 10000 })
})

Then('the appointment status shown is {string}', async function (expectedStatus: string) {
  const statusEl = $('//*[contains(@resource-id,"appointment-status-")]')
  await statusEl.waitForDisplayed({ timeout: 8000 })
  const text = await statusEl.getText()
  expect(text.toLowerCase()).toContain(expectedStatus.toLowerCase())
})
