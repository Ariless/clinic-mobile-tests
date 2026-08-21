import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DoctorsPage, BookingPage, AppointmentsPage, DoctorAppointmentsPage } from '../pages/factory'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage
let doctorAppointmentsPage: DoctorAppointmentsPage

let bookedAppointmentId: string
let patientToken: string

Before({ tags: '@cross-role' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()
  doctorAppointmentsPage = new DoctorAppointmentsPage()
  bookedAppointmentId = ''
  patientToken = ''
})

After(async function () {
  if (bookedAppointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(Number(bookedAppointmentId), patientToken)
    } catch {
      // terminal state (rejected/completed) — nothing to clean up
    }
  }
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the patient logs in and books a new appointment', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.waitForVisible()
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()

  // resolve the appointment ID via API — the booking UI does not expose it
  // take highest ID among pending to get the one just created, not a stale one
  patientToken = await ApiClient.loginAsPatient()
  const appointments = await ApiClient.getMyAppointments(patientToken)
  const pending = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => b.id - a.id)[0]
  if (!pending) throw new Error('No pending appointment found after booking via UI')
  bookedAppointmentId = String(pending.id)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the patient logs out', async function () {
  await bookingPage.goBack()
  await doctorsPage.waitForDoctorList()
  await doctorsPage.logout()
  await loginPage.waitForVisible()
})

When('the doctor logs in and confirms the pending appointment', async function () {
  await loginPage.login(
    process.env.DOCTOR_EMAIL ?? 'doctor@example.com',
    process.env.DOCTOR_PASSWORD ?? 'password123',
  )
  await doctorAppointmentsPage.waitForList()
  await doctorAppointmentsPage.confirmAppointmentById(bookedAppointmentId)
})

When('the doctor logs in and rejects the pending appointment', async function () {
  await loginPage.login(
    process.env.DOCTOR_EMAIL ?? 'doctor@example.com',
    process.env.DOCTOR_PASSWORD ?? 'password123',
  )
  await doctorAppointmentsPage.waitForList()
  await doctorAppointmentsPage.rejectAppointmentById(bookedAppointmentId)
})

When('the doctor logs out', async function () {
  await doctorAppointmentsPage.logout()
  await loginPage.waitForVisible()
})

When('the patient logs in again', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the patient sees the appointment with status {string}', async function (expectedStatus: string) {
  const status = await appointmentsPage.getAppointmentStatus(bookedAppointmentId)
  expect(status).toBe(expectedStatus)
})
