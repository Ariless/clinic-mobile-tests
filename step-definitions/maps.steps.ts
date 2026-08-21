import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DoctorsPage, ClinicMapPage } from '../pages/factory'

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let clinicMapPage: ClinicMapPage
let token: string

Before({ tags: '@maps' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  clinicMapPage = new ClinicMapPage()
  token = ''
  ADB.enableWifi()
})

After({ tags: '@maps' }, async function () {
  ADB.enableWifi()
})

Given('the patient is logged in and on the doctors screen', async function () {
  token = await ApiClient.loginAsPatient()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
    90000,
  )
  await doctorsPage.waitForDoctorList()
})

When('I tap the map button for the first doctor', async function () {
  await doctorsPage.tapMapButtonForFirstDoctor()
})

Then('the map screen is displayed', async function () {
  await clinicMapPage.waitForScreen()
})

Then('the clinic address matches the API response for that doctor', async function () {
  const doctor = await ApiClient.getFirstDoctor(token)
  const displayed = await clinicMapPage.getAddressText()
  expect(displayed).toBe(doctor.clinicAddress)
})

Then('the clinic address text is visible', async function () {
  const visible = await clinicMapPage.isAddressVisible()
  expect(visible).toBe(true)
})

When('I tap the directions button', async function () {
  await clinicMapPage.tapDirections()
})

Then('the map screen remains responsive', async function () {
  await driver.pause(1500)
  // geo-intent may open an external app on Android — bring clinic-mobile back to foreground
  try { await driver.activateApp(APP_PACKAGE) } catch { /* best-effort */ }
  const visible = await clinicMapPage.isScreenVisible()
  expect(visible).toBe(true)
})
