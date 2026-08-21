import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ApiClient } from '../support/apiClient'
import { Claude } from '../support/claude'
import { LoginPage, DoctorsPage, BookingPage, AppointmentsPage } from '../pages/factory'

const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage

let patientToken: string
let setupAppointmentId: number | undefined

Before({ tags: '@ai' }, async function () {
  if (!hasApiKey) return 'pending'

  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()
  patientToken = ''
  setupAppointmentId = undefined
})

After(async function () {
  if (setupAppointmentId && patientToken) {
    try {
      await ApiClient.cancelAppointment(setupAppointmentId, patientToken)
    } catch {
      // terminal state — nothing to clean
    }
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function takeScreenshot(): Promise<string> {
  const base64 = await driver.takeScreenshot()
  const tmpPath = path.join(os.tmpdir(), `appium-vision-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'))
  return tmpPath
}

// ── Given ────────────────────────────────────────────────────────────────────

Given('I have a pending appointment via API', async function () {
  patientToken = await ApiClient.loginAsPatient()
  const doctorToken = await ApiClient.loginAsDoctor()
  const slots = await ApiClient.getAvailableSlots(1, doctorToken)
  if (slots.length === 0) throw new Error('No available slots for test setup')
  const appt = await ApiClient.bookAppointment(slots[0].id, patientToken)
  setupAppointmentId = appt.id
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the booking confirmation is visible', async function () {
  await bookingPage.waitForConfirmation()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('Claude confirms the screen shows a successful appointment booking', async function () {
  const screenshotPath = await takeScreenshot()
  const result = await Claude.compareScreenshot(
    screenshotPath,
    'This is a mobile medical booking app. Does this screen clearly confirm that an appointment has been successfully booked? It should show a success message and indicate the booking is complete.',
  )
  this.attach(JSON.stringify(result, null, 2), 'application/json')
  expect(result.pass).toBe(true)
})

Then('Claude confirms the screen shows an appointment list with at least one entry', async function () {
  const screenshotPath = await takeScreenshot()
  const result = await Claude.compareScreenshot(
    screenshotPath,
    'This is a mobile medical booking app showing a patient\'s appointment list. Does this screen display at least one appointment entry? There should be visible appointment information, not an empty state.',
  )
  this.attach(JSON.stringify(result, null, 2), 'application/json')
  expect(result.pass).toBe(true)
})

Then('the booking screen has no consistently unlabeled interactive elements across {int} checks', async function (runs: number) {
  const screenshotPath = await takeScreenshot()

  // Run the audit multiple times to guard against non-determinism.
  // An element is a real issue only if Claude flags it in the majority of runs.
  const results = await Promise.all(
    Array.from({ length: runs }, () => Claude.auditA11y(screenshotPath))
  )

  this.attach(JSON.stringify(results, null, 2), 'application/json')

  // Count how many runs flagged each element label
  const frequency = new Map<string, number>()
  for (const r of results) {
    for (const el of r.unlabeled_elements) {
      frequency.set(el, (frequency.get(el) ?? 0) + 1)
    }
  }

  // Only fail on elements that appeared in the majority of runs (≥ 2/3 by default)
  const majority = Math.ceil(runs / 2)
  const confirmed = [...frequency.entries()]
    .filter(([, count]) => count >= majority)
    .map(([el]) => el)

  expect(confirmed).toEqual([])
})
