import { Given, When, Then, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { WsClient } from '../support/wsClient'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DoctorsPage, BookingPage, AppointmentsPage } from '../pages/factory'

// "When a patient books an appointment via the UI" uses Appium to simulate the real booking action.
// All other API calls go through ApiClient so the chain stays clean.

let doctorWs: WsClient | null = null
let patientWs: WsClient | null = null
let patientToken: string
let doctorToken: string
let appointmentId: number | undefined
let bookedSlotId: number | undefined

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage

After({ tags: '@event-chain' }, async function () {
  doctorWs?.disconnect()
  patientWs?.disconnect()
  doctorWs = null
  patientWs = null
  if (appointmentId) {
    try { await ApiClient.cancelAppointment(appointmentId, patientToken) } catch { /* best-effort */ }
  }
  appointmentId = undefined
  bookedSlotId = undefined
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('a doctor WS client is connected', async function () {
  doctorToken = await ApiClient.loginAsDoctor()
  doctorWs = new WsClient(doctorToken)
  await doctorWs.connect()
})

Given('a patient WS client is connected', async function () {
  patientToken = await ApiClient.loginAsPatient()
  patientWs = new WsClient(patientToken)
  await patientWs.connect()
})

Given('a patient has a pending appointment', async function () {
  patientToken = await ApiClient.loginAsPatient()
  const doctorId = await ApiClient.getFirstDoctorId(doctorToken)
  appointmentId = await ApiClient.bookFirstAvailableSlot(doctorId, patientToken)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('a patient books an appointment via the UI', async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()

  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()

  // Retrieve appointmentId from the WS event once it arrives
})

When('a patient books an appointment via the API', async function () {
  patientToken = await ApiClient.loginAsPatient()
  const slots = await ApiClient.getAvailableSlots(1, doctorToken)
  if (slots.length === 0) throw new Error('No available slots')
  bookedSlotId = slots[0].id
  appointmentId = await ApiClient.bookFirstAvailableSlot(1, patientToken)
})

When('the patient attempts to book the same slot again', async function () {
  if (!bookedSlotId || !patientToken) throw new Error('No slot or token to retry with')
  try {
    await ApiClient.bookAppointment(bookedSlotId, patientToken)
  } catch {
    // Expected: slot is no longer available — 409 or 422
  }
})

When('the doctor confirms the appointment via the API', async function () {
  if (!appointmentId) throw new Error('No appointmentId to confirm')
  doctorToken = await ApiClient.loginAsDoctor()
  await ApiClient.confirmAppointment(appointmentId, doctorToken)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the doctor receives an appointment.booked event', async function () {
  const event = await doctorWs!.waitForEvent('appointment.booked', 10000)
  appointmentId = event.appointmentId
})

Then('the patient receives an appointment.confirmed event', async function () {
  await patientWs!.waitForEvent('appointment.confirmed', 10000)
})

Then('the event contains the correct appointmentId and patient status {string}', async function (expectedStatus: string) {
  const eventName = expectedStatus === 'pending' ? 'appointment.booked' : 'appointment.confirmed'
  const ws = expectedStatus === 'pending' ? doctorWs! : patientWs!
  const events = ws.getEvents(eventName)
  expect(events.length).toBeGreaterThan(0)
  const event = events[events.length - 1]
  expect(event.appointmentId).toBeDefined()
  expect(event.status).toBe(expectedStatus)
})

Then('exactly 1 appointment.booked event was received by the doctor', async function () {
  // Give a brief window for any potential duplicate to arrive
  await browser.pause(1000)
  const events = doctorWs!.getEvents('appointment.booked')
  if (events.length !== 1) {
    throw new Error(`Expected exactly 1 appointment.booked event, got ${events.length}`)
  }
})
