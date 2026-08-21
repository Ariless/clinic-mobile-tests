import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { LoginPage, DoctorsPage, SymptomCheckerPage } from '../pages/factory'

// Voice tests require the app built with EXPO_PUBLIC_TEST_VOICE_TEXT set.
// In that mode, tapping the mic button injects the env value as voice input
// without activating the microphone. For real-device mic tests, remove the env var.

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let symptomPage: SymptomCheckerPage
let recordedSpecialty = ''

Before({ tags: '@voice-ai' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  symptomPage = new SymptomCheckerPage()
})

After({ tags: '@voice-ai' }, async function () {
  recordedSpecialty = ''
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('I am logged in as a patient and on the AI Check screen', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await doctorsPage.waitForDoctorList()
  await symptomPage.navigateTo()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I submit symptoms {string} via text', async function (symptoms: string) {
  await symptomPage.enterSymptoms(symptoms)
  await symptomPage.submit()
  await symptomPage.waitForResult()
})

When('I clear the symptom input', async function () {
  await symptomPage.clearSymptomInput()
})

When('I submit symptoms {string} via voice', async function (symptoms: string) {
  // Requires app built with EXPO_PUBLIC_TEST_VOICE_TEXT matching `symptoms`.
  // The mic button injects the env value instead of activating the microphone.
  await symptomPage.tapVoiceButton()
  await symptomPage.submit()
  await symptomPage.waitForResult()
})

When('I tap the voice input button without granting mic permission', async function () {
  // This step relies on the OS denying the permission dialog automatically.
  // On emulators: revoke RECORD_AUDIO before running — adb shell pm revoke com.anonymous.clinicmobile android.permission.RECORD_AUDIO
  await symptomPage.tapVoiceButton()
  await browser.pause(2000)
})

When('I submit voice input with background noise text {string}', async function (noiseText: string) {
  await symptomPage.clearSymptomInput()
  await symptomPage.enterSymptoms(noiseText)
  await symptomPage.submit()
  await browser.pause(5000)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('I record the recommended specialty', async function () {
  const raw = await symptomPage.getRecommendedSpecialty()
  recordedSpecialty = raw.replace(/^Recommended:\s*/i, '').trim()
  expect(recordedSpecialty.length).toBeGreaterThan(0)
})

Then('the recommended specialty matches the previously recorded one', async function () {
  await symptomPage.waitForResult()
  const raw = await symptomPage.getRecommendedSpecialty()
  const current = raw.replace(/^Recommended:\s*/i, '').trim()
  expect(current).toBe(recordedSpecialty)
})

Then('I see the voice permission error message', async function () {
  const visible = await symptomPage.isVoicePermissionErrorVisible()
  expect(visible).toBe(true)
  const text = await symptomPage.getVoicePermissionError()
  expect(text.toLowerCase()).toContain('microphone')
})

Then('the symptom input remains empty', async function () {
  const value = await symptomPage.getSymptomInputValue()
  expect(value.trim()).toBe('')
})

Then('the app does not crash', async function () {
  const visible = await symptomPage.isInputVisible()
  expect(visible).toBe(true)
})

Then('either a specialty is shown or a descriptive error is shown', async function () {
  const hasResult = await symptomPage.isResultVisible()
  const hasError = await symptomPage.isErrorVisible()
  expect(hasResult || hasError).toBe(true)
})
