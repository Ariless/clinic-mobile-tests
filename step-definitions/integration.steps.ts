import { Given, Then, Before, After } from '@wdio/cucumber-framework'
import { Proxy, StubRule } from '../support/proxy'
import { LoginPage } from '../pages/factory'

let loginPage: InstanceType<typeof LoginPage>
const pendingStubs: StubRule[] = []

Before({ tags: '@integration' }, function () {
  loginPage = new LoginPage()
  pendingStubs.length = 0
  Proxy.stop()
})

After({ tags: '@integration' }, function () {
  Proxy.stop()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('"{string}" is stubbed to return {int}', function (endpoint: string, status: number) {
  const spaceIdx = endpoint.indexOf(' ')
  const method = endpoint.slice(0, spaceIdx)
  const path = endpoint.slice(spaceIdx + 1)
  pendingStubs.push({ method, path, status, body: { message: `Stubbed ${status}` } })
})

Given('the network proxy with stubs is capturing outgoing traffic', async function () {
  Proxy.start([...pendingStubs])
  pendingStubs.length = 0
  await $('//*[@resource-id="login-title"]').waitForDisplayed({ timeout: 30000 })
  Proxy.setEmulatorProxy()
})

// Login without waiting for the doctors list — used when GET /doctors is stubbed
// and the screen will show an error instead of a list.
Given('I log in as a patient through the UI', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
  )
  await $('//*[@resource-id="login-title"]').waitForExist({ timeout: 10000, reverse: true })
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the doctors screen shows an error', async function () {
  await $('//*[@resource-id="doctors-error"]').waitForDisplayed({ timeout: 15000 })
})

Then('the appointments screen shows an error', async function () {
  await $('//*[@resource-id="appointments-error"]').waitForDisplayed({ timeout: 15000 })
})
