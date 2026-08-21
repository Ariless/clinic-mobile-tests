import { When, Then } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { BookingPage, SymptomCheckerPage } from '../pages/factory'

// "Given the logcat buffer is cleared"        — reused from security.steps.ts
// "Given I am logged in as a patient"          — reused from booking.steps.ts
// "When I select the first available doctor"   — reused from booking.steps.ts
// "When I book the first available slot"       — reused from booking.steps.ts
// "When I navigate to the AI symptom checker"  — reused from symptom-checker.steps.ts
// "When I describe symptoms {string}"          — reused from symptom-checker.steps.ts
// "When I submit the symptom check"            — reused from symptom-checker.steps.ts

// ── When ─────────────────────────────────────────────────────────────────────

When('I select the first doctor from AI results', async function () {
  const symptomPage = new SymptomCheckerPage()
  await symptomPage.waitForResult(15000)
  const firstDoctor = $('//*[contains(@resource-id,"symptom-doctor-item-")]')
  await firstDoctor.waitForDisplayed({ timeout: 10000 })
  await firstDoctor.click()
  const bookingPage = new BookingPage()
  await bookingPage.waitForVisible()
})

// ── Then ─────────────────────────────────────────────────────────────────────

// Hermes engine serialises console.log(a, b) as "'a', 'b'" in logcat.
// Match both the single-arg format "[analytics] event" and the two-arg Hermes format "'[analytics]', 'event'".
function logcatHasEvent(log: string, event: string): boolean {
  return log.includes(`[analytics] ${event}`) || log.includes(`'[analytics]', '${event}'`)
}

Then('logcat contains the analytics event {string}', async function (event: string) {
  const log = ADB.logcat()
  const found = logcatHasEvent(log, event)
  this.attach(JSON.stringify({ event, found, snippet: log.split('\n').filter(l => l.includes('[analytics]')).join('\n') }), 'application/json')
  expect(found).toBe(true)
})

Then('logcat does not contain the analytics event {string}', async function (event: string) {
  const log = ADB.logcat()
  const found = logcatHasEvent(log, event)
  this.attach(JSON.stringify({ event, found }), 'application/json')
  expect(found).toBe(false)
})
