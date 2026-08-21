import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { ADB } from '../support/adb'
import { LoginPage, DoctorsPage, BookingPage } from '../pages/factory'

const APP_PACKAGE = 'com.anonymous.clinicmobile'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage

let patientToken: string
let setupAppointmentId: number | undefined
let wifiDisabled = false
let slowNetworkApplied = false

Before(async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  patientToken = ''
  setupAppointmentId = undefined
  wifiDisabled = false
  slowNetworkApplied = false
})

After(async function () {
  // restore network state before any other cleanup — the API calls below need network
  if (wifiDisabled) {
    ADB.enableWifi()
    wifiDisabled = false
    await driver.pause(1000)
  }
  if (slowNetworkApplied) {
    try { ADB.clearSlowNetwork() } catch { /* already cleared */ }
    slowNetworkApplied = false
  }
  if (setupAppointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(setupAppointmentId, patientToken)
    } catch {
      // appointment may already be in a terminal state
    }
  }
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('I am logged in as a patient and on the booking screen', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.waitForVisible()

  patientToken = await ApiClient.loginAsPatient()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('wifi is disabled', function () {
  ADB.disableWifi()
  wifiDisabled = true
})

When('wifi is restored', async function () {
  ADB.enableWifi()
  wifiDisabled = false
  // give the OS a moment to reconnect before the next request
  await driver.pause(2000)
})

When('I attempt to book the first available slot', async function () {
  await bookingPage.bookFirstAvailableSlot()
})

When('the app goes to background', async function () {
  ADB.pressHome()
  await driver.pause(1000)
})

When('the app returns to foreground', async function () {
  await driver.activateApp(APP_PACKAGE)
  await driver.pause(1000)
})

When('slow network is applied with {int}ms delay', function (latencyMs: number) {
  ADB.setSlowNetwork(latencyMs)
  slowNetworkApplied = true
})

When('I start booking the first available slot', async function () {
  await bookingPage.bookFirstAvailableSlot()
  // intentionally does not wait for confirmation — next step asserts loading state
})

When('slow network is cleared', function () {
  try { ADB.clearSlowNetwork() } catch { /* may have already cleared */ }
  slowNetworkApplied = false
})

When('the app is force stopped and reopened', async function () {
  ADB.forceStop(APP_PACKAGE)
  await driver.pause(1000)
  await driver.activateApp(APP_PACKAGE)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('I see a booking error message', async function () {
  await bookingPage.waitForError(10000)
  const msg = await bookingPage.getErrorMessage()
  expect(msg.length).toBeGreaterThan(0)
})

Then('the booking screen is still visible', async function () {
  const visible = await bookingPage.isBookingScreenVisible()
  expect(visible).toBe(true)
})

Then('a loading indicator appears within 1 second', async function () {
  // assert that the app gives immediate UI feedback before the slow request completes
  await bookingPage.waitForLoadingIndicator(1000)
})

Then('the booking eventually completes', async function () {
  // give extra time — slow network may still have residual delay in the queue
  await bookingPage.waitForConfirmation(20000)
  const text = await bookingPage.getConfirmationText()
  expect(text).toContain('Appointment booked')
})

Then('I am still logged in and the doctors list is visible', async function () {
  const visible = await doctorsPage.isDoctorListVisible()
  expect(visible).toBe(true)
})
