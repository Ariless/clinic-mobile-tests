import { Given, When, Then, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'
import { LoginPage } from '../pages/factory'

// TalkBack is enabled AFTER navigating to the target screen (in the When step)
// so that normal Appium interactions (tap, typeText) work during Given setup.
// The After hook always disables TalkBack, even on test failure.

After({ tags: '@a11y' }, async function () {
  ADB.disableTalkBack()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the app is at the login screen', async function () {
  const loginPage = new LoginPage()
  await loginPage.waitForVisible()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('TalkBack is enabled on the device', async function () {
  ADB.enableTalkBack()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the login email field has an accessible label', async function () {
  const el = $('//*[@resource-id="login-email-input"]')
  await el.waitForDisplayed({ timeout: 8000 })
  const label = await el.getAttribute('content-desc')
  expect(label).toBeTruthy()
})

Then('the login password field has an accessible label', async function () {
  const el = $('//*[@resource-id="login-password-input"]')
  await el.waitForDisplayed({ timeout: 8000 })
  const label = await el.getAttribute('content-desc')
  expect(label).toBeTruthy()
})

Then('the login submit button has accessible text', async function () {
  const el = $('//*[@resource-id="login-submit-button"]')
  await el.waitForDisplayed({ timeout: 8000 })
  // Buttons may expose their label via content-desc or via visible text — either satisfies TalkBack
  const desc = await el.getAttribute('content-desc')
  const text = await el.getText()
  expect(desc || text).toBeTruthy()
})

Then('each visible doctor card is accessible with a name', async function () {
  const items = $$('android=new UiSelector().resourceIdMatches("doctor-item-.*")')
  const count = await items.length
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const resourceId = await items[i].getAttribute('resource-id')
    const id = resourceId?.replace('doctor-item-', '') ?? ''
    const nameEl = $(`//*[@resource-id="doctor-name-${id}"]`)
    const name = await nameEl.getText()
    expect(name).toBeTruthy()
  }
})

Then('each available booking slot has an accessible label', async function () {
  await $('//*[@resource-id="slots-list"]').waitForDisplayed({ timeout: 15000 })
  const slots = $$('android=new UiSelector().resourceIdMatches("slot-item-.*")')
  const count = await slots.length
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    // Slots expose time information via content-desc (accessibilityLabel) or visible text
    const desc = await slots[i].getAttribute('content-desc')
    const text = await slots[i].getText()
    expect(desc || text).toBeTruthy()
  }
})
