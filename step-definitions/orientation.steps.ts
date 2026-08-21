import { When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'

// Ensure portrait mode before and after each scenario regardless of previous test state.
Before({ tags: '@orientation' }, async function () {
  await driver.setOrientation('PORTRAIT')
})

After({ tags: '@orientation' }, async function () {
  await driver.setOrientation('PORTRAIT')
})

When('the device is rotated to landscape', async function () {
  await driver.setOrientation('LANDSCAPE')
  await driver.pause(1000)
})

When('the device is rotated back to portrait', async function () {
  await driver.setOrientation('PORTRAIT')
  await driver.pause(1000)
})

Then('no booking error is shown', async function () {
  const platform = process.env.PLATFORM ?? 'android'
  const el = $(platform === 'ios' ? '~booking-error' : '//*[@resource-id="booking-error"]')
  const exists = await el.isExisting()
  expect(exists).toBe(false)
})
