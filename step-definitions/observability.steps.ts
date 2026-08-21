import { When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { BookingPage } from '../pages/factory'
import { ApiClient } from '../support/apiClient'
import { isLokiReady, waitForLokiLog, parseLogLines } from '../support/loki'

const LOKI_ENABLED = process.env.LOKI_ENABLED === 'true'

const bookingPage = new BookingPage()

let startMs: number = 0
let bookedAppointmentId: number | undefined
let patientToken: string = ''

Before({ tags: '@observability' }, async function () {
  if (!LOKI_ENABLED) return 'pending'
  const ready = await isLokiReady()
  if (!ready) throw new Error('Loki is not reachable at http://localhost:3100 — start the observability stack first')
  startMs = 0
  bookedAppointmentId = undefined
  patientToken = ''
})

After(async function () {
  if (bookedAppointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(bookedAppointmentId, patientToken)
    } catch {
      // best-effort
    }
    bookedAppointmentId = undefined
  }
})

// ── When ──────────────────────────────────────────────────────────────────────

// Books via mobile UI, then resolves the appointmentId via API.
// The UI does not expose the appointmentId — API is the only way to get it.
When('I book the first available slot and record the appointment id', async function () {
  startMs = Date.now()
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()

  patientToken = await ApiClient.loginAsPatient()
  const appointments = await ApiClient.getMyAppointments(patientToken)
  const latest = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => b.id - a.id)[0]
  if (!latest) throw new Error('No pending appointment found after mobile booking')
  bookedAppointmentId = latest.id
})

// ── Then ──────────────────────────────────────────────────────────────────────

// Polls Loki until the appointment.booked event for this appointmentId appears.
// Promtail ingestion lag is typically 1–3 s — timeout of 15 s gives enough headroom.
Then('the appointment.booked event for this booking appears in Loki', async function () {
  const results = await waitForLokiLog(String(bookedAppointmentId), startMs)
  const lines = parseLogLines(results)
  const bookingLog = lines.find(l => l.event === 'appointment.booked')

  this.attach(
    JSON.stringify({ appointmentId: bookedAppointmentId, found: bookingLog ?? null }, null, 2),
    'application/json',
  )

  if (!bookingLog) throw new Error(`appointment.booked event not found in Loki for appointmentId=${bookedAppointmentId}`)
  expect(bookingLog.appointmentId).toBe(bookedAppointmentId)
})
