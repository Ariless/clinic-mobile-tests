import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DoctorsPage, BookingPage, AppointmentsPage } from '../pages/factory'

// Shared state across steps in a scenario
let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage

let selectedDoctorName: string
let setupAppointmentId: number | undefined
let patientToken: string

Before(async function () {
  try {
    await driver.terminateApp('com.anonymous.clinicmobile')
    await driver.activateApp('com.anonymous.clinicmobile')
  } catch { /* best-effort */ }
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()
  selectedDoctorName = ''
  setupAppointmentId = undefined
})

After(async function () {
  // clean up appointment created via API in Given steps
  if (setupAppointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(setupAppointmentId, patientToken)
    } catch {
      // best-effort cleanup
    }
  }
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('I am logged in as a patient', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  patientToken = await ApiClient.loginAsPatient()
})

Given('I have a pending appointment', async function () {
  patientToken = await ApiClient.loginAsPatient()
  const doctorToken = await ApiClient.loginAsDoctor()

  // get doctor id from token — we need any available slot
  // use first doctor visible in the app (id=1 from seed data)
  const slots = await ApiClient.getAvailableSlots(1, doctorToken)
  if (slots.length === 0) throw new Error('No available slots to create test appointment')

  const appt = await ApiClient.bookAppointment(slots[0].id, patientToken)
  setupAppointmentId = appt.id
})

Given('no slots are available for the first doctor', async function () {
  // this scenario requires the SUT to have no available slots
  // in practice: seed DB is reset between runs, or doctor id with 0 slots is used
  // for now: skip if slots exist — signal to the runner that precondition is not met
  patientToken = await ApiClient.loginAsPatient()
  const slots = await ApiClient.getAvailableSlots(1, patientToken)
  if (slots.length > 0) {
    return 'skipped'
  }
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I select the first available doctor', async function () {
  selectedDoctorName = await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.waitForVisible()
})

When('I book the first available slot', async function () {
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()
  // track appointment ID so After hook can cancel it regardless of booking path
  const appointments = await ApiClient.getMyAppointments(patientToken)
  const latest = appointments.sort((a, b) => b.id - a.id)[0]
  if (latest) setupAppointmentId = latest.id
})

When('I return to the doctor list', async function () {
  await bookingPage.goBack()
  await doctorsPage.waitForDoctorList()
})

When('I open My Visits', async function () {
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
})

When('I cancel my pending appointment', async function () {
  await appointmentsPage.cancelFirstPendingAppointment()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('I see the booking confirmation', async function () {
  await bookingPage.waitForConfirmation()
  const text = await bookingPage.getConfirmationText()
  expect(text).toContain('Appointment booked')
})

Then('I see my latest appointment with status {string}', async function (expectedStatus: string) {
  const status = await appointmentsPage.getFirstAppointmentStatus()
  expect(status).toBe(expectedStatus)
})

Then('my appointment shows status {string}', async function (expectedStatus: string) {
  const status = await appointmentsPage.getFirstAppointmentStatus()
  expect(status).toBe(expectedStatus)
})

Then("the booking screen shows that doctor's name", async function () {
  const name = await bookingPage.getDoctorName()
  expect(name).toBe(selectedDoctorName)
})

Then('I see {string}', async function (expectedText: string) {
  const emptyMsg = await bookingPage.getEmptyMessage()
  expect(emptyMsg).toContain(expectedText)
})
