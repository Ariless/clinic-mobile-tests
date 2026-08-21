import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DeepLinkPage } from '../pages/factory'

const APP_PACKAGE = process.env.APP_PACKAGE ?? 'com.anonymous.clinicmobile'
const DEEP_LINK_BASE = 'clinic://appointment'

let loginPage: LoginPage
let deepLinkPage: DeepLinkPage

let patientToken: string
let appointmentId: number | undefined

Before({ tags: '@deeplink' }, async function () {
  loginPage = new LoginPage()
  deepLinkPage = new DeepLinkPage()
  patientToken = ''
  appointmentId = undefined
})

After({ tags: '@deeplink' }, async function () {
  if (appointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(appointmentId, patientToken)
    } catch { /* appointment may already be in a terminal state */ }
  }
  // Relaunch app cleanly so the next scenario starts from login
  ADB.forceStop(APP_PACKAGE)
  ADB.openApp(APP_PACKAGE)
  await driver.pause(2000)
})

// ── Given ─────────────────────────────────────────────────────────────────────

Given('the patient is logged in and has a booking', async function () {
  patientToken = await ApiClient.loginAsPatient()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  const firstDoctorId = await ApiClient.getFirstDoctorId(patientToken)
  appointmentId = await ApiClient.bookFirstAvailableSlot(firstDoctorId, patientToken)
})

Given('the app has no stored session', async function () {
  // pm clear wipes AsyncStorage (JWT) and restarts the app process
  ADB.clearAppData(APP_PACKAGE)
  await driver.pause(3000)
})

// ── When ──────────────────────────────────────────────────────────────────────

When("a deep link to the patient's appointment is opened", async function () {
  if (!appointmentId) throw new Error('No appointment set up — check Given step')
  ADB.openDeepLink(`${DEEP_LINK_BASE}/${appointmentId}`)
  await driver.pause(2000)
})

When('a deep link to appointment {int} is opened', async function (id: number) {
  ADB.openDeepLink(`${DEEP_LINK_BASE}/${id}`)
  await driver.pause(2000)
})

// ── Then ──────────────────────────────────────────────────────────────────────

Then('the appointment detail screen is shown with the correct appointment', async function () {
  await deepLinkPage.waitForScreen()
  await deepLinkPage.waitForContent()
  const visible = await deepLinkPage.isAppointmentVisible(appointmentId!)
  if (!visible) {
    this.attach(
      JSON.stringify({ appointmentId, note: 'appointment-item not visible after deep link' }),
      'application/json',
    )
  }
  expect(visible).toBe(true)
  const status = await deepLinkPage.getAppointmentStatus(appointmentId!)
  expect(['pending', 'confirmed', 'cancelled', 'completed', 'rejected']).toContain(status)
})

Then('the appointment detail screen shows a not-found error', async function () {
  await deepLinkPage.waitForScreen()
  await deepLinkPage.waitForNotFound()
  await expect($(deepLinkPage['rid']('deep-link-not-found'))).toBeDisplayed()
})

Then('the login screen is shown instead of the appointment', async function () {
  await loginPage.waitForVisible()
})
