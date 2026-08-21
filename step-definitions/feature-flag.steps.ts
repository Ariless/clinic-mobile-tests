import { Given, When, Then, Before } from '@wdio/cucumber-framework'
import { LoginPage, DoctorsPage, SymptomCheckerPage } from '../pages/factory'
import { ApiClient } from '../support/apiClient'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let symptomCheckerPage: SymptomCheckerPage
let patientToken: string
let flagStateFromApi: boolean

Before({ tags: '@feature-flag' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  symptomCheckerPage = new SymptomCheckerPage()
  patientToken = ''
  flagStateFromApi = true
  await driver.activateApp(process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile')
})

// Shared login step — also defined in foldable.steps.ts (global scope).
// If both files are loaded, the duplicate will cause a "step already defined" error.
// Extract to a shared hooks file when more step files are added.
//
// Given('I am logged in as a patient', ...)  ← defined in foldable.steps.ts

When('I check the AI feature flag state from the health endpoint', async function () {
  const health = await ApiClient.getHealth()
  flagStateFromApi = health.checks.ai.recommendationEnabled
})

Given('the AI recommendation flag is ON', async function () {
  const health = await ApiClient.getHealth()
  if (!health.checks.ai.recommendationEnabled) {
    throw new Error(
      'This scenario requires ENABLE_AI_RECOMMENDATION=true on the SUT. ' +
      'Current state: disabled. Restart the SUT with the flag enabled.',
    )
  }
})

Given('the AI recommendation flag is OFF', async function () {
  const health = await ApiClient.getHealth()
  if (health.checks.ai.recommendationEnabled) {
    throw new Error(
      'This scenario requires ENABLE_AI_RECOMMENDATION=false on the SUT. ' +
      'Current state: enabled. Restart the SUT with ENABLE_AI_RECOMMENDATION=false.',
    )
  }
})

async function isAiTabVisible(): Promise<boolean> {
  try {
    const sel = process.env.PLATFORM === 'ios'
      ? $('~tab-ai')
      : $('//*[@resource-id="tab-ai"]')
    const exists = await sel.isExisting()
    if (!exists) return false
    return sel.isDisplayed()
  } catch {
    return false
  }
}

async function tabCount(): Promise<number> {
  const tabIDs = ['tab-doctors', 'tab-appointments', 'tab-ai']
  let count = 0
  for (const id of tabIDs) {
    try {
      const sel = process.env.PLATFORM === 'ios' ? $(`~${id}`) : $(`//*[@resource-id="${id}"]`)
      if (await sel.isExisting() && await sel.isDisplayed()) count++
    } catch { /* tab not present */ }
  }
  return count
}

Then('the AI Check tab visibility matches the feature flag state', async function () {
  const tabVisible = await isAiTabVisible()
  if (flagStateFromApi !== tabVisible) {
    throw new Error(
      `Feature flag mismatch: /health reports recommendationEnabled=${flagStateFromApi} ` +
      `but tab-ai is ${tabVisible ? 'visible' : 'hidden'}. ` +
      `A broken flag means users in the wrong experiment group see the wrong UI — A/B metrics will be invalid.`,
    )
  }
})

Then('the AI Check tab is visible in the tab bar', async function () {
  const visible = await isAiTabVisible()
  expect(visible).toBe(true)
})

Then('the AI Check tab is not visible in the tab bar', async function () {
  const visible = await isAiTabVisible()
  expect(visible).toBe(false)
})

Then('only two tabs are shown — Doctors and My Visits', async function () {
  const count = await tabCount()
  expect(count).toBe(2)
})

When('I open the AI Check tab', async function () {
  const sel = process.env.PLATFORM === 'ios' ? $('~tab-ai') : $('//*[@resource-id="tab-ai"]')
  await sel.waitForDisplayed({ timeout: 5000 })
  await sel.click()
  await symptomCheckerPage.waitForScreen()
})

When('I submit the symptoms {string}', async function (symptoms: string) {
  await symptomCheckerPage.submitSymptoms(symptoms)
})

Then('I see AI results or a graceful degradation message', async function () {
  await symptomCheckerPage.waitForResultOrError()
  const hasResult = await symptomCheckerPage.isResultVisible()
  const hasError = await symptomCheckerPage.isErrorVisible()
  if (!hasResult && !hasError) {
    throw new Error('Neither symptom-result nor symptom-error appeared — symptom checker shows no response')
  }
  if (hasError) {
    const msg = await symptomCheckerPage.getErrorText()
    if (msg.toLowerCase().includes('crash') || msg.trim() === '') {
      throw new Error(`Symptom checker error is empty or looks like a crash: "${msg}"`)
    }
  }
})
