import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { SymptomCheckerPage } from '../pages/factory'

const RECOVERY_MS = parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_MS ?? '2000', 10)

let symptomPage: SymptomCheckerPage

Before({ tags: '@circuit-breaker' }, async function () {
  symptomPage = new SymptomCheckerPage()
})

After({ tags: '@circuit-breaker' }, async function () {
  try { await ApiClient.resetAiCircuit() } catch { /* best-effort */ }
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the AI circuit breaker is reset', async function () {
  await ApiClient.resetAiCircuit()
})

Given('the AI circuit breaker is forced open', async function () {
  await ApiClient.forceAiCircuitOpen()
  const { state } = await ApiClient.getAiCircuitState()
  expect(state).toBe('open')
})

Given('the circuit breaker recovery timeout has elapsed', async function () {
  await browser.pause(RECOVERY_MS + 500)
})

// ── When ─────────────────────────────────────────────────────────────────────

// "Given I am logged in as a patient"  — reused from booking.steps.ts
// "When I navigate to the AI symptom checker" — reused from symptom-checker.steps.ts

When('I submit symptoms {string}', async function (symptoms: string) {
  await symptomPage.submitSymptoms(symptoms)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the symptom checker shows a recommendation', async function () {
  await symptomPage.waitForResult(15000)
  const specialty = await symptomPage.getRecommendedSpecialty()
  expect(specialty).toBeTruthy()
})

Then('the symptom checker shows a patient-appropriate error within 3 seconds', async function () {
  await symptomPage.waitForError(3000)

  // Read through the page object, as every other step does. Until 2026-08-27 this line was
  // `await this.el?.('symptom-error')?.getText?.() ?? ''` — and `this.el` is defined nowhere in
  // `support/`, so the optional chain collapsed to '' on every run. The step attached an empty
  // string to the report and asserted nothing about it, while `getErrorText()` sat unused on the
  // page object. The scenario was green because the wait above did all the work: it proved an
  // error appeared, never what it said.
  const text = await symptomPage.getErrorText()
  this.attach(JSON.stringify({ errorText: text, circuitState: 'open' }), 'application/json')

  // Same floor as the other patient-appropriate steps: readable prose, not a stack trace or JSON.
  expect(text).not.toMatch(/Error:|TypeError:|undefined|{/)
  expect(text.length).toBeGreaterThan(10)

  // And the part specific to an open breaker. "Please try again" is the one instruction this state
  // must not give: the backend has deliberately stopped calling the model, so a retry is a request
  // it already knows it will shed, and the patient is being asked to generate load that cannot
  // succeed. The app said exactly that until 2026-08-27, because CIRCUIT_OPEN was missing from the
  // branch that carries the useful advice — and this step could not see it.
  expect(text.toLowerCase()).not.toContain('try again')
})

Then('the AI circuit breaker state is {string}', async function (expectedState: string) {
  const { state, failures } = await ApiClient.getAiCircuitState()
  this.attach(JSON.stringify({ state, failures, expected: expectedState }), 'application/json')
  expect(state).toBe(expectedState)
})
