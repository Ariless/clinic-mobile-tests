import { Given, When, Then, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { BookingPage } from '../pages/factory'
import { ApiClient } from '../support/apiClient'

// chaos.steps.ts Before/After handle: app reset, wifi restore, slow network clear.
// This file only owns: slot tracking and appointment cleanup.

const bookingPage = new BookingPage()

let recordedSlotId: number | undefined
let patientToken: string = ''

After(async function () {
  if (recordedSlotId && patientToken) {
    try {
      const appointments = await ApiClient.getMyAppointments(patientToken)
      const appt = appointments.find(a => a.slotId === recordedSlotId)
      if (appt) await ApiClient.cancelAppointment(appt.id, patientToken)
    } catch {
      // best-effort
    }
    recordedSlotId = undefined
  }
})

// ── Given ─────────────────────────────────────────────────────────────────────

// Fetches available slots via API and records the first slot id.
// Assumes doctor 1 = first doctor shown in the UI (seed data ordering).
Given('I record the first available slot id for doctor {int}', async function (doctorId: number) {
  patientToken = await ApiClient.loginAsPatient()
  const slots = await ApiClient.getAvailableSlots(doctorId, patientToken)
  if (slots.length === 0) throw new Error(`No available slots for doctor ${doctorId}`)
  recordedSlotId = slots[0].id
})

// ── When ──────────────────────────────────────────────────────────────────────

// Waits for the first attempt's network error, then taps the slot again.
// The retry either succeeds (if the first POST failed server-side) or gets
// SLOT_TAKEN 409 (if the first POST already created the appointment).
// Either outcome means at most one appointment in the DB — verified in Then.
When('I retry the booking attempt', async function () {
  await bookingPage.waitForError()
  await bookingPage.bookFirstAvailableSlot()
  await driver.pause(2000)
})

// ── Then ──────────────────────────────────────────────────────────────────────

Then('at most one appointment exists for that slot', async function () {
  if (!recordedSlotId) throw new Error('recordedSlotId not set — add "I record the first available slot id" step')
  const appointments = await ApiClient.getMyAppointments(patientToken)
  const forSlot = appointments.filter(a => a.slotId === recordedSlotId)
  this.attach(JSON.stringify({ slotId: recordedSlotId, found: forSlot }, null, 2), 'application/json')
  expect(forSlot.length).toBeLessThanOrEqual(1)
})
