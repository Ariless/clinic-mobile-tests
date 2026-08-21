import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DoctorsPage, AppointmentsPage } from '../pages/factory'

const APP_PACKAGE = process.env.APP_PACKAGE ?? 'com.anonymous.clinicmobile'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let appointmentsPage: AppointmentsPage

let patientToken: string
let doctorToken: string
let setupAppointmentId: number | undefined
let wifiDisabled = false
let cachedDoctorCount = 0

Before(async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  appointmentsPage = new AppointmentsPage()
  patientToken = ''
  doctorToken = ''
  setupAppointmentId = undefined
  wifiDisabled = false
  cachedDoctorCount = 0
})

After(async function () {
  if (wifiDisabled) {
    ADB.enableWifi()
    await driver.pause(1500)
  }
  if (setupAppointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(setupAppointmentId, patientToken)
    } catch { /* terminal state */ }
  }
})

// ── Background ───────────────────────────────────────────────────────────────

Given('the patient is logged in and has browsed the doctors list', async function () {
  patientToken = await ApiClient.loginAsPatient()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  // Record how many doctors the app loaded so we can assert the same count from cache
  const items = doctorsPage['findByPattern']('doctor-item-')
  cachedDoctorCount = await items.length
})

Given('the patient has at least one appointment', async function () {
  const firstDoctorId = await ApiClient.getFirstDoctorId(patientToken)
  setupAppointmentId = await ApiClient.bookFirstAvailableSlot(firstDoctorId, patientToken)
  // navigate to appointments tab so the app caches the list
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
  // go back to doctors so subsequent steps start from a known screen
  await doctorsPage.switchToDoctors()
  await doctorsPage.waitForDoctorList()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the network is disabled', function () {
  ADB.disableWifi()
  wifiDisabled = true
})

Given('the app is cold launched', async function () {
  ADB.coldStart(APP_PACKAGE)
  await driver.pause(2000)
})

Given('the offline banner is visible', async function () {
  await expect($('//*[@resource-id="offline-banner"]')).toBeDisplayed()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the app is cold launched', async function () {
  ADB.coldStart(APP_PACKAGE)
  await driver.pause(2000)
})

When('the patient navigates to the doctors tab', async function () {
  // after cold launch we land on login — log in first if needed
  const isLoginVisible = await loginPage['isVisible']('login-title')
  if (isLoginVisible) {
    await loginPage.login(
      process.env.PATIENT_EMAIL ?? 'patient@example.com',
      process.env.PATIENT_PASSWORD ?? 'password123',
    )
  }
  await doctorsPage.switchToDoctors()
  await doctorsPage.waitForDoctorList()
})

When('the patient navigates to the appointments tab', async function () {
  const isLoginVisible = await loginPage['isVisible']('login-title')
  if (isLoginVisible) {
    await loginPage.login(
      process.env.PATIENT_EMAIL ?? 'patient@example.com',
      process.env.PATIENT_PASSWORD ?? 'password123',
    )
  }
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
})

When('the patient attempts to cancel an appointment', async function () {
  await appointmentsPage.cancelFirstPendingAppointment()
})

When('the app is backgrounded', async function () {
  ADB.pressHome()
  await driver.pause(1000)
})

When('the network is restored', function () {
  ADB.enableWifi()
  wifiDisabled = false
  // give the OS a moment to reconnect
  return driver.pause(2000)
})

When('the app is foregrounded', async function () {
  ADB.openApp(APP_PACKAGE)
  await driver.pause(2000)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the offline banner is visible', async function () {
  await expect($('//*[@resource-id="offline-banner"]')).toBeDisplayed()
})

Then('the doctors list shows previously seen doctors', async function () {
  await doctorsPage.waitForDoctorList()
  const items = doctorsPage['findByPattern']('doctor-item-')
  const count = await items.length
  expect(count).toBeGreaterThan(0)
  expect(count).toBe(cachedDoctorCount)
})

Then('the appointments list shows previously seen appointments', async function () {
  await appointmentsPage.waitForList()
  const items = appointmentsPage['findByPattern']('appointment-item-')
  expect(await items.length).toBeGreaterThan(0)
})

Then('an error message indicates no connection', async function () {
  await expect($('//*[@resource-id="appointments-error"]')).toBeDisplayed()
  const text = await $('//*[@resource-id="appointments-error"]').getText()
  expect(text.toLowerCase()).toMatch(/connection|offline|online/)
})

Then('the offline banner disappears', async function () {
  await driver.waitUntil(async () => {
    const banner = $('//*[@resource-id="offline-banner"]')
    return !(await banner.isDisplayed().catch(() => false))
  }, { timeout: 15000, interval: 1000, timeoutMsg: 'Offline banner still visible after reconnect' })
})

Then('the doctors list is refreshed from the server', async function () {
  await doctorsPage.waitForDoctorList()
  const items = doctorsPage['findByPattern']('doctor-item-')
  expect(await items.length).toBeGreaterThan(0)
})

When('the doctor confirms the appointment via the API', async function () {
  if (!setupAppointmentId) throw new Error('No appointment to confirm — check Background step')
  doctorToken = await ApiClient.loginAsDoctor()
  await ApiClient.confirmAppointment(setupAppointmentId, doctorToken)
})

Then('the appointment status shows as confirmed', async function () {
  await appointmentsPage.waitForList()
  const status = await appointmentsPage.getFirstAppointmentStatus()
  expect(status.toLowerCase()).toContain('confirm')
})
