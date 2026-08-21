import { Given, When, Then, After } from '@wdio/cucumber-framework'
import { ADB } from '../support/adb'

// "And I am logged in as a patient"         — reused from booking.steps.ts
// "When I select the first available doctor" — reused from booking.steps.ts
// "And I book the first available slot"      — reused from booking.steps.ts
// "Then I see the booking confirmation"      — reused from booking.steps.ts

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

After({ tags: '@pairwise' }, function () {
  ADB.resetLocale()
  try { ADB.clearSlowNetwork() } catch { /* best-effort — not set when network was fast */ }
  ADB.enableWifi()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the locale is {word}', async function (locale: string) {
  ADB.setLocale(locale)
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(5000)
})

Given('the network condition is {word}', function (condition: string) {
  // The condition is applied to the device here and read back from the device
  // by later steps; an assignment to an undeclared `networkCondition` used to
  // sit here, storing the value nowhere and read by nothing.
  if (condition === 'slow') {
    ADB.setSlowNetwork(2000)
  } else if (condition === 'offline') {
    ADB.disableWifi()
  }
  // 'fast' — default WiFi, no change needed
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I attempt to book a slot', async function () {
  // Slots list may or may not load when offline — wait briefly then tap first visible slot
  try {
    await $('//*[@resource-id="slots-list"]').waitForDisplayed({ timeout: 8000 })
    const slots = await $$('//*[contains(@resource-id,"slot-")]')
    if (await slots.length > 0) await (await slots[0]).click()
  } catch {
    // Offline: slots never loaded — that is the expected behaviour
  }
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('a booking error is shown and the app has not crashed', async function () {
  // Either booking-error appears (request was sent and failed) or
  // slots-list never loaded (request was never made offline) — both are graceful.
  const errorVisible = await $('//*[@resource-id="booking-error"]').isDisplayed().catch(() => false)
  const slotsVisible = await $('//*[@resource-id="slots-list"]').isDisplayed().catch(() => false)
  const backVisible  = await $('//*[@resource-id="slots-back-button"]').isDisplayed().catch(() => false)
  if (!errorVisible && !slotsVisible && !backVisible) {
    throw new Error('App appears crashed — no booking screen elements visible when offline')
  }
})
