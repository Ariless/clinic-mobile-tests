import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { LoginPage, DoctorsPage, AppointmentsPage, DoctorAppointmentsPage } from '../pages/factory'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let appointmentsPage: AppointmentsPage
let doctorAppointmentsPage: DoctorAppointmentsPage

let appointmentId: number
let patientToken: string
let doctorToken: string
let lastTransitionStatusCode: number

Before({ tags: '@state-transitions or @touch-targets' }, function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  appointmentsPage = new AppointmentsPage()
  doctorAppointmentsPage = new DoctorAppointmentsPage()
  appointmentId = 0
  patientToken = ''
  doctorToken = ''
  lastTransitionStatusCode = 0
})

After({ tags: '@state-transitions' }, async function () {
  if (!appointmentId) return
  try {
    // best-effort cleanup — cancel if still in a cancellable state
    const token = patientToken || doctorToken
    const appt = await ApiClient.getAppointment(appointmentId, token)
    if (appt.status === 'pending' || appt.status === 'confirmed') {
      await ApiClient.cancelAppointment(appointmentId, patientToken || '')
    }
  } catch { /* terminal state or already clean */ }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function prepareAppointmentInState(targetState: string): Promise<void> {
  patientToken = await ApiClient.loginAsPatient()
  doctorToken = await ApiClient.loginAsDoctor()
  const doctorId = await ApiClient.getFirstDoctorId(doctorToken)
  appointmentId = await ApiClient.bookFirstAvailableSlot(doctorId, patientToken)

  if (targetState === 'confirmed' || targetState === 'completed') {
    await ApiClient.confirmAppointment(appointmentId, doctorToken)
  }
  if (targetState === 'completed') {
    await ApiClient.completeAppointment(appointmentId, doctorToken)
  }
  if (targetState === 'cancelled') {
    await ApiClient.cancelAppointment(appointmentId, patientToken)
  }
}

// ── Given ────────────────────────────────────────────────────────────────────

Given('an appointment in {string} state is prepared', async function (targetState: string) {
  await prepareAppointmentInState(targetState)
})

Given('the doctor is logged in on mobile and sees the appointments', async function () {
  await loginPage.login(
    process.env.DOCTOR_EMAIL ?? 'doctor@example.com',
    process.env.DOCTOR_PASSWORD ?? 'password123',
  )
  await doctorAppointmentsPage.waitForList()
})

Given('the patient is logged in on mobile and sees My Visits', async function () {
  if (!loginPage) loginPage = new LoginPage()
  if (!doctorsPage) doctorsPage = new DoctorsPage()
  if (!appointmentsPage) appointmentsPage = new AppointmentsPage()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the doctor confirms the appointment on mobile', async function () {
  await doctorAppointmentsPage.confirmAppointmentById(String(appointmentId))
})

When('the doctor rejects the appointment on mobile', async function () {
  await doctorAppointmentsPage.rejectAppointmentById(String(appointmentId))
})

When('the doctor marks the appointment as completed on mobile', async function () {
  await doctorAppointmentsPage.completeAppointmentById(String(appointmentId))
})

When('the doctor cancels the confirmed appointment on mobile', async function () {
  await doctorAppointmentsPage.cancelAppointmentById(String(appointmentId))
})

When('the patient cancels the appointment on mobile', async function () {
  await appointmentsPage.cancelAppointmentById(String(appointmentId))
})

When('the doctor attempts the {string} transition via API', async function (action: string) {
  const paths: Record<string, string> = {
    reject:   `/appointments/${appointmentId}/reject`,
    confirm:  `/appointments/${appointmentId}/confirm`,
    complete: `/appointments/${appointmentId}/complete`,
  }
  const path = paths[action]
  if (!path) throw new Error(`Unknown transition action: ${action}`)
  lastTransitionStatusCode = await ApiClient.tryTransition(path, doctorToken)
})

When('the patient attempts to cancel via API', async function () {
  lastTransitionStatusCode = await ApiClient.tryTransition(
    `/appointments/${appointmentId}/cancel`,
    patientToken,
  )
})

When('the patient and doctor attempt simultaneous transitions via API', async function () {
  const results = await Promise.allSettled([
    ApiClient.cancelAppointment(appointmentId, patientToken),
    ApiClient.confirmAppointment(appointmentId, doctorToken),
  ])
  // store outcome for Then step
  const successes = results.filter(r => r.status === 'fulfilled').length
  // reuse lastTransitionStatusCode as a success count (1 = correct race outcome)
  lastTransitionStatusCode = successes
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the appointment badge shows {string} in the doctor view', async function (expectedStatus: string) {
  const status = await doctorAppointmentsPage.getAppointmentStatus(String(appointmentId))
  expect(status).toBe(expectedStatus)
})

Then('the appointment badge shows {string} in the patient view', async function (expectedStatus: string) {
  const status = await appointmentsPage.getAppointmentStatus(String(appointmentId))
  expect(status).toBe(expectedStatus)
})

Then('the API reports the appointment status as {string}', async function (expectedStatus: string) {
  const token = patientToken || doctorToken
  const appt = await ApiClient.getAppointment(appointmentId, token)
  expect(appt.status).toBe(expectedStatus)
})

Then('the API returns 422 for the transition attempt', function () {
  expect(lastTransitionStatusCode).toBe(422)
})

Then('exactly one transition succeeds and the final state is consistent', async function () {
  // exactly one of cancel / confirm should have succeeded
  expect(lastTransitionStatusCode).toBe(1)

  // final state must be one of the two expected terminal states
  const token = patientToken || doctorToken
  const appt = await ApiClient.getAppointment(appointmentId, token)
  const validFinalStates = ['cancelled', 'confirmed']
  expect(validFinalStates).toContain(appt.status)

  this.attach(
    JSON.stringify({ finalStatus: appt.status, appointmentId }, null, 2),
    'application/json',
  )
})
