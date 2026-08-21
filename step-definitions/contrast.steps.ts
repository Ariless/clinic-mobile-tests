import { Given, Then, After } from '@wdio/cucumber-framework'
import type { IWorld } from '@cucumber/cucumber'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { checkPairs, ColorPair } from '../support/contrastChecker'
import { ApiClient } from '../support/apiClient'

// "Given I am logged in as a patient"  — reused from booking.steps.ts
// "And I have a pending appointment"   — reused from booking.steps.ts
// "When I open My Visits"              — reused from booking.steps.ts

// ── Color pairs extracted from SUT StyleSheet constants ───────────────────────

const LOGIN_PAIRS: ColorPair[] = [
  { name: 'Title text',             fg: '#1a1a2e', bg: '#ffffff', largeText: true  },
  { name: 'Primary button text',    fg: '#ffffff', bg: '#3b82f6', largeText: false },
  { name: 'Biometric button text',  fg: '#ffffff', bg: '#8b5cf6', largeText: false },
  { name: 'Error text',             fg: '#e53e3e', bg: '#ffffff', largeText: false },
  { name: 'Secondary / fallback',   fg: '#64748b', bg: '#ffffff', largeText: false },
  { name: 'Link text (terms)',       fg: '#3b82f6', bg: '#ffffff', largeText: false },
]

const APPOINTMENTS_PAIRS: ColorPair[] = [
  { name: 'Screen title',             fg: '#1a1a2e', bg: '#f8fafc', largeText: true  },
  { name: 'Badge text (pending)',     fg: '#ffffff', bg: '#f59e0b', largeText: false },
  { name: 'Badge text (confirmed)',   fg: '#ffffff', bg: '#22c55e', largeText: false },
  { name: 'Badge text (cancelled)',   fg: '#ffffff', bg: '#94a3b8', largeText: false },
  { name: 'Appointment type text',    fg: '#64748b', bg: '#ffffff', largeText: false },
  { name: 'Cancel button text',       fg: '#ffffff', bg: '#ef4444', largeText: false },
]

const DOCTORS_PAIRS: ColorPair[] = [
  { name: 'Doctor name',           fg: '#1a1a2e', bg: '#ffffff', largeText: false },
  { name: 'Specialty text',        fg: '#64748b', bg: '#ffffff', largeText: false },
  { name: 'Book button text',      fg: '#ffffff', bg: '#3b82f6', largeText: false },
  { name: 'Offline banner text',   fg: '#92400e', bg: '#fde68a', largeText: false },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

let appointmentId: number | undefined

After({ tags: '@contrast' }, async function () {
  const patientToken = await ApiClient.loginAsPatient()
  if (appointmentId) {
    try { await ApiClient.cancelAppointment(appointmentId, patientToken) } catch { /* best-effort */ }
  }
  appointmentId = undefined
})

async function screenshotAndAssert(
  // Cucumber's World, not the WDIO Browser. It was annotated as Browser and the
  // mismatch papered over with @ts-expect-error on the `attach` call below —
  // which is backwards: `attach` is the one thing here that belongs to World.
  // Typing it correctly removes both the error and the suppression.
  this: IWorld,
  screenName: string,
  pairs: ColorPair[],
): Promise<void> {
  const imgPath = path.join(os.tmpdir(), `contrast-${screenName}-${Date.now()}.png`)
  fs.writeFileSync(imgPath, Buffer.from(await driver.takeScreenshot(), 'base64'))

  const results = checkPairs(pairs)
  const failing = results.filter(r => !r.pass)

  const report = results.map(r =>
    `${r.pass ? '✅' : '❌'} ${r.name}: ${r.ratio}:1 (required ${r.required}:1) — fg ${r.fg} on bg ${r.bg}`,
  ).join('\n')

  this.attach(report, 'text/plain')

  if (failing.length > 0) {
    const msg = failing.map(r =>
      `${r.name}: ${r.ratio}:1 < ${r.required}:1 (fg ${r.fg} on bg ${r.bg})`,
    ).join('\n')
    throw new Error(`WCAG AA contrast failures on "${screenName}" screen:\n${msg}`)
  }
}

// ── Steps ────────────────────────────────────────────────────────────────────

Given('I am on the login screen', async function () {
  await $('//*[@resource-id="login-title"]').waitForDisplayed({ timeout: 10000 })
})

Then('all login screen color pairs meet WCAG AA contrast', async function () {
  await screenshotAndAssert.call(this, 'login', LOGIN_PAIRS)
})

Then('all appointments screen color pairs meet WCAG AA contrast', async function () {
  await screenshotAndAssert.call(this, 'appointments', APPOINTMENTS_PAIRS)
})

Then('all doctors screen color pairs meet WCAG AA contrast', async function () {
  await screenshotAndAssert.call(this, 'doctors', DOCTORS_PAIRS)
})
