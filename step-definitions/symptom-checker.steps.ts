import { Given, When, Then, Before } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { LoginPage, DoctorsPage, SymptomCheckerPage } from '../pages/factory'

// Mirror the SUT's ALLOWED_SPECIALTIES — if the SUT adds a specialty, this list must be updated too.
// A mismatch here would cause the invariant test to fail, which is the intended signal.
const ALLOWED_SPECIALTIES = [
  'General Practitioner',
  'Cardiologist',
  'Neurologist',
  'Dermatologist',
  'Orthopedist',
  'Pediatrician',
]

const aiEnabled = process.env.ENABLE_AI_RECOMMENDATION === 'true'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let symptomPage: SymptomCheckerPage
let notedSpecialty = ''

Before({ tags: '@ai' }, async function () {
  if (!aiEnabled) return 'pending'
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  symptomPage = new SymptomCheckerPage()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('I am logged in as a patient on the symptom checker tab', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
    60000,
  )
  await doctorsPage.waitForDoctorList()
  await symptomPage.navigateTo()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I navigate to the AI symptom checker', async function () {
  await symptomPage.navigateTo()
})

When('I describe symptoms {string}', async function (symptoms: string) {
  await symptomPage.enterSymptoms(symptoms)
})

When('I submit the symptom check', async function () {
  await symptomPage.submit()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the recommended specialty is one of the allowed specialties', async function () {
  await symptomPage.waitForResultOrError()
  if (await symptomPage.isErrorVisible()) {
    const err = await symptomPage.getErrorText()
    throw new Error(`AI returned error instead of specialty: ${err}`)
  }
  const raw = await symptomPage.getRecommendedSpecialty()
  // Text format: "Recommended: Cardiologist"
  const specialty = raw.replace(/^Recommended:\s*/i, '').trim()
  expect(ALLOWED_SPECIALTIES).toContain(specialty)
})

Then('at least one doctor is shown in the results', async function () {
  const count = await symptomPage.getDoctorCount()
  expect(count).toBeGreaterThan(0)
})

Then('the reasoning is present and non-empty', async function () {
  const reasoning = await symptomPage.getReasoning()
  expect(reasoning).toBeTruthy()
  expect(reasoning!.trim().length).toBeGreaterThan(0)
})

Then('the app shows a user-friendly symptom error', async function () {
  await symptomPage.waitForError()
  const errorText = await symptomPage.getErrorText()
  // Must not expose internal error codes, stack traces, or raw exception messages
  expect(errorText).not.toMatch(/UNKNOWN_SPECIALTY|VALIDATION_ERROR|CLAUDE_UNAVAILABLE/i)
  expect(errorText).not.toMatch(/stack|at\s+\w+\s+\(/i)
  expect(errorText.trim().length).toBeGreaterThan(10)
})

Then('the patient can still navigate to the doctors list', async function () {
  await doctorsPage.switchToDoctors()
  await doctorsPage.waitForDoctorList()
})

Then('the app does not crash or expose sensitive data', async function () {
  // App is still interactive if any key element is present
  const inputVisible = await symptomPage.isInputVisible()
  const resultVisible = await symptomPage.isResultVisible()
  const errorVisible = await symptomPage.isErrorVisible()
  expect(inputVisible || resultVisible || errorVisible).toBe(true)

  if (errorVisible) {
    const errorText = await symptomPage.getErrorText()
    // No JWT tokens, passwords, or DB internals in the error message
    expect(errorText).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
    expect(errorText).not.toMatch(/password|secret|token/i)
    expect(errorText).not.toMatch(/sql|database|stacktrace/i)
  }
})

Then('either a specialty is recommended or a user-friendly error is shown', async function () {
  const resultVisible = await symptomPage.isResultVisible()
  const errorVisible = await symptomPage.isErrorVisible()
  expect(resultVisible || errorVisible).toBe(true)
})

// ── #34 Metamorphic steps ────────────────────────────────────────────────────

Then('I note the recommended specialty', async function () {
  // Called after waitForResult() has already passed — result is guaranteed visible
  const raw = await symptomPage.getRecommendedSpecialty()
  notedSpecialty = raw.replace(/^Recommended:\s*/i, '').trim()
})

Then('the recommended specialty matches the noted specialty', async function () {
  const raw = await symptomPage.getRecommendedSpecialty()
  const current = raw.replace(/^Recommended:\s*/i, '').trim()
  // Metamorphic relation: transformed input must yield the same specialty.
  // If it doesn't, the model is sensitive to surface-level phrasing — a reliability issue.
  expect(current).toBe(notedSpecialty)
})

// ── #36 Hallucination detection (UI layer) ───────────────────────────────────

Then('every doctor in the results matches the recommended specialty', async function () {
  const raw = await symptomPage.getRecommendedSpecialty()
  const specialty = raw.replace(/^Recommended:\s*/i, '').trim()
  const doctorSpecialties = await symptomPage.getDoctorSpecialties()
  for (const ds of doctorSpecialties) {
    // If any doctor card shows a different specialty, the filter is broken
    // or the AI returned a specialty that doesn't match the DB lookup
    expect(ds).toBe(specialty)
  }
})
