import { When, Then } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'
import { LoginPage, BookingPage } from '../pages/factory'

// No Before hook — ai.steps.ts Before runs globally and handles API key skip + page object init.
// No After hook — chaos.steps.ts After restores wifi if disabled in scenario 2.

const loginPage = new LoginPage()
const bookingPage = new BookingPage()

async function takeScreenshot(): Promise<string> {
  const base64 = await driver.takeScreenshot()
  const tmpPath = path.join(os.tmpdir(), `empathy-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'))
  return tmpPath
}

const EMPATHY_PROMPT = `This is a screen from a medical appointment booking app shown to a patient.
Rate 1–5 how empathetic, clear, and appropriate the message or state visible on screen is
for a patient who may be stressed or disappointed.
Criteria:
1. Avoids technical jargon and raw error codes
2. Explains what happened in plain human language
3. Tells the patient what to do next, or reassures them
4. Maintains a calm, warm, and professional tone appropriate for healthcare
Score 1 = cold/technical/jargon/cryptic, Score 5 = warm/clear/actionable/patient-centred.`

// ── When ──────────────────────────────────────────────────────────────────────

When('I enter wrong credentials on the login screen', async function () {
  await loginPage.waitForVisible()
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    'definitely-wrong-password',
  )
  await loginPage.waitForLoginError()
})

// ── Then ──────────────────────────────────────────────────────────────────────

// Generic: for login error and cancellation — no extra wait needed (state already reached in When)
Then('the on-screen message is rated at least {int} out of 5 for patient empathy',
  async function (minScore: number) {
    const screenshotPath = await takeScreenshot()
    const result = await Claude.evaluateUX(screenshotPath, EMPATHY_PROMPT)
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    expect(result.score).toBeGreaterThanOrEqual(minScore)
  })

// Booking-specific: wifi was killed before booking attempt — wait for error before screenshot
Then('the booking error message is rated at least {int} out of 5 for patient empathy',
  async function (minScore: number) {
    // 15 s margin: app's fetch timeout is 10 s, so error appears at ~10 s — need buffer
    await bookingPage.waitForError(15000)
    const screenshotPath = await takeScreenshot()
    const result = await Claude.evaluateUX(screenshotPath, EMPATHY_PROMPT)
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    expect(result.score).toBeGreaterThanOrEqual(minScore)
  })
