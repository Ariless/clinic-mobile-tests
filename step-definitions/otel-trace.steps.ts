import { Then } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'
import { waitForLokiLog, isLokiReady } from '../support/loki'

// "Given the logcat buffer is cleared"      — reused from security.steps.ts
// "Given I am logged in as a patient"        — reused from booking.steps.ts
// "When I select the first available doctor" — reused from booking.steps.ts
// "When I book the first available slot"     — reused from booking.steps.ts

let capturedTraceId: string | null = null
let capturedAppointmentId: number | null = null

// Extracts the traceId from the traceparent used for POST /appointments.
// Logcat line format: [trace] 00-{32hex}-{16hex}-01 POST /appointments
function extractTraceId(logOutput: string): string | null {
  const lines = logOutput.split('\n')
  for (const line of lines.reverse()) {
    if (line.includes('[trace]') && line.includes('POST') && line.includes('/appointments')) {
      const match = line.match(/00-([a-f0-9]{32})-[a-f0-9]{16}-[0-9a-f]{2}/)
      if (match) return match[1]
    }
  }
  return null
}

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the Loki trace for this booking contains the mobile traceId', async function () {
  if (!process.env.LOKI_ENABLED || !(await isLokiReady())) return 'pending'

  const logOutput = ADB.logcat()
  capturedTraceId = extractTraceId(logOutput)
  if (!capturedTraceId) {
    throw new Error('Could not find [trace] line for POST /appointments in logcat')
  }

  const bookingStartMs = Date.now() - 30_000
  const appointments = await ApiClient.getMyAppointments(
    await ApiClient.loginAsPatient()
  )
  capturedAppointmentId = appointments.sort((a, b) => b.id - a.id)[0]?.id ?? null

  const results = await waitForLokiLog(capturedTraceId, bookingStartMs, 20_000)
  this.attach(JSON.stringify({ traceId: capturedTraceId, lokiHits: results.length }), 'application/json')
  expect(results.length).toBeGreaterThan(0)
})

Then('the Loki trace contains the appointmentId', async function () {
  if (!process.env.LOKI_ENABLED || !(await isLokiReady())) return 'pending'
  if (!capturedTraceId || !capturedAppointmentId) return 'pending'

  const bookingStartMs = Date.now() - 30_000
  const results = await waitForLokiLog(
    `"appointmentId":${capturedAppointmentId}`,
    bookingStartMs,
    10_000,
  )
  const matchesTrace = results.some((r: unknown) =>
    JSON.stringify(r).includes(capturedTraceId!)
  )
  this.attach(JSON.stringify({ appointmentId: capturedAppointmentId, matchesTrace }), 'application/json')
  expect(matchesTrace).toBe(true)
})

Then('the Loki trace contains a response time measurement', async function () {
  if (!process.env.LOKI_ENABLED || !(await isLokiReady())) return 'pending'
  if (!capturedTraceId) return 'pending'

  const bookingStartMs = Date.now() - 30_000
  const results = await waitForLokiLog(capturedTraceId, bookingStartMs, 10_000)
  const hasResponseTime = results.some((r: unknown) =>
    JSON.stringify(r).includes('responseTime')
  )
  this.attach(JSON.stringify({ hasResponseTime }), 'application/json')
  expect(hasResponseTime).toBe(true)
})
