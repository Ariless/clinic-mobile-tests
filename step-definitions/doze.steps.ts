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
let appointmentId: number | undefined
let inDoze = false

Before({ tags: '@doze' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  appointmentsPage = new AppointmentsPage()
  patientToken = ''
  doctorToken = ''
  appointmentId = undefined
  inDoze = false
})

After({ tags: '@doze' }, async function () {
  if (inDoze) {
    ADB.exitDozeMode()
    inDoze = false
  }
  if (appointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(appointmentId, patientToken)
    } catch { /* appointment may already be in a terminal state */ }
  }
})

// ── Given ─────────────────────────────────────────────────────────────────────

Given('the patient is logged in and has a pending appointment cached in the UI', async function () {
  patientToken = await ApiClient.loginAsPatient()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()

  const firstDoctorId = await ApiClient.getFirstDoctorId(patientToken)
  appointmentId = await ApiClient.bookFirstAvailableSlot(firstDoctorId, patientToken)

  // Navigate to appointments so the app caches the pending status before Doze
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
})

// ── When ──────────────────────────────────────────────────────────────────────

When('the device enters Doze mode', function () {
  ADB.enterDozeMode()
  inDoze = true
})

When('the doctor confirms the appointment via the API while in Doze', async function () {
  if (!appointmentId) throw new Error('No appointment to confirm — check Given step')
  doctorToken = await ApiClient.loginAsDoctor()
  await ApiClient.confirmAppointment(appointmentId, doctorToken)
})

When('the device exits Doze mode', function () {
  ADB.exitDozeMode()
  inDoze = false
})

// ── Then ──────────────────────────────────────────────────────────────────────

Then('the appointments list shows the up-to-date confirmed status', async function () {
  await appointmentsPage.waitForList()
  const status = await appointmentsPage.getFirstAppointmentStatus()
  if (!status.toLowerCase().includes('confirm')) {
    const dozeState = ADB.getDozeState()
    this.attach(
      JSON.stringify({
        packageName: APP_PACKAGE,
        appointmentId,
        actualStatus: status,
        dozeState,
        note: 'Stale UI — app did not refresh appointment status after Doze exit',
      }, null, 2),
      'application/json',
    )
  }
  expect(status.toLowerCase()).toContain('confirm')
})
