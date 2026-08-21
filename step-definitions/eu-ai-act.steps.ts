import { When, Then, Before } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { SymptomCheckerPage, DoctorsPage } from '../pages/factory'

let symptomPage: SymptomCheckerPage
let doctorsPage: DoctorsPage

Before({ tags: '@eu-ai-act' }, async function () {
  symptomPage = new SymptomCheckerPage()
  doctorsPage = new DoctorsPage()
  // clear symptom input between scenarios
  try {
    await symptomPage.clearSymptomInput()
  } catch {
    // input may not be visible yet
  }
})

// ── Transparency ──────────────────────────────────────────────────────────────

Then('the AI disclosure banner is visible on screen', async function () {
  const visible = await symptomPage.isDisclosureBannerVisible()
  expect(visible).toBe(true)
})

// ── Shared input / submit ─────────────────────────────────────────────────────

When('the patient enters symptoms {string} and submits', async function (symptoms: string) {
  await symptomPage.clearSymptomInput()
  await symptomPage.enterSymptoms(symptoms)
  await symptomPage.submit()
  await browser.waitUntil(
    async () => (await symptomPage.isResultVisible()) || (await symptomPage.isErrorVisible()),
    { timeout: 20000, timeoutMsg: 'Neither result nor error appeared within 20s' },
  )
})

Then('the AI reasoning text is visible and non-empty', async function () {
  const reasoning = await symptomPage.getReasoning()
  expect(reasoning).toBeTruthy()
  expect((reasoning as string).length).toBeGreaterThan(0)
})

// ── Human oversight ───────────────────────────────────────────────────────────

Then('the browse-all-doctors button is visible in the result', async function () {
  const visible = await symptomPage.isBrowseAllButtonVisible()
  expect(visible).toBe(true)
})

When('the patient taps browse all doctors', async function () {
  await symptomPage.tapBrowseAll()
})

Then('the doctors list screen is visible', async function () {
  await $(
    process.env.PLATFORM === 'ios' ? '~doctors-list' : '//*[@resource-id="doctors-list"]',
  ).waitForDisplayed({ timeout: 10000 })
})

// ── Accuracy — golden dataset ─────────────────────────────────────────────────

// 'the recommended specialty is {string}' — reuse from ondevice-ai.steps.ts

// ── Consistency ───────────────────────────────────────────────────────────────

When('the patient submits symptoms {string} three times in a row', async function (symptoms: string) {
  const results: string[] = []
  for (let i = 0; i < 3; i++) {
    await symptomPage.clearSymptomInput()
    await symptomPage.enterSymptoms(symptoms)
    await symptomPage.submit()
    await symptomPage.waitForResult()
    results.push(await symptomPage.getRecommendedSpecialty())
  }
  this.euAiActResults = results
})

Then('all three recommendations are identical', async function () {
  const results: string[] = this.euAiActResults
  expect(results).toHaveLength(3)
  expect(new Set(results).size).toBe(1)
  this.attach(JSON.stringify(results), 'application/json')
})

// ── Uncertainty ───────────────────────────────────────────────────────────────

Then('a patient-appropriate error message is shown', async function () {
  const visible = await symptomPage.isErrorVisible()
  expect(visible).toBe(true)
  const text = await symptomPage.getErrorText()
  // error must be patient-readable — not a stack trace or JSON
  expect(text).not.toMatch(/Error:|TypeError:|undefined|{/)
  expect(text.length).toBeGreaterThan(10)
  this.attach(text, 'text/plain')
})

Then('the app has not crashed', async function () {
  const inputVisible = await symptomPage.isInputVisible()
  expect(inputVisible).toBe(true)
})
