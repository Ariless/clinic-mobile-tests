import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { ADB } from '../support/adb'
import { LoginPage, DoctorsPage, BookingPage, AppointmentsPage, DeepLinkPage, NotificationPage } from '../pages/factory'

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage
let deepLinkPage: DeepLinkPage
let notificationPage: NotificationPage

let patientToken: string
let setupAppointmentId: number | undefined
let bookedDoctorName: string

Before({ tags: '@notifications' }, async function () {
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(3000)

  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()
  deepLinkPage = new DeepLinkPage()
  notificationPage = new NotificationPage()

  patientToken = ''
  setupAppointmentId = undefined
  bookedDoctorName = ''
})

After({ tags: '@notifications' }, async function () {
  if (setupAppointmentId && patientToken) {
    try { await ApiClient.cancelAppointment(setupAppointmentId, patientToken) } catch { /* best-effort */ }
  }
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the patient is logged in', async function () {
  patientToken = await ApiClient.loginAsPatient()
  await loginPage.waitForVisible()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForVisible()
})

Given('the patient has booked an appointment via API', async function () {
  if (!patientToken) patientToken = await ApiClient.loginAsPatient()
  const doctor = await ApiClient.getFirstDoctor(patientToken)
  setupAppointmentId = await ApiClient.bookFirstAvailableSlot(doctor.id, patientToken)
  bookedDoctorName = doctor.name
})

Given('the app is sent to the background', async function () {
  await driver.pressKeyCode(3) // KEYCODE_HOME
  await browser.pause(1500)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the patient books an appointment with the first available doctor', async function () {
  await doctorsPage.waitForVisible()
  const doctor = await ApiClient.getFirstDoctor(patientToken)
  bookedDoctorName = doctor.name
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.waitForVisible()
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()
  // local notification fires immediately after booking; allow OS to process it
  await browser.pause(2000)
})

When('the patient taps the booking notification', async function () {
  await notificationPage.open()
  await notificationPage.tapNotificationByText(bookedDoctorName)
})

When('the booking notification is triggered manually', async function () {
  // Re-open the app to trigger notification display (notification was pre-scheduled via API booking)
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(2000)
  await notificationPage.open()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('a notification appears with the doctor name in the message', async function () {
  await notificationPage.open()
  const el = await notificationPage.findNotificationByText(bookedDoctorName)
  expect(el).not.toBeNull()
  await notificationPage.dismiss()
})

Then('the notification title is {string}', async function (expectedTitle: string) {
  await notificationPage.open()
  const title = await notificationPage.getNotificationTitle(bookedDoctorName)
  expect(title).toBe(expectedTitle)
  await notificationPage.dismiss()
})

Then('the appointment detail screen is shown', async function () {
  await deepLinkPage.waitForVisible()
})

Then('the appointment status is {string}', async function (expectedStatus: string) {
  const status = await deepLinkPage.getAnyAppointmentStatus()
  expect(status).toBe(expectedStatus)
})

Then('the notification shade contains the appointment text', async function () {
  const el = await notificationPage.findNotificationByText('appointment')
  expect(el).not.toBeNull()
  await notificationPage.dismiss()
})

Then('returning to the app shows the appointments screen', async function () {
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(2000)
  await appointmentsPage.waitForVisible()
})
